import { ApiError } from '../src/api/apiError';
import { createApiClient } from '../src/api/client';
import { uploadMultipart, type XhrLike } from '../src/api/upload';

type Behaviour =
  | { kind: 'ok'; status?: number; body: unknown; progress?: [number, number][] }
  | { kind: 'status'; status: number; body: string }
  | { kind: 'network' }
  | { kind: 'timeout' }
  | { kind: 'hang' };

/** Scripted fake XMLHttpRequest: each instance plays the next behaviour asynchronously. */
class FakeXhr implements XhrLike {
  static script: Behaviour[] = [];
  static instances: FakeXhr[] = [];

  timeout = 0;
  status = 0;
  responseText = '';
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  aborted = false;
  upload: XhrLike['upload'] = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  send(body: unknown) {
    this.body = body;
    const b = FakeXhr.script.shift() ?? { kind: 'network' };
    setTimeout(() => {
      if (this.aborted) return;
      switch (b.kind) {
        case 'ok':
          for (const [loaded, total] of b.progress ?? []) {
            this.upload.onprogress?.({ loaded, total, lengthComputable: total > 0 });
          }
          this.status = b.status ?? 200;
          this.responseText = JSON.stringify(b.body);
          this.onload?.();
          break;
        case 'status':
          this.status = b.status;
          this.responseText = b.body;
          this.onload?.();
          break;
        case 'network':
          this.onerror?.();
          break;
        case 'timeout':
          this.ontimeout?.();
          break;
        case 'hang':
          break;
      }
    }, 0);
  }
}

const factory = () => new FakeXhr();
const FILE = { uri: 'file:///cache/clip.mp4', name: 'clip.mp4', type: 'video/mp4' };
const REQ = { url: 'http://10.0.0.2:8000/v1/dataset/upload', fields: { speaker_id: 'P1', rep: 2, device: undefined }, file: FILE };
const NO_DELAY = [0, 0];

/**
 * Jest runs on Node, whose FormData would stringify React Native's `{ uri, name, type }` file part.
 * This stand-in records parts the way React Native's FormData keeps them (`_parts`).
 */
class RecordingFormData {
  _parts: [string, unknown][] = [];
  append(key: string, value: unknown) {
    this._parts.push([key, value]);
  }
}
const realFormData = global.FormData;
beforeAll(() => {
  global.FormData = RecordingFormData as unknown as typeof FormData;
});
afterAll(() => {
  global.FormData = realFormData;
});

function formParts(body: unknown): [string, unknown][] {
  return (body as { _parts?: [string, unknown][] })._parts ?? [];
}

beforeEach(() => {
  FakeXhr.script = [];
  FakeXhr.instances = [];
});

describe('uploadMultipart', () => {
  it('POSTs multipart fields + file part and resolves the JSON body', async () => {
    FakeXhr.script = [{ kind: 'ok', body: { status: 'ok', clip_id: 'P1__l1_a__r2__none__quiet' } }];
    const res = await uploadMultipart(REQ, { retryDelaysMs: NO_DELAY }, factory);

    expect(res).toEqual({ status: 'ok', clip_id: 'P1__l1_a__r2__none__quiet' });
    const xhr = FakeXhr.instances[0];
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe(REQ.url);
    expect(xhr.headers.Accept).toBe('application/json');
    const parts = formParts(xhr.body);
    expect(parts).toContainEqual(['speaker_id', 'P1']);
    expect(parts).toContainEqual(['rep', '2']); // numbers are sent as strings
    expect(parts.find(([k]) => k === 'device')).toBeUndefined(); // undefined fields are skipped
    expect(parts).toContainEqual(['file', FILE]);
  });

  it('reports progress fractions', async () => {
    FakeXhr.script = [{ kind: 'ok', body: {}, progress: [[0, 200], [100, 200], [200, 200], [50, 0]] }];
    const seen: (number | null)[] = [];
    await uploadMultipart(REQ, { onProgress: (p) => seen.push(p.fraction), retryDelaysMs: NO_DELAY }, factory);
    expect(seen).toEqual([0, 0.5, 1, null]); // unknown total -> null
  });

  it('retries network failures and timeouts, then succeeds', async () => {
    FakeXhr.script = [{ kind: 'network' }, { kind: 'timeout' }, { kind: 'ok', body: { ok: 1 } }];
    const retries: number[] = [];
    const res = await uploadMultipart(REQ, { retryDelaysMs: NO_DELAY, onRetry: (n) => retries.push(n) }, factory);
    expect(res).toEqual({ ok: 1 });
    expect(retries).toEqual([2, 3]);
    expect(FakeXhr.instances).toHaveLength(3);
  });

  it('gives up after the configured retries with the last transport error', async () => {
    FakeXhr.script = [{ kind: 'network' }, { kind: 'network' }, { kind: 'timeout' }];
    const err = await uploadMultipart(REQ, { retryDelaysMs: NO_DELAY }, factory).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe('timeout');
    expect(FakeXhr.instances).toHaveLength(3);
  });

  it('never retries an HTTP error answer and keeps the server code', async () => {
    FakeXhr.script = [
      { kind: 'status', status: 422, body: JSON.stringify({ detail: { code: 'invalid_speaker_id', message: 'x' } }) },
      { kind: 'ok', body: {} },
    ];
    const err = await uploadMultipart(REQ, { retryDelaysMs: NO_DELAY }, factory).catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'http', status: 422, code: 'invalid_speaker_id' });
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it('maps a non-JSON error page to http without code, and invalid 2xx JSON to parse', async () => {
    FakeXhr.script = [{ kind: 'status', status: 502, body: '<html>bad gateway</html>' }];
    await expect(uploadMultipart(REQ, { retryDelaysMs: [] }, factory)).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      code: null,
    });
    FakeXhr.script = [{ kind: 'status', status: 200, body: 'not json' }];
    await expect(uploadMultipart(REQ, { retryDelaysMs: [] }, factory)).rejects.toMatchObject({ kind: 'parse' });
  });

  it('cancels via AbortSignal without retrying', async () => {
    FakeXhr.script = [{ kind: 'hang' }];
    const ctrl = new AbortController();
    const p = uploadMultipart(REQ, { signal: ctrl.signal, retryDelaysMs: NO_DELAY }, factory);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ kind: 'cancelled' });
    expect(FakeXhr.instances[0].aborted).toBe(true);
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it('uses the given timeout', async () => {
    FakeXhr.script = [{ kind: 'ok', body: {} }];
    await uploadMultipart(REQ, { timeoutMs: 1234 }, factory);
    expect(FakeXhr.instances[0].timeout).toBe(1234);
  });
});

describe('client upload endpoints', () => {
  const api = createApiClient('http://10.0.0.2:8000/', { xhrFactory: factory });

  it('analyze posts to /v1/analyze with the mock query and the SPEC §5 fields', async () => {
    FakeXhr.script = [{ kind: 'ok', body: { status: 'ok' } }];
    await api.analyze({ file: FILE, user_id: 'u1', item_id: 'l3_mama', session_id: 's1' }, { mock: 'merah' });
    const xhr = FakeXhr.instances[0];
    expect(xhr.url).toBe('http://10.0.0.2:8000/v1/analyze?mock=merah');
    expect(formParts(xhr.body).map(([k]) => k).sort()).toEqual(['file', 'item_id', 'session_id', 'user_id']);
  });

  it('calibrate posts step + user_id', async () => {
    FakeXhr.script = [{ kind: 'ok', body: { status: 'ok' } }];
    await api.calibrate({ file: FILE, user_id: 'u1', step: 'vowel_a' });
    const xhr = FakeXhr.instances[0];
    expect(xhr.url).toBe('http://10.0.0.2:8000/v1/calibrate');
    expect(formParts(xhr.body)).toContainEqual(['step', 'vowel_a']);
  });

  it('datasetUpload posts every dataset field', async () => {
    FakeXhr.script = [{ kind: 'ok', body: { status: 'ok', clip_id: 'x' } }];
    await api.datasetUpload({
      file: FILE,
      purpose: 'dataset',
      speaker_id: 'P2',
      item_id: 'l1_a',
      rep: 1,
      intended_error: 'bad_noise',
      condition: 'noisy',
      session_id: 'P2_20261111_0930',
      device: 'samsung SM-A525F',
    });
    const keys = formParts(FakeXhr.instances[0].body).map(([k]) => k).sort();
    expect(keys).toEqual(
      ['condition', 'device', 'file', 'intended_error', 'item_id', 'purpose', 'rep', 'session_id', 'speaker_id'].sort(),
    );
    expect(FakeXhr.instances[0].url).toBe('http://10.0.0.2:8000/v1/dataset/upload');
  });
});

describe('hasModelVideo', () => {
  const res = (status: number, body: unknown = null) =>
    ({ ok: status < 300, status, json: async () => body }) as unknown as Response;

  it('asks for one byte and maps 206/200 to true, 404 to false', async () => {
    const fetchFn = jest.fn().mockResolvedValueOnce(res(206)).mockResolvedValueOnce(res(200)).mockResolvedValueOnce(res(404));
    const api = createApiClient('http://h:8000', { fetchFn });
    await expect(api.hasModelVideo('l1_a')).resolves.toBe(true);
    await expect(api.hasModelVideo('l1_a')).resolves.toBe(true);
    await expect(api.hasModelVideo('l1_i')).resolves.toBe(false);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://h:8000/v1/model-video/l1_a');
    expect(init.headers).toMatchObject({ Range: 'bytes=0-0' });
  });

  it('throws on other statuses', async () => {
    const fetchFn = jest.fn().mockResolvedValue(res(500, { detail: { code: 'internal_error', message: 'x' } }));
    await expect(createApiClient('http://h:8000', { fetchFn }).hasModelVideo('l1_a')).rejects.toMatchObject({
      kind: 'http',
      code: 'internal_error',
    });
  });
});
