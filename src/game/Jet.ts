import { TUNING } from '../config/tuning';
import { M } from './Matter';
import type { FreePiece } from './Piece';

/**
 * A jet: a tap opens a short-lived cone-shaped force zone above the nozzle. Pieces in the cone
 * get an upward push that fades with distance from the nozzle and from the centre line, plus
 * a little sideways spread and a random kick.
 */
export class Jet {
  activeUntil = -1e9;
  lastFire = -1e9;
  /** Radians, positive = leans right. */
  tilt: number;

  constructor(
    public side: 'left' | 'right',
    public x: number,
    public y: number,
    tiltDeg: number,
  ) {
    // "Inward": the left jet leans right, the right jet leans left.
    this.tilt = ((side === 'left' ? 1 : -1) * tiltDeg * Math.PI) / 180;
  }

  /** Returns false if still cooling down. */
  fire(now: number): boolean {
    if (now - this.lastFire < TUNING.JET_COOLDOWN_MS) return false;
    this.lastFire = now;
    this.activeUntil = now + TUNING.JET_DURATION_MS;
    return true;
  }

  isActive(now: number): boolean {
    return now < this.activeUntil;
  }

  /** How strongly a point is inside the cone (0 = outside). Exposed for tests and bots. */
  strengthAt(px: number, py: number, pieceRadius = 0): { s: number; perp: number; halfW: number } {
    const dx = px - this.x;
    const dy = this.y - py; // height above nozzle
    const ax = Math.sin(this.tilt);
    const ay = Math.cos(this.tilt);
    const along = dx * ax + dy * ay;
    const perp = dx * ay - dy * ax;
    if (along < -30 || along > TUNING.JET_RANGE) return { s: 0, perp, halfW: 1 };
    const halfAngle = ((TUNING.JET_CONE_ANGLE_DEG / 2) * Math.PI) / 180;
    const halfW = TUNING.JET_NOZZLE_WIDTH / 2 + Math.max(0, along) * Math.tan(halfAngle);
    const reach = halfW + pieceRadius * 0.6;
    if (Math.abs(perp) > reach) return { s: 0, perp, halfW };
    const distF = Math.pow(1 - Math.max(0, along) / TUNING.JET_RANGE, 0.7);
    const c = Math.abs(perp) / reach;
    const centerF = 1 - c * c * 0.6;
    return { s: distF * centerF, perp, halfW };
  }

  apply(pieces: FreePiece[], now: number, timeScale: number, rng: () => number = Math.random): void {
    if (!this.isActive(now)) return;
    const ax = Math.sin(this.tilt);
    const ay = Math.cos(this.tilt);
    for (const p of pieces) {
      if (!p.alive) continue;
      const b = p.body;
      const { s: f, perp, halfW } = this.strengthAt(b.position.x, b.position.y, p.radius);
      if (f <= 0) continue;
      const heavyDiv = p.piece.kind === 'heavy' ? TUNING.HEAVY_JET_DIVISOR : 1;
      const s = (TUNING.JET_IMPULSE * f * timeScale) / heavyDiv;
      const spread = (perp / Math.max(1, halfW)) * TUNING.JET_SPREAD * s;
      const kick = (rng() * 2 - 1) * TUNING.JET_RANDOM_KICK * timeScale;
      M.Body.setVelocity(b, {
        x: b.velocity.x + ax * s + spread + kick,
        y: b.velocity.y - ay * s,
      });
      if (p.type === 'ring') {
        M.Body.setAngularVelocity(b, b.angularVelocity + (rng() * 2 - 1) * TUNING.JET_SPIN_KICK * timeScale);
      }
      p.lastJetHit = now;
    }
  }
}
