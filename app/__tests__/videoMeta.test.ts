import { describeVideo, fileName, formatDuration, formatSize } from '../src/forms/videoMeta';

describe('videoMeta', () => {
  it('formats the length as m:ss, rounded to the second', () => {
    expect(formatDuration(3000)).toBe('0:03');
    expect(formatDuration(2400)).toBe('0:02');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(-5)).toBe('0:00');
  });

  it('formats the size with a decimal comma', () => {
    expect(formatSize(2.1 * 1024 * 1024)).toBe('2,1 MB');
    expect(formatSize(1000)).toBe('< 0,1 MB');
  });

  it('takes the name from the end of a path or URI', () => {
    expect(fileName('file:///cache/mama.mp4')).toBe('mama.mp4');
    expect(fileName('a.mp4')).toBe('a.mp4');
  });

  it('describes a new file with its facts and a stored one by name only', () => {
    const file = { uri: 'file:///cache/mama.mp4', mimeType: 'video/mp4', fileSize: 2.1 * 1024 * 1024, durationMs: 3000 };
    expect(describeVideo({ kind: 'new', file })).toEqual({ name: 'mama.mp4', length: '0:03', size: '2,1 MB' });
    expect(describeVideo({ kind: 'kept', path: 'user/word/ma.mp4' })).toEqual({ name: 'ma.mp4', length: null, size: null });
  });
});
