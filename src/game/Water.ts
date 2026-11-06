import { TUNING } from '../config/tuning';
import { M } from './Matter';
import type { FreePiece } from './Piece';

/**
 * Buoyancy + drag. Not a fluid sim: each physics step every piece below the surface gets an
 * upward force that cancels most of gravity, and angular damping. Linear drag is the body's
 * frictionAir. Optional tilt adds a gentle sideways push.
 */
export function applyWater(pieces: FreePiece[], gravityY: number, gravityScale: number, tilt: number): void {
  for (const p of pieces) {
    if (!p.alive) continue;
    const b = p.body;
    const g = b.mass * gravityY * gravityScale;
    if (b.position.y > TUNING.WATER_SURFACE_Y) {
      const ratio = p.piece.kind === 'heavy' ? TUNING.HEAVY_BUOYANCY_RATIO : TUNING.BUOYANCY_RATIO;
      b.force.y -= g * ratio;
      if (tilt) b.force.x += g * TUNING.TILT_STRENGTH * tilt;
    }
    M.Body.setAngularVelocity(b, b.angularVelocity * TUNING.WATER_ANGULAR_DAMPING);
  }
}
