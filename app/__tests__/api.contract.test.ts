import { contract } from '../test-fixtures/api-contract';
import { attemptFromResponse } from '../src/user/pure';
import { getHint } from '../src/content/hints';

describe('server-generated API contract', () => {
  it('covers the I1 materials and uses known app hints', () => {
    expect(contract.items.map((item) => item.item_id)).toEqual(expect.arrayContaining([
      'l0_hold_a', 'l1_a', 'l2_ma', 'l3_mama',
    ]));
    for (const response of contract.analyses) {
      expect(getHint(response.hint_id)).toBeTruthy();
      if (response.status === 'retry') {
        expect(attemptFromResponse(response, 'contract-session')).toBeNull();
        expect(response.indicators).toBeNull();
        expect(response.units).toBeNull();
      } else {
        expect(attemptFromResponse(response, 'contract-session')).toMatchObject({
          itemId: response.item_id, overall: response.overall, score: response.score,
        });
        if (response.level === 0) expect(response.indicators?.bibir).toBeNull();
      }
    }
  });

  it('calibration retries are not saved and completion occurs only at vowel_u', () => {
    for (const response of contract.calibrations) {
      expect(response.saved).toBe(response.status === 'ok');
      expect(response.calibration_complete).toBe(response.status === 'ok' && response.step === 'vowel_u');
    }
  });
});
