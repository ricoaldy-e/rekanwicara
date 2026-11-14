"""Execute the exact proposed migration/RPC in disposable LOCAL PostgreSQL, never Cloud."""

import json
import os
import shutil
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import pytest

UID = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "docs/supabase/custom_words_manual.proposed.sql"


def control(args: list[str], log: Path, env: dict[str, str], timeout: int):
    # Windows pg_ctl's detached child must not inherit a captured pipe.
    with log.open("w", encoding="utf-8") as output:
        result = subprocess.run(
            args,
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=subprocess.STDOUT,
            env=env,
            timeout=timeout,
        )
    assert result.returncode == 0, log.read_text(encoding="utf-8", errors="replace")


@dataclass
class LocalDatabase:
    bin_dir: Path
    port: int
    env: dict[str, str]
    default_digest: str = ""

    def run(self, sql: str, uid: str | None = UID, error: str | None = None) -> str:
        claims = json.dumps(
            {
                "sub": uid,
                "email": "fixture@example.test",
                "role": "authenticated",
                "is_anonymous": False,
            }
        )
        setup = "begin;"
        if uid:
            setup += f"set local role authenticated; set local request.jwt.claims = '{claims}';"
        command = [
            str(self.bin_dir / "psql"),
            "-XqAtw",
            "-h",
            "127.0.0.1",
            "-p",
            str(self.port),
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-v",
            "VERBOSITY=verbose",
        ]
        result = subprocess.run(
            command,
            input=setup + sql + ";commit;",
            text=True,
            capture_output=True,
            env=self.env,
            timeout=20,
        )
        if error:
            assert result.returncode != 0 and error in result.stderr, result.stderr
        else:
            assert result.returncode == 0, result.stderr
        return result.stdout.strip()

    def rpc(
        self,
        action: str,
        word_id: str,
        payload: dict | None = None,
        revision: int | None = None,
        uid: str = UID,
        error: str | None = None,
    ) -> None:
        data = json.dumps(payload or {}).replace("'", "''")
        self.run(
            f"select public.manage_custom_word('{action}','{word_id}',"
            f"{'null' if revision is None else revision},'{data}'::jsonb)",
            uid,
            error,
        )

    def objects(self, paths: list[str], size: int = 30, mime: str = "video/mp4") -> None:
        values = ",".join(
            f"('rekan-wicara-tutorials','{path}','{json.dumps({'size': size, 'mimetype': mime})}')"
            for path in paths
        )
        self.run(
            "insert into storage.objects(bucket_id,name,metadata) values "
            + values
            + " on conflict do nothing",
            uid=None,
        )


@pytest.fixture(scope="module")
def sql_database(tmp_path_factory):
    installed = shutil.which("initdb")
    directory = os.environ.get("REKAN_POSTGRES_BIN")
    bin_dir = (
        Path(directory)
        if directory
        else Path(installed).parent
        if installed
        else Path("C:/Program Files/PostgreSQL/18/bin")
    )
    extension = ".exe" if os.name == "nt" else ""
    if not (bin_dir / ("initdb" + extension)).is_file():
        pytest.skip("Local PostgreSQL binaries required; never fall back to Supabase Cloud")
    scratch = tmp_path_factory.mktemp("manual-sql-local")
    cluster = scratch / "cluster"
    env = {
        name: os.environ[name] for name in ("SystemRoot", "WINDIR", "COMSPEC") if name in os.environ
    }
    env.update(
        PATH=str(bin_dir) + os.pathsep + os.defpath,
        TEMP=str(scratch),
        TMP=str(scratch),
        PGCONNECT_TIMEOUT="5",
        LC_ALL="C",
    )
    control(
        [
            str(bin_dir / "initdb"),
            "-D",
            str(cluster),
            "-U",
            "postgres",
            "-A",
            "trust",
            "--no-locale",
            "--encoding=UTF8",
            "--no-sync",
            "--wal-segsize=1",
        ],
        log=scratch / "initdb.log",
        env=env,
        timeout=45,
    )
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    options = (
        f"-h 127.0.0.1 -p {port} -c max_connections=10 -c shared_buffers=16MB "
        "-c work_mem=1MB -c statement_timeout=10000 -c log_statement=none"
    )
    database = LocalDatabase(bin_dir, port, env)
    try:
        control(
            [
                str(bin_dir / "pg_ctl"),
                "-D",
                str(cluster),
                "-l",
                str(scratch / "postgres.log"),
                "-w",
                "-t",
                "25",
                "start",
                "-o",
                options,
            ],
            log=scratch / "start.log",
            env=env,
            timeout=35,
        )
        database.run(
            (Path(__file__).parent / "sql/manual_words_fixture.sql").read_text("utf-8"), uid=None
        )
        guides = json.loads((ROOT / "server/app/content/tutorials.json").read_text("utf-8"))
        database.objects([guide["storage_path"] for guide in guides], size=40)
        database.default_digest = database.run(
            "select md5(jsonb_agg(to_jsonb(o) order by name)::text) from storage.objects o "
            "where name like 'default/%'",
            uid=None,
        )
        # The proposal includes its own BEGIN/COMMIT; run as a standalone script.
        result = subprocess.run(
            [
                str(bin_dir / "psql"),
                "-XqAtw",
                "-h",
                "127.0.0.1",
                "-p",
                str(port),
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-f",
                str(MIGRATION),
            ],
            capture_output=True,
            text=True,
            env=env,
            timeout=30,
        )
        assert result.returncode == 0, result.stderr
        yield database
    finally:
        if (cluster / "postmaster.pid").exists():
            control(
                [
                    str(bin_dir / "pg_ctl"),
                    "-D",
                    str(cluster),
                    "-w",
                    "-t",
                    "20",
                    "stop",
                    "-m",
                    "fast",
                ],
                log=scratch / "stop.log",
                env=env,
                timeout=30,
            )


def example(uid=UID, parts=True):
    word_id = str(uuid4())
    payload = {
        "word": "KERTAS",
        "instruction": "Ucapkan KERTAS.",
        "status": "published",
        "video": True,
        "video_path": f"{uid}/words/{word_id}/word/{uuid4()}.mp4",
        "syllables": [],
    }
    if parts:
        for position, text in enumerate(("KER", "TAS"), 1):
            part_id = str(uuid4())
            payload["syllables"].append(
                {
                    "id": part_id,
                    "text": text,
                    "instruction": f"Ucapkan {text}.",
                    "position": position,
                    "video": True,
                    "video_path": f"{uid}/words/{word_id}/syllables/{part_id}/{uuid4()}.mp4",
                }
            )
    return word_id, payload


def paths(payload):
    return [payload["video_path"], *(p["video_path"] for p in payload["syllables"])]


def snapshot(db, word_id):
    return db.run(
        "select jsonb_build_object('word',"
        f"(select to_jsonb(w) from custom_words w where id='{word_id}'),"
        "'parts',(select jsonb_agg(s order by id) from custom_syllables s "
        f"where word_id='{word_id}'),"
        "'videos',(select jsonb_agg(v order by id) from custom_videos v "
        f"where word_id='{word_id}' or syllable_id in "
        f"(select id from custom_syllables where word_id='{word_id}')))"
    )


def test_rpc_create_edit_reorder_preserves_unique_positions_and_bindings(sql_database):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    db.rpc("create", word_id, payload)
    before = json.loads(snapshot(db, word_id))
    assert before["word"]["status"] == "published" and len(before["videos"]) == 3
    assert before["word"]["revision"] == 2
    timestamps = {p["id"]: p["created_at"] for p in before["parts"]}
    payload["instruction"] = "Ucapkan kata dengan pelan."
    payload["word"] = "Kertas"
    payload["syllables"][0]["position"], payload["syllables"][1]["position"] = 2, 1
    db.rpc("save", word_id, payload, revision=2)
    after = json.loads(snapshot(db, word_id))
    assert after["word"]["revision"] == 3
    assert timestamps == {p["id"]: p["created_at"] for p in after["parts"]}
    for part in payload["syllables"]:
        actual = next(v for v in after["videos"] if v["syllable_id"] == part["id"])
        assert actual["storage_path"] == part["video_path"]


@pytest.mark.parametrize(
    "failure",
    [
        "missing_video",
        "empty_instruction",
        "long_word",
        "nonletters",
        "seven_parts",
        "duplicate_position",
        "wrong_material",
        "foreign_path",
        "draft_status",
        "whitespace_instruction",
        "invalid_uuid",
        "invalid_position",
        "non_array",
        "mutable_path",
    ],
)
def test_database_validates_payload_and_rolls_back_create(sql_database, failure):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    if failure == "missing_video":
        payload["video_path"] = f"{UID}/words/{word_id}/word/{uuid4()}.mp4"
    if failure == "empty_instruction":
        payload["syllables"][0]["instruction"] = " "
    if failure == "long_word":
        payload["word"] = "A" * 31
    if failure == "nonletters":
        payload["word"] = "KER TAS1"
    if failure == "seven_parts":
        payload["syllables"] = payload["syllables"] * 3 + [payload["syllables"][0]]
    if failure == "duplicate_position":
        payload["syllables"][1]["position"] = 1
    if failure == "wrong_material":
        payload["syllables"][0]["video_path"] = payload["syllables"][1]["video_path"]
    if failure == "foreign_path":
        payload["video_path"] = payload["video_path"].replace(UID, OTHER)
    if failure == "draft_status":
        payload["status"] = "draft"
    if failure == "whitespace_instruction":
        payload["instruction"] = "\n\t"
    if failure == "invalid_uuid":
        payload["syllables"][0]["id"] = "invalid-uuid"
    if failure == "invalid_position":
        payload["syllables"][0]["position"] = "not-a-position"
    if failure == "non_array":
        payload["syllables"] = {}
    if failure == "mutable_path":
        payload["video_path"] = f"{UID}/words/{word_id}/word.mp4"
    db.rpc("create", word_id, payload, error="PT422")
    assert db.run(f"select count(*) from custom_words where id='{word_id}'") == "0"
    assert db.run(f"select count(*) from custom_syllables where word_id='{word_id}'") == "0"


def test_failed_replacement_keeps_active_metadata_and_old_video(sql_database):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    db.rpc("create", word_id, payload)
    before = snapshot(db, word_id)
    old_path = payload["video_path"]
    payload["video_path"] = f"{UID}/words/{word_id}/word/{uuid4()}.mp4"
    db.rpc("save", word_id, payload, revision=2, error="PT422")
    assert snapshot(db, word_id) == before
    assert db.run(f"select count(*) from storage.objects where name='{old_path}'", uid=None) == "1"
    db.objects([payload["video_path"]])
    db.rpc("save", word_id, payload, revision=2)
    after = json.loads(snapshot(db, word_id))
    assert after["word"]["pending_video_paths"] == [old_path]
    assert db.run(f"select count(*) from storage.objects where name='{old_path}'", uid=None) == "1"


def test_revision_conflict_rolls_back_every_metadata_table(sql_database):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    db.rpc("create", word_id, payload)
    before = snapshot(db, word_id)
    payload["word"] = "LAIN"
    db.rpc("save", word_id, payload, revision=1, error="PT409")
    assert snapshot(db, word_id) == before


def test_direct_writes_and_column_grants_cannot_bypass_publication(sql_database):
    db = sql_database
    for uid in (UID, OTHER):
        db.run("update custom_words set status='published'", uid=uid, error="42501")
        db.run("delete from custom_videos", uid=uid, error="42501")
        db.run(
            "insert into custom_words(user_id,word,instruction,status) "
            f"values('{uid}','KATA','Ucapkan KATA.','published')",
            uid=uid,
            error="42501",
        )
    assert (
        db.run("select has_any_column_privilege('authenticated','custom_words','UPDATE')", uid=None)
        == "f"
    )


def test_two_accounts_are_isolated_in_rls_and_all_rpc_branches(sql_database):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    db.rpc("create", word_id, payload)
    assert db.run(f"select count(*) from custom_words where id='{word_id}'", uid=OTHER) == "0"
    assert (
        db.run(f"select count(*) from custom_syllables where word_id='{word_id}'", uid=OTHER) == "0"
    )
    assert (
        db.run(f"select count(*) from custom_videos where storage_path like '{UID}/%'", uid=OTHER)
        == "0"
    )
    assert (
        db.run(f"select count(*) from storage.objects where name like '{UID}/%'", uid=OTHER) == "0"
    )
    assert (
        db.run(
            f"delete from storage.objects where name='{payload['video_path']}' returning name",
            uid=OTHER,
        )
        == ""
    )
    for action in ("save", "begin_delete", "finish_delete", "cleanup"):
        db.rpc(action, word_id, payload, revision=2, uid=OTHER, error="PT404")
    foreign_id, foreign_payload = example(OTHER)
    db.objects(paths(foreign_payload))
    db.rpc("create", foreign_id, foreign_payload, uid=OTHER)
    payload["syllables"][0]["id"] = foreign_payload["syllables"][0]["id"]
    db.rpc("save", word_id, payload, revision=2, error="PT404")


def test_cleanup_cannot_ack_existing_objects_and_delete_is_retryable(sql_database):
    db = sql_database
    word_id, payload = example()
    db.objects(paths(payload))
    db.rpc("create", word_id, payload)
    db.rpc("begin_delete", word_id, revision=2)
    encoded = json.dumps(paths(payload)).replace("'", "''")
    db.run(
        f"select manage_custom_word('cleanup','{word_id}',"
        f"p_cleaned:=array(select jsonb_array_elements_text('{encoded}'::jsonb)))",
        error="PT409",
    )
    db.rpc("finish_delete", word_id, error="PT409")
    db.run(
        f"delete from storage.objects where name in "
        f"(select jsonb_array_elements_text('{encoded}'::jsonb))",
        uid=UID,
    )
    db.run(
        f"select manage_custom_word('cleanup','{word_id}',"
        f"p_cleaned:=array(select jsonb_array_elements_text('{encoded}'::jsonb)))"
    )
    db.rpc("finish_delete", word_id)
    assert db.run(f"select count(*) from custom_words where id='{word_id}'") == "0"
    assert db.run(f"select count(*) from custom_syllables where word_id='{word_id}'") == "0"


def test_legacy_rows_and_default_video_survive_migration(sql_database):
    db = sql_database
    assert (
        db.run("select status from custom_words where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc'")
        == "draft"
    )
    assert (
        db.run("select count(*) from storage.objects where name like 'default/%'", uid=None) == "24"
    )
    assert (
        db.run(
            "select md5(jsonb_agg(to_jsonb(o) order by name)::text) from storage.objects o "
            "where name like 'default/%'",
            uid=None,
        )
        == db.default_digest
    )
    assert (
        db.run("select status from custom_words where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'")
        == "published"
    )
    assert (
        db.run("select status from custom_words where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'")
        == "draft"
    )
    assert (
        db.run(
            "select metadata->>'size' from storage.objects where name='default/words/tolong.mp4'",
            uid=None,
        )
        == "40"
    )


def test_null_cleanup_and_fake_rpc_marker_do_not_bypass_checks(sql_database):
    db = sql_database
    word_id, body = example(parts=False)
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    db.rpc("begin_delete", word_id, revision=2)
    before = snapshot(db, word_id)
    db.run(
        f"select manage_custom_word('cleanup','{word_id}',p_cleaned:=array[null]::text[])",
        error="PT409",
    )
    assert snapshot(db, word_id) == before
    db.run(
        "set local rekan_wicara.rpc = 'true'; update custom_words set status='published'",
        error="42501",
    )
    db.run(
        f"set local role anon; select manage_custom_word('finish_delete','{word_id}')",
        error="42501",
    )


def test_failure_after_child_deletion_restores_the_entire_tree(sql_database):
    db = sql_database
    word_id, body = example()
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    before = snapshot(db, word_id)
    db.run(
        "create function public.fixture_insert_failure() returns trigger language plpgsql as $$ "
        "begin raise check_violation using message='fixture-write-failure'; end $$; "
        "create trigger fixture_failure before insert on custom_videos "
        "for each row execute function public.fixture_insert_failure()",
        uid=None,
    )
    try:
        db.rpc("save", word_id, body, revision=2, error="23514")
        assert snapshot(db, word_id) == before
    finally:
        db.run(
            "drop trigger fixture_failure on custom_videos; "
            "drop function public.fixture_insert_failure()",
            uid=None,
        )


def test_concurrent_saves_have_one_winner_and_one_revision_conflict(sql_database):
    db = sql_database
    word_id, body = example(parts=False)
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    proposals = []
    for instruction in ("Ucapkan perlahan.", "Ucapkan sekali."):
        candidate = body | {
            "instruction": instruction,
            "video_path": f"{UID}/words/{word_id}/word/{uuid4()}.mp4",
        }
        db.objects(paths(candidate))
        proposals.append(candidate)

    def attempt(candidate):
        try:
            db.rpc("save", word_id, candidate, revision=2)
            return "saved"
        except AssertionError as error:
            assert "PT409" in str(error)
            return "conflict"

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(attempt, proposals)) == ["conflict", "saved"]
    actual = json.loads(snapshot(db, word_id))
    assert actual["word"]["revision"] == 3
    winner = next(p for p in proposals if p["instruction"] == actual["word"]["instruction"])
    assert actual["videos"][0]["storage_path"] == winner["video_path"]


def test_remove_syllable_queues_only_its_exact_video(sql_database):
    db = sql_database
    word_id, body = example()
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    removed = body["syllables"].pop()
    db.rpc("save", word_id, body, revision=2)
    actual = json.loads(snapshot(db, word_id))
    assert len(actual["parts"]) == 1 and len(actual["videos"]) == 2
    assert actual["word"]["pending_video_paths"] == [removed["video_path"]]
    assert (
        db.run(
            f"select count(*) from storage.objects where name='{removed['video_path']}'", uid=None
        )
        == "1"
    )


@pytest.mark.parametrize("size,mime", [(0, "video/mp4"), (30, "image/jpeg")])
def test_empty_or_nonvideo_object_cannot_publish(sql_database, size, mime):
    db = sql_database
    word_id, body = example(parts=False)
    db.objects(paths(body), size=size, mime=mime)
    db.rpc("create", word_id, body, error="PT422")
    assert db.run(f"select count(*) from custom_words where id='{word_id}'") == "0"


def test_maximum_word_and_six_syllables_are_valid_in_database(sql_database):
    db = sql_database
    word_id, body = example(parts=False)
    body["word"] = "A" * 30
    for position in range(1, 7):
        part_id = str(uuid4())
        body["syllables"].append(
            {
                "id": part_id,
                "text": "A",
                "instruction": "Ucapkan A.",
                "position": position,
                "video": True,
                "video_path": f"{UID}/words/{word_id}/syllables/{part_id}/{uuid4()}.mp4",
            }
        )
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    actual = json.loads(snapshot(db, word_id))
    assert len(actual["parts"]) == 6 and len(actual["videos"]) == 7


def test_retains_existing_legacy_binding_without_migrating_the_file(sql_database):
    db = sql_database
    word_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    body = {
        "word": "LAMA",
        "instruction": "Ucapkan LAMA perlahan.",
        "video": True,
        "status": "published",
        "syllables": [],
    }
    db.rpc("save", word_id, body, revision=1)
    actual = json.loads(snapshot(db, word_id))
    assert actual["videos"][0]["storage_path"] == f"{UID}/words/{word_id}/word.mp4"
    assert actual["word"]["pending_video_paths"] == []


def test_rerunning_proposal_keeps_committed_metadata_and_existing_indexes(sql_database):
    db = sql_database
    word_id, body = example()
    db.objects(paths(body))
    db.rpc("create", word_id, body)
    before = snapshot(db, word_id)
    indexes = db.run(
        "select string_agg(indexdef,';' order by indexname) from pg_indexes "
        "where schemaname='public' and tablename in "
        "('custom_words','custom_syllables','custom_videos')",
        uid=None,
    )
    result = subprocess.run(
        [
            str(db.bin_dir / "psql"),
            "-XqAtw",
            "-h",
            "127.0.0.1",
            "-p",
            str(db.port),
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            str(MIGRATION),
        ],
        text=True,
        capture_output=True,
        env=db.env,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert snapshot(db, word_id) == before
    assert (
        db.run(
            "select string_agg(indexdef,';' order by indexname) from pg_indexes "
            "where schemaname='public' and tablename in "
            "('custom_words','custom_syllables','custom_videos')",
            uid=None,
        )
        == indexes
    )


@pytest.mark.parametrize(
    "claims",
    [
        {"role": "authenticated", "is_anonymous": True, "email": "fixture@example.test"},
        {"role": "authenticated", "is_anonymous": False, "email": ""},
        {"role": "anon", "is_anonymous": False, "email": "fixture@example.test"},
    ],
)
def test_rpc_rejects_non_companion_claims_even_with_execute_permission(sql_database, claims):
    claims["sub"] = UID
    encoded = json.dumps(claims)
    sql_database.run(
        f"set local request.jwt.claims = '{encoded}'; "
        f"select manage_custom_word('create','{uuid4()}')",
        error="PT403",
    )


@pytest.mark.parametrize("action", ["save", "begin_delete"])
def test_legacy_shared_file_is_not_queued_while_another_owned_word_uses_it(sql_database, action):
    db = sql_database
    word_id = str(uuid4())
    shared = f"{UID}/words/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/word.mp4"
    db.run(
        "insert into custom_words(id,user_id,word,instruction) "
        f"values('{word_id}','{UID}','SALIN','Ucapkan SALIN.'); "
        f"insert into custom_videos(word_id,storage_path) values('{word_id}','{shared}')",
        uid=None,
    )
    if action == "save":
        body = {
            "word": "SALIN",
            "instruction": "Ucapkan SALIN.",
            "syllables": [],
            "video_path": f"{UID}/words/{word_id}/word/{uuid4()}.mp4",
        }
        db.objects([body["video_path"]])
        db.rpc("save", word_id, body, revision=1)
    else:
        db.rpc("begin_delete", word_id, revision=1)
    actual = json.loads(snapshot(db, word_id))
    assert actual["word"]["pending_video_paths"] == []
    if action == "begin_delete":
        db.rpc("finish_delete", word_id)
    assert db.run(f"select count(*) from storage.objects where name='{shared}'", uid=None) == "1"
