/**
 * Optional tilt control (off by default). Uses DeviceOrientation; iOS needs a one-time
 * permission request triggered by a user tap.
 */
import { TUNING } from '../config/tuning';

let gamma = 0; // left/right tilt in degrees
let listening = false;
let active = false;

function onOrient(e: DeviceOrientationEvent) {
  let g = e.gamma ?? 0;
  // In landscape the axes swap.
  const angle = (screen.orientation?.angle ?? (window as any).orientation ?? 0) as number;
  if (angle === 90) g = e.beta ?? 0;
  else if (angle === -90 || angle === 270) g = -(e.beta ?? 0);
  gamma = g;
}

export const Tilt = {
  available(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  },
  needsPermission(): boolean {
    const DOE = (window as any).DeviceOrientationEvent;
    return !!DOE && typeof DOE.requestPermission === 'function';
  },
  /** Call from a tap. Resolves true if tilt is now active. */
  async enable(): Promise<boolean> {
    if (!this.available()) return false;
    const DOE = (window as any).DeviceOrientationEvent;
    try {
      if (typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') return false;
      }
    } catch {
      return false;
    }
    if (!listening) {
      window.addEventListener('deviceorientation', onOrient);
      listening = true;
    }
    active = true;
    return true;
  },
  /** Re-attach without a permission prompt (works on Android; on iOS only after a prior grant this session). */
  resume(): void {
    if (!this.available() || this.needsPermission()) return;
    if (!listening) {
      window.addEventListener('deviceorientation', onOrient);
      listening = true;
    }
    active = true;
  },
  disable(): void {
    active = false;
    gamma = 0;
  },
  /** −1..1 sideways factor, gentle by design. */
  factor(): number {
    if (!active) return 0;
    const g = Math.max(-TUNING.TILT_MAX_DEG, Math.min(TUNING.TILT_MAX_DEG, gamma));
    return g / TUNING.TILT_MAX_DEG;
  },
};
