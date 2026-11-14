/** Single mapping boundary for the existing Supabase schema. No graduation rules are inferred. */
export interface ProgressRecord {
  itemId: string;
  stage: 'terkunci' | 'berlatih' | 'lulus' | 'ulasan' | 'macet';
  passed: boolean;
}

export interface Activity {
  id: string;
  itemId: string;
  name: string;
  level: 0 | 1 | 2 | 3 | 4;
  result: 'Sesuai' | 'Mendekati' | 'Belum Sesuai';
  createdAt: string;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Format data latihan tidak valid.');
  return value as Record<string, unknown>;
}

export function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Format daftar latihan tidak valid.');
  return value.map(record);
}

export function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Data latihan belum lengkap.');
  return value;
}

function own(value: unknown, uid: string): Record<string, unknown> {
  const row = record(value);
  if (row.user_id !== uid) throw new Error('Akun data berbeda; pemuatan dibatalkan.');
  return row;
}

export function mapProgress(value: unknown, uid: string): ProgressRecord[] {
  return rows(value).map((value) => {
    const row = own(value, uid);
    const stage = row.stage;
    if (stage !== 'terkunci' && stage !== 'berlatih' && stage !== 'lulus' && stage !== 'ulasan' && stage !== 'macet') {
      throw new Error('Status progres tidak valid.');
    }
    if (row.passed_at !== null && (typeof row.passed_at !== 'string' || !Number.isFinite(Date.parse(row.passed_at)))) {
      throw new Error('Tanggal kelulusan tidak valid.');
    }
    return { itemId: text(row.item_id), stage, passed: row.passed_at !== null || stage === 'lulus' || stage === 'ulasan' };
  });
}

export function mapActivities(value: unknown, uid: string, names: ReadonlyMap<string, string>): Activity[] {
  return rows(value).flatMap((value): Activity[] => {
    const row = own(value, uid);
    if (row.status === 'retry') return [];
    if (row.status !== 'ok') throw new Error('Status aktivitas tidak valid.');
    // Keep legacy database levels; their migration needs the missing v2.1 contract.
    const level = row.level;
    if (level !== 0 && level !== 1 && level !== 2 && level !== 3 && level !== 4) throw new Error('Level aktivitas tidak valid.');
    if (row.overall !== 'hijau' && row.overall !== 'kuning' && row.overall !== 'merah') {
      throw new Error('Hasil aktivitas tidak valid.');
    }
    const createdAt = text(row.created_at);
    if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Tanggal aktivitas tidak valid.');
    const itemId = text(row.item_id);
    return [{ id: text(row.id), itemId, name: names.get(itemId) ?? 'Materi tidak tersedia', level,
      result: row.overall === 'hijau' ? 'Sesuai' : row.overall === 'kuning' && level !== 2 && level !== 3 ? 'Mendekati' : 'Belum Sesuai',
      createdAt }];
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
}

export function completion(items: readonly { id: string }[], progress: readonly ProgressRecord[]) {
  const available = new Set(items.map((item) => item.id));
  const passed = new Set(progress.filter((item) => item.passed && available.has(item.itemId)).map((item) => item.itemId));
  return { passed: passed.size, total: available.size };
}
