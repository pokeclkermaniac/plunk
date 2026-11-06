import { TUNING } from '../config/tuning';

/**
 * The tank floor slopes gently down toward each jet nozzle, like the toy, so pieces that miss
 * slide back over a jet instead of getting stuck in the corners.
 */
export function floorProfile(jets: [number, number]): [number, number][] {
  const F = TUNING.TANK_H;
  const W = TUNING.TANK_W;
  const [a, b] = jets;
  const flat = 36;
  const mid = (a + b) / 2;
  return [
    [0, F - 70],
    [a - flat, F],
    [a + flat, F],
    [mid, F - 48],
    [b - flat, F],
    [b + flat, F],
    [W, F - 70],
  ];
}

export function floorYAt(profile: [number, number][], x: number): number {
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    if (x >= x0 && x <= x1) return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return TUNING.TANK_H;
}
