import { cleanInstruction, editRows, fromAi, splitSteps } from '../src/forms/instructionSteps';

describe('editRows', () => {
  it('gives one empty row for an empty instruction and keeps empty rows while editing', () => {
    expect(editRows('')).toEqual(['']);
    expect(editRows('Tutup bibir.\n')).toEqual(['Tutup bibir.', '']);
    expect(editRows('a\r\nb')).toEqual(['a', 'b']);
  });
});

describe('cleanInstruction', () => {
  it('tidies every row, drops empty rows and joins with a line break', () => {
    expect(cleanInstruction('  Tutup   bibir.  \n\n   Buka mulut. \n')).toBe('Tutup bibir.\nBuka mulut.');
    expect(cleanInstruction('   ')).toBe('');
  });
});

describe('splitSteps', () => {
  it('splits by line and removes numbers and bullets', () => {
    expect(splitSteps('1. Tutup bibir.\n2) Buka mulut.\n- Ucapkan a.\n• Tahan.')).toEqual(['Tutup bibir.', 'Buka mulut.', 'Ucapkan a.', 'Tahan.']);
  });

  it('keeps a short single paragraph as one step (old instructions)', () => {
    expect(splitSteps('Buka mulut lebar dan ucapkan A.')).toEqual(['Buka mulut lebar dan ucapkan A.']);
    expect(splitSteps('')).toEqual([]);
  });

  it('splits a long single paragraph by sentence', () => {
    const long = `${'Tutup bibir rapat dan tahan sebentar sampai terasa rileks. '.repeat(1)}Buka mulut perlahan dan turunkan rahang sedikit demi sedikit. Ucapkan bunyi a panjang sambil melihat cermin.`;
    expect(long.length).toBeGreaterThan(120);
    expect(splitSteps(long)).toHaveLength(3);
  });

  it('keeps at most five steps: the rest joins the last one', () => {
    const lines = ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh'].join('\n');
    expect(splitSteps(lines)).toEqual(['satu', 'dua', 'tiga', 'empat', 'lima enam tujuh']);
  });
});

describe('fromAi', () => {
  it('turns an AI answer into step rows', () => {
    expect(fromAi('1. Tutup bibir.\n\n2. Buka mulut.')).toBe('Tutup bibir.\nBuka mulut.');
  });
});
