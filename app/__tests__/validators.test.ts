import { MAX_SYLLABLES, VIDEO_LIMITS } from '../src/forms/limits';
import { fill, messageOf, MESSAGES } from '../src/forms/messages';
import * as auth from '../src/forms/validators/auth';
import { isFourDigits, isWeakPin, sameAsOld } from '../src/forms/validators/pin';
import { videoFile } from '../src/forms/validators/video';
import * as word from '../src/forms/validators/word';

describe('nickname', () => {
  it.each([
    ['', 'nicknameEmpty'],
    ['   ', 'nicknameEmpty'],
    ['a', 'nicknameShort'],
    ['ab', null],
    ['a'.repeat(20), null],
    ['a'.repeat(21), 'nicknameLong'],
    ['Dina Putri', null],
    ["Nur'aini", null],
    ['Budi-Santoso', null],
    ['1abc', null],
    ['_abc', 'nicknameChars'],
    [' .abc', 'nicknameChars'],
    ['abç', null],
    ['abc😀', 'nicknameChars'],
    ['  rico  ', null], // trimmed
  ])('%j → %s', (value, expected) => expect(auth.nickname(value)).toBe(expected));

  it('collapses runs of spaces', () => expect(auth.normalizeNickname('  Dina   Putri ')).toBe('Dina Putri'));

  it('counts an emoji as one character', () => {
    expect(auth.nickname('a😀')).toBe('nicknameChars');
    expect(auth.nickname('😀'.repeat(21))).toBe('nicknameLong');
  });

  it('survives a very long paste', () => expect(auth.nickname('x'.repeat(100_000))).toBe('nicknameLong'));
});

describe('email', () => {
  it.each([
    ['', 'emailEmpty'],
    ['  ', 'emailEmpty'],
    ['a@b.co', null],
    ['  Nama@Email.COM  ', null],
    ['a@b', 'emailInvalid'],
    ['a@b.c', 'emailInvalid'],
    ['a b@c.com', 'emailInvalid'],
    ['@c.com', 'emailInvalid'],
    ['a@@c.com', 'emailInvalid'],
  ])('%j → %s', (value, expected) => expect(auth.email(value)).toBe(expected));

  it('allows 254 characters and no more', () => {
    const at = (n: number) => `${'a'.repeat(n - '@b.com'.length)}@b.com`;
    expect(auth.email(at(254))).toBeNull();
    expect(auth.email(at(255))).toBe('emailInvalid');
  });

  it('lowercases and trims', () => expect(auth.normalizeEmail('  A@B.Com ')).toBe('a@b.com'));
});

describe('newPassword', () => {
  const who = { nickname: 'Rico', email: 'rico@email.com' };
  it.each([
    ['', 'passwordEmpty'],
    ['abc123', 'passwordShort'],
    ['abcdefg1', null], // exactly 8
    ['abcdefg', 'passwordShort'],
    ['a1'.repeat(32), null], // exactly 64
    ['a1'.repeat(32) + 'a', 'passwordLong'],
    ['abcdefgh', 'passwordComposition'],
    ['12345678', 'passwordComposition'],
    [' abcdefg1', 'passwordEdgeSpace'],
    ['abcdefg1 ', 'passwordEdgeSpace'],
    ['abcd efg1', null], // a space inside is allowed
    ['abcd  efg1', null], // double space inside is kept as typed
    ['ÄÖÜabcd1', null],
    ['pass😀word1', null],
  ])('%j → %s', (value, expected) => expect(auth.newPassword(value, who)).toBe(expected));

  it('refuses the nickname or email, ignoring case', () => {
    expect(auth.newPassword('Rico1234', { nickname: 'rico1234' })).toBe('passwordSameAsIdentity');
    expect(auth.newPassword('rico@email.com1', { email: 'rico@email.com1' })).toBe('passwordSameAsIdentity');
    expect(auth.newPassword('Rico1234', { nickname: 'someone' })).toBeNull();
  });

  it('never changes what was typed', () => {
    const pw = '  keep me 1  ';
    auth.newPassword(pw, who);
    expect(pw).toBe('  keep me 1  ');
  });
});

describe('repeatPassword and signIn', () => {
  it('compares exactly', () => {
    expect(auth.repeatPassword('abc12345', 'abc12345')).toBeNull();
    expect(auth.repeatPassword('abc12345', 'ABC12345')).toBe('passwordMismatch');
    expect(auth.repeatPassword('abc12345', '')).toBe('passwordEmpty');
  });

  it('sign-in checks only that both are filled, never the strength', () => {
    expect(auth.signIn({ email: '', password: '' })).toEqual({ email: 'emailEmpty', password: 'passwordEmpty' });
    expect(auth.signIn({ email: 'nope', password: 'x' })).toEqual({ email: 'emailInvalid', password: null });
    expect(auth.signIn({ email: ' A@B.co ', password: '1' })).toEqual({ email: null, password: null });
  });
});

describe('PIN', () => {
  it.each(['0000', '1111', '1234', '0123', '2345', '4321', '9876', '3210'])('%s is weak', (pin) => expect(isWeakPin(pin)).toBe(true));
  it.each(['1235', '1357', '9012', '0912', '1122', '2468'])('%s is not weak', (pin) => expect(isWeakPin(pin)).toBe(false));

  it('accepts exactly four digits', () => {
    expect(isFourDigits('1234')).toBe(true);
    for (const bad of ['', '123', '12345', '12a4', '１２３４', ' 123']) expect(isFourDigits(bad)).toBe(false);
  });

  it('compares the new PIN with the old one', () => {
    expect(sameAsOld('1357', '1357')).toBe(true);
    expect(sameAsOld('1357', '1358')).toBe(false);
  });
});

describe('word', () => {
  it.each([
    ['', 'wordEmpty'],
    ['   ', 'wordEmpty'],
    ['mama', null],
    ['  Mama  ', null],
    ['ma  ma', null], // double space is collapsed
    ['ma-ma', null],
    ['ma--ma', 'wordChars'],
    ['-ma', 'wordChars'],
    ['ma ', null],
    ['ma1', 'wordChars'],
    ['máma', 'wordChars'],
    ['ma😀', 'wordChars'],
    ['a'.repeat(30), null],
    ['a'.repeat(31), 'wordLong'],
  ])('%j → %s', (value, expected) => expect(word.wordText(value)).toBe(expected));

  it('rejects a duplicate ignoring case and extra spaces', () => {
    expect(word.wordText('MAMA', ['mama'])).toBe('wordDuplicate');
    expect(word.wordText('ma  ma', ['Ma Ma'])).toBe('wordDuplicate');
    expect(word.wordText('mami', ['mama'])).toBeNull();
  });

  it('collapses spaces without touching letters', () => expect(word.normalizeWord('  ma   ma ')).toBe('ma ma'));

  it('survives a very long paste', () => expect(word.wordText('x'.repeat(100_000))).toBe('wordLong'));
});

describe('syllable', () => {
  it.each([
    ['', 'syllableEmpty'],
    ['  ', 'syllableEmpty'],
    ['ma', null],
    [' ma ', null],
    ['m a', 'syllableChars'],
    ['m-a', 'syllableChars'],
    ['ma1', 'syllableChars'],
    ['mà', 'syllableChars'],
    ['a'.repeat(10), null],
    ['a'.repeat(11), 'syllableLong'],
  ])('%j → %s', (value, expected) => expect(word.syllableText(value)).toBe(expected));

  it('allows the same syllable twice and warns (not errors) when they do not add up', () => {
    expect(word.syllablesMatch('mama', ['ma', 'ma'])).toBeNull();
    expect(word.syllablesMatch('Ma-Ma', ['MA', 'ma'])).toBeNull();
    expect(word.syllablesMatch('mama', [])).toBeNull();
    const warning = word.syllablesMatch('mama', ['ma', 'mi']);
    expect(warning).toEqual({ key: 'syllablesMismatch', vars: { joined: 'ma-mi', word: 'mama' } });
    expect(messageOf(warning!)).toBe('Gabungan suku kata (“ma-mi”) berbeda dari kata (“mama”). Periksa lagi, atau lanjut bila sudah benar.');
  });

  it('stops adding at MAX_SYLLABLES', () => {
    expect(word.maxSyllables(MAX_SYLLABLES - 1)).toBeNull();
    expect(word.maxSyllables(MAX_SYLLABLES)).toBe('syllablesFull');
    expect(word.canAddSyllable(MAX_SYLLABLES)).toBe(false);
  });
});

describe('instruction', () => {
  it.each([
    ['', 'instructionEmpty'],
    ['   \n ', 'instructionEmpty'],
    ['a'.repeat(9), 'instructionShort'],
    ['a'.repeat(10), null],
    ['a'.repeat(500), null],
    ['a'.repeat(501), 'instructionLong'],
    ['     ' + 'a'.repeat(9) + '     ', 'instructionShort'], // trimmed first
    ['😀'.repeat(10), null],
  ])('%j → %s', (value, expected) => expect(word.instruction(value)).toBe(expected));

  it('collapses spaces but keeps line breaks', () => expect(word.normalizeInstruction(' a   b\n\nc ')).toBe('a b\n\nc'));
});

describe('video', () => {
  const ok = { mimeType: 'video/mp4', fileSize: 1000, durationMs: 5000 };
  it('accepts mp4 and mov within the limits, exactly at the limits too', () => {
    expect(videoFile(ok)).toBeNull();
    expect(videoFile({ ...ok, mimeType: 'video/quicktime' })).toBeNull();
    expect(videoFile({ ...ok, mimeType: 'VIDEO/MP4' })).toBeNull();
    expect(videoFile({ ...ok, fileSize: VIDEO_LIMITS.maxBytes, durationMs: VIDEO_LIMITS.maxDurationMs })).toBeNull();
  });

  it('asks for a video when none is chosen', () => expect(videoFile(null)).toBe('videoEmpty'));

  it('refuses another format', () => expect(videoFile({ ...ok, mimeType: 'video/webm' })).toBe('videoFormat'));

  it('names the size in whole MB', () => {
    const big = videoFile({ ...ok, fileSize: 62 * 1024 * 1024 - 5 });
    expect(messageOf(big!)).toBe('Video terlalu besar (62 MB). Maksimal 50 MB.');
    expect(messageOf(videoFile({ ...ok, fileSize: VIDEO_LIMITS.maxBytes + 1 })!)).toBe('Video terlalu besar (51 MB). Maksimal 50 MB.');
  });

  it('refuses a video that is too long', () => {
    expect(videoFile({ ...ok, durationMs: VIDEO_LIMITS.maxDurationMs + 1 })).toBe('videoTooLong');
  });
});

describe('messages', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(fill('Sisa {n} percobaan, {x}', { n: 4 })).toBe('Sisa 4 percobaan, {x}');
    expect(fill(MESSAGES.errorCount, { n: 2 })).toBe('Ada 2 isian yang perlu diperbaiki.');
  });

  it('never uses forbidden words', () => {
    expect(JSON.stringify(MESSAGES)).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis|terapi|penderita|tunarungu)\b/i);
  });
});
