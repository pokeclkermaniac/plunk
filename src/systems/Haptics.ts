/** Wraps navigator.vibrate. Works on Android Chrome; silently does nothing on iPhone Safari. */
let enabled = true;

function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

export const Haptics = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },
  /** Short buzz on each jet tap. */
  tap: () => vibrate(12),
  /** Double pulse on a landing. */
  land: () => vibrate([18, 40, 18]),
  /** Long buzz on a full-peg / full-tube bonus. */
  big: () => vibrate([60, 30, 140]),
  bad: () => vibrate(35),
};
