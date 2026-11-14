import { useState } from 'react';

import { colors } from '../theme';

const RING = { outlineWidth: 3, outlineOffset: 2, outlineColor: colors.focus, outlineStyle: 'solid' } as const;

/** Focus ring for non-touch controls (switch, keyboard): 3 dp, 2 dp away from the edge, only while focused. */
export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return {
    focusProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
    focusStyle: focused ? RING : undefined,
  };
}
