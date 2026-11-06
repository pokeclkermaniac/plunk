/**
 * ALL numbers that affect how Plunk! feels live here.
 * Change a value, save, and the dev server reloads the game.
 *
 * Units: distances are in world pixels (the tank is TANK_W × TANK_H),
 * times in milliseconds unless the name says SECONDS, velocities in
 * pixels per physics step (60 steps per second).
 */
export const TUNING = {
  // ── World / tank ────────────────────────────────────────────────
  TANK_W: 600,
  TANK_H: 900,
  /** y of the water surface (0 = top of the tank). Above it there is a thin air gap. */
  WATER_SURFACE_Y: 26,
  /** Matter gravity (1 = Matter default). Buoyancy cancels most of it. */
  GRAVITY_Y: 2,
  PHYSICS_STEP_MS: 1000 / 60,
  /** Max physics steps per rendered frame (prevents a "spiral of death" on slow phones). */
  MAX_STEPS_PER_FRAME: 6,

  // ── Water ───────────────────────────────────────────────────────
  /** Upward force as a fraction of gravity. Higher = floatier (1 = neutral). */
  BUOYANCY_RATIO: 0.72,
  HEAVY_BUOYANCY_RATIO: 0.45,
  /** Drag. Higher = slower, gooier water. */
  WATER_FRICTION_AIR: 0.06,
  /** Spin damping per step (0..1, fraction of spin kept). */
  WATER_ANGULAR_DAMPING: 0.94,

  // ── Jets ────────────────────────────────────────────────────────
  /** Main feel knob: upward velocity added per physics step at full strength while a jet is active. */
  JET_IMPULSE: 1.3,
  /** Total angle of the force cone. */
  JET_CONE_ANGLE_DEG: 30,
  /** Width of the cone right at the nozzle (so things sitting on the nozzle get hit). */
  JET_NOZZLE_WIDTH: 70,
  /** How far up the cone reaches. */
  JET_RANGE: 780,
  JET_DURATION_MS: 250,
  JET_COOLDOWN_MS: 100,
  /** How strongly things are pushed away from the cone's centre line (0 = straight up). */
  JET_SPREAD: 0.3,
  /** Random sideways kick per step, so motion stays organic. */
  JET_RANDOM_KICK: 0.08,
  /** Random spin kick per step (rings tumble a bit). */
  JET_SPIN_KICK: 0.004,
  JET_TILT_DEG_RINGS: 0,
  JET_TILT_DEG_BASKETBALL: 8,
  /** Jet strength is divided by this for heavy pieces ("needs more blasts"). */
  HEAVY_JET_DIVISOR: 1.8,
  BUBBLES_PER_TAP_MIN: 15,
  BUBBLES_PER_TAP_MAX: 25,
  MAX_BUBBLES: 260,

  // ── Rings ───────────────────────────────────────────────────────
  RING_WIDTH: 84,
  RING_RIM_RADIUS: 10,
  /** Visual thickness of the ring ellipse (rings are seen almost edge-on). */
  RING_VISUAL_HEIGHT: 22,
  RING_DENSITY: 0.0012,
  RING_FRICTION: 0.05,
  RING_RESTITUTION: 0.15,
  /** Higher = easier landing (max ring tilt for a capture). */
  CAPTURE_MAX_ANGLE_DEG: 50,
  /** Extra horizontal forgiveness for a capture (beyond the open gap between rims). */
  CAPTURE_LENIENCY_PX: 10,
  /** How far above the peg tip the capture check starts. */
  CAPTURE_BAND_ABOVE: 18,
  CAPTURE_BAND_BELOW: 8,
  RING_STACK_SPACING: 17,
  RING_SLIDE_MS: 320,

  // ── Pegs ────────────────────────────────────────────────────────
  PEG_CAPACITY: 4,
  PEG_WIDTH: 14,
  PEG_HEIGHT: 140,

  // ── Balls / hoops ───────────────────────────────────────────────
  BALL_RADIUS: 24,
  BALL_DENSITY: 0.0009,
  BALL_RESTITUTION: 0.5,
  BALL_FRICTION: 0.01,
  BALL_FRICTION_AIR: 0.05,
  RIM_POINT_RADIUS: 5,
  /** Distance between the back and front rim points. */
  RIM_WIDTH: 80,
  BACKBOARD_HEIGHT: 140,
  BACKBOARD_RESTITUTION: 0.45,
  /** A basket counts if the ball crosses the rim top → bottom within this window. */
  BASKET_WINDOW_MS: 500,
  /** How far below the rim the "bottom sensor" sits. */
  BASKET_DEPTH: 22,
  TUBE_CAPACITY: 4,
  RIM_RATTLE_WINDOW_MS: 400,
  /** Keep at least this many balls loose in the tank (spawns a new one after a basket if needed). */
  BALLS_MIN_FREE: 3,
  /** Never more than this many balls loose in the tank. */
  MAX_FREE_BALLS: 8,

  // ── Scoring: shared ─────────────────────────────────────────────
  BASE_POINTS: 10,
  WRONG_COLOR_PENALTY: 15,
  FULL_PEG_BONUS: 250,
  GOLDEN_BONUS: 100,
  HEAVY_MULT: 3,
  TANK_CLEAR_BONUS: 300,

  // ── Scoring: basketball ─────────────────────────────────────────
  BASKET_POINTS: 20,
  SWISH_BONUS: 10,
  BANK_BONUS: 5,
  FULL_TUBE_BONUS: 250,
  HOT_HANDS_SECONDS: 15,
  HOT_HANDS_MULT: 2,

  // ── Modes ───────────────────────────────────────────────────────
  TIMED_ROUND_SECONDS: 90,
  TIMED_START_RINGS: 8,
  TIMED_COLORS: 3,
  SHOOTOUT_START_BALLS: 5,
  ENDLESS_START_SUPPLY: 20,
  ENDLESS_REFILL_ON_FULL_PEG: 5,
  ENDLESS_TANK_RINGS: 8,
  VERSUS_ROUND_SECONDS: 90,
  SUDDEN_DEATH_SECONDS: 15,
  LEVEL_TIME_BONUS_PER_SECOND: 10,
  LEVEL_PIECE_BONUS: 25,
  TIMER_WARNING_SECONDS: 10,

  // ── Special pieces ──────────────────────────────────────────────
  /** Chance that a newly spawned piece is special. Split among the 4 types by the weights below. */
  SPECIAL_RING_CHANCE: 0.08,
  SPECIAL_WEIGHTS: { rainbow: 0.35, golden: 0.25, heavy: 0.25, bomb: 0.15 },

  // ── Tilt ────────────────────────────────────────────────────────
  /** Sideways gravity at full tilt, as a fraction of gravity. Kept gentle. */
  TILT_STRENGTH: 0.18,
  TILT_MAX_DEG: 35,

  // ── Juice ───────────────────────────────────────────────────────
  SHAKE_SMALL: 0.004,
  SHAKE_BIG: 0.012,
  ZOOM_BIG: 1.06,
  RATTLE_NUDGE: 0.003,

  // ── Boosters ────────────────────────────────────────────────────
  SLOWMO_SECONDS: 5,
  SLOWMO_TIMESCALE: 0.4,
  MAGNET_SECONDS: 6,
  MAGNET_RADIUS: 190,
  MAGNET_PULL: 0.35,
  EXTRA_TIME_SECONDS: 15,

  // ── Progression ─────────────────────────────────────────────────
  XP_PER_POINTS: 10, // 1 XP per this many points
  XP_FULL_BONUS: 15,
  XP_NEW_BEST: 50,
  XP_LEVEL_STAR: 20,
  XP_LEVEL_BASE: 120,
  XP_LEVEL_GROWTH: 60,
} as const;

export type Tuning = typeof TUNING;
