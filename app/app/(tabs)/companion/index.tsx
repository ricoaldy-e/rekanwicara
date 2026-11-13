import { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigButton, Body, Card, CheckRow, InfoNote, Screen, StageBadge, Title } from '../../../src/components';
import { OptionGroup } from '../../../src/components/OptionGroup';
import { useContent } from '../../../src/state/content';
import { useUser } from '../../../src/state/user';
import { colors, fontSize, radius, spacing, touchTarget } from '../../../src/theme';
import { SESSION_MINUTES, isValidPin, type SessionMinutes } from '../../../src/user/pure';
import { CONSULT_ADVICE, reportText, weeklySummary } from '../../../src/user/report';
import { verifyPin } from '../../../src/user/storage';

type Stage = 'pin' | 'home' | 'pick' | 'listen';

const MINUTE_OPTIONS = SESSION_MINUTES.map((m) => ({ value: String(m), label: `${m} menit` }));

/** Mode Pendamping (SPEC §8.1): PIN, weekly summary, Uji Dengar, session length, text report. */
export default function Companion() {
  const { items } = useContent();
  const { profile, progress, sync, demo, addListenCheck, updateSettings, syncNow } = useUser();
  const [stage, setStage] = useState<Stage>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [shareError, setShareError] = useState(false);

  const nameOf = (id: string) => items?.find((it) => it.item_id === id)?.text ?? id;
  const summary = weeklySummary(progress, profile.attempts, new Date());

  const unlock = async () => {
    if (!isValidPin(pin)) return setPinError('PIN harus 4 angka.');
    let ok = false;
    try {
      ok = await verifyPin(pin);
    } catch {
      return setPinError('PIN belum bisa dibaca dari HP ini. Coba lagi.');
    }
    if (!ok) return setPinError('PIN salah.');
    setPin('');
    setPinError(null);
    setStage('home');
  };

  const share = async () => {
    setShareError(false);
    try {
      await Share.share({ message: `${demo ? 'MODE DEMO — data contoh\n\n' : ''}${reportText(summary, nameOf)}` });
    } catch {
      setShareError(true); // the share sheet could not open; nothing is lost
    }
  };

  const lock = () => {
    setSaved(null);
    setStage('pin');
  };

  if (stage === 'pin') {
    return (
      <Screen>
        <Title>Mode Pendamping</Title>
        <Body>Bagian ini untuk orang tua, keluarga, atau guru. Masukkan PIN 4 angka.</Body>
        <TextInput
          value={pin}
          onChangeText={(t) => {
            setPin(t.replace(/\D/g, '').slice(0, 4));
            setPinError(null);
          }}
          style={styles.input}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="PIN"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="PIN pendamping"
          testID="companion-pin"
        />
        {pinError ? <InfoNote tone="warning" text={pinError} testID="companion-pin-error" /> : null}
        <BigButton label="Buka" icon="lock-open" disabled={pin.length !== 4} onPress={unlock} testID="companion-unlock" />
      </Screen>
    );
  }

  if (stage === 'pick') {
    const practised = (items ?? []).filter((it) => (progress.get(it.item_id)?.attempts ?? 0) > 0).sort((a, b) => b.level - a.level);
    return (
      <Screen>
        <Title>Uji Dengar</Title>
        <Body>Pilih kata yang akan diucapkan. Pendamping mendengarkan tanpa melihat layar hasil latihan.</Body>
        {practised.length === 0 ? <InfoNote text="Belum ada materi yang dilatih." /> : null}
        {practised.map((it) => (
          <Card
            key={it.item_id}
            onPress={() => {
              setCheckId(it.item_id);
              setSaved(null);
              setStage('listen');
            }}
            accessibilityLabel={`Uji Dengar ${it.text}`}
            testID={`listen-pick-${it.item_id}`}
          >
            <Text style={styles.pickText}>
              {it.emoji ? `${it.emoji} ` : ''}
              {it.text}
            </Text>
          </Card>
        ))}
        <BigButton label="Kembali" variant="secondary" onPress={() => setStage('home')} />
      </Screen>
    );
  }

  if (stage === 'listen' && checkId) {
    const item = items?.find((it) => it.item_id === checkId);
    const record = (result: 'jelas' | 'belum_jelas') => {
      addListenCheck(checkId, result);
      setSaved(result === 'jelas' ? 'Tercatat: jelas.' : 'Tercatat: belum jelas.');
    };
    return (
      <Screen>
        <Title>Uji Dengar</Title>
        <Card>
          <View style={styles.center}>
            <Text style={styles.big}>
              {item?.emoji ? `${item.emoji} ` : ''}
              {item?.text ?? checkId}
            </Text>
          </View>
        </Card>
        <Body>Minta pengguna mengucapkan kata ini dengan suara. Dengarkan, lalu pilih penilaianmu.</Body>
        {saved ? (
          <>
            <InfoNote text={saved} testID="listen-saved" />
            <BigButton label="Uji kata lain" icon="list" onPress={() => setStage('pick')} />
            <BigButton label="Selesai" variant="secondary" onPress={() => setStage('home')} />
          </>
        ) : (
          <>
            <BigButton label="Jelas" icon="checkmark-circle" onPress={() => record('jelas')} testID="listen-clear" />
            <BigButton label="Belum jelas" icon="close-circle" variant="secondary" onPress={() => record('belum_jelas')} testID="listen-unclear" />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Mode Pendamping</Title>

      <Card testID="weekly-summary">
        <Text style={styles.heading}>Ringkasan 7 hari terakhir</Text>
        <Body>Sesi latihan: {summary.sessions}</Body>
        <Body>
          Percobaan: {summary.attempts}
          {summary.attempts > 0 ? `, ${summary.green} sesuai` : ''}
        </Body>
        <Body>Materi lulus: {summary.passed.length > 0 ? summary.passed.map(nameOf).join(', ') : '-'}</Body>
        <Body>Perlu diulas: {summary.reviews.length > 0 ? summary.reviews.map(nameOf).join(', ') : '-'}</Body>
        <Body>Macet: {summary.stuck.length > 0 ? summary.stuck.map(nameOf).join(', ') : '-'}</Body>
      </Card>

      {summary.stuck.length > 0 ? (
        <InfoNote
          tone="warning"
          testID="consult-advice"
          text={`${summary.stuck.map(nameOf).join(', ')}: ${CONSULT_ADVICE}`}
        />
      ) : null}

      <Card>
        <Text style={styles.heading}>Tahap tiap materi</Text>
        {(items ?? []).map((it) => {
          const p = progress.get(it.item_id);
          return p && p.attempts > 0 ? (
            <View key={it.item_id} style={styles.stageRow}>
              <Text style={styles.stageName}>{it.text}</Text>
              <StageBadge stage={p.stage} />
            </View>
          ) : null;
        })}
        {!(items ?? []).some((it) => (progress.get(it.item_id)?.attempts ?? 0) > 0) ? <Body muted>Belum ada latihan.</Body> : null}
      </Card>

      <BigButton label="Uji Dengar" icon="ear" onPress={() => setStage('pick')} testID="open-listen" />
      <BigButton label="Bagikan laporan teks" icon="share-social" variant="secondary" onPress={share} testID="share-report" />
      {shareError ? <InfoNote tone="warning" text="Laporan belum bisa dibagikan. Coba lagi." /> : null}

      <Text style={styles.heading}>Pengaturan</Text>
      <OptionGroup
        label="Lama sesi latihan"
        options={MINUTE_OPTIONS}
        value={String(profile.settings.sessionMinutes)}
        onChange={(v) => updateSettings({ sessionMinutes: Number(v) as SessionMinutes })}
        testID="session-minutes"
      />
      <CheckRow
        checked={profile.settings.listenCheckRequired}
        onToggle={() => updateSettings({ listenCheckRequired: !profile.settings.listenCheckRequired })}
        text="Level 3 baru lulus setelah satu Uji Dengar yang jelas"
        testID="setting-listen"
      />
      <CheckRow
        checked={profile.settings.unlockAll}
        onToggle={() => updateSettings({ unlockAll: !profile.settings.unlockAll })}
        text="Buka semua materi"
        testID="setting-unlock"
      />

      <Text style={styles.heading}>Penyimpanan online</Text>
      {demo ? (
        <InfoNote text="Mode demo: hasil hanya ada selama sesi ini dan tidak dikirim ke penyimpanan online." testID="sync-demo" />
      ) : !sync.configured ? (
        <InfoNote text="Penyimpanan online belum disambungkan. Hasil latihan tersimpan di HP ini." testID="sync-off" />
      ) : (
        <>
          <View testID="sync-status" accessibilityLiveRegion="polite">
            <Body>{sync.running ? 'Sedang menyinkronkan catatan…' : sync.pending > 0 ? `${sync.pending} catatan menunggu dikirim.` : profile.attempts.length + profile.listenChecks.length > 0 ? 'Semua catatan sudah tersimpan online.' : 'Belum ada catatan untuk dikirim.'}</Body>
            {sync.lastSyncedAt ? <Body muted>Terakhir disinkronkan: {new Date(sync.lastSyncedAt).toLocaleString('id-ID')}</Body> : null}
          </View>
          {sync.lastError ? <InfoNote tone="warning" text={`Belum terkirim: ${sync.lastError}`} testID="sync-error" /> : null}
          <BigButton label={sync.running ? 'Menyinkronkan…' : 'Sinkronkan sekarang'} icon="cloud-upload" variant="secondary" disabled={sync.running} onPress={syncNow} />
        </>
      )}

      <BigButton label="Kunci kembali" icon="lock-closed" variant="secondary" onPress={lock} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: touchTarget,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.large,
    color: colors.text,
    letterSpacing: 6,
  },
  heading: { fontSize: fontSize.large, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  center: { alignItems: 'center', paddingVertical: spacing.md },
  big: { fontSize: fontSize.display, fontWeight: '700', color: colors.text },
  pickText: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs },
  stageName: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
});
