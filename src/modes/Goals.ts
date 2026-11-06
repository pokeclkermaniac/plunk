/** Level goal evaluation. Pure. */
import { COLOR_NAMES } from '../game/types';
import type { GoalDef } from './RoundConfig';

export interface RoundStats {
  score: number;
  landed: number;
  wrong: number;
  fullPegs: number;
  fullPegColors: number[];
  baskets: number;
  swishes: number;
  banks: number;
  fullTubes: number;
  fullTubeColors: number[];
  /** Indices of hoops that have received at least one basket. */
  hoopsScored: number[];
  hoopCount: number;
  bestStreak: number;
}

export function emptyStats(hoopCount = 0): RoundStats {
  return {
    score: 0,
    landed: 0,
    wrong: 0,
    fullPegs: 0,
    fullPegColors: [],
    baskets: 0,
    swishes: 0,
    banks: 0,
    fullTubes: 0,
    fullTubeColors: [],
    hoopsScored: [],
    hoopCount,
    bestStreak: 0,
  };
}

export interface GoalStatus {
  met: boolean;
  /** Failed for good (e.g. a wrong colour on a no-wrong level). */
  failed: boolean;
  progress: number;
  target: number;
}

export function evaluateGoal(goal: GoalDef, s: RoundStats): GoalStatus {
  const st = (progress: number, target: number, failed = false): GoalStatus => ({
    met: !failed && progress >= target,
    failed,
    progress: Math.min(progress, target),
    target,
  });
  switch (goal.type) {
    case 'score':
      return st(s.score, goal.value);
    case 'fullPegs':
      return st(s.fullPegs, goal.value);
    case 'fullPegColor':
      return st(s.fullPegColors.filter((c) => goal.color === undefined || c === goal.color).length, goal.value);
    case 'noWrong':
      return st(s.score, goal.value, s.wrong > 0);
    case 'baskets':
      return st(s.baskets, goal.value);
    case 'swishes':
      return st(s.swishes, goal.value);
    case 'fullTube':
      return st(s.fullTubeColors.filter((c) => goal.color === undefined || c === goal.color).length, goal.value);
    case 'everyHoop':
      return st(new Set(s.hoopsScored).size, s.hoopCount);
  }
}

export function goalText(goal: GoalDef): string {
  const color = goal.color !== undefined ? COLOR_NAMES[goal.color] + ' ' : '';
  const n = goal.value;
  switch (goal.type) {
    case 'score':
      return `Score ${n} points`;
    case 'fullPegs':
      return n === 1 ? 'Fill a peg with one color' : `Fill ${n} pegs with one color each`;
    case 'fullPegColor':
      return `Fill ${n === 1 ? 'a peg' : n + ' pegs'} with ${color || 'one color'}${color ? 'rings' : ''}`.trim();
    case 'noWrong':
      return `Score ${n} with no wrong-color rings`;
    case 'baskets':
      return `Make ${n} baskets`;
    case 'swishes':
      return `Make ${n} swishes (no rim, no board)`;
    case 'fullTube':
      return `Fill ${n === 1 ? 'a tube' : n + ' tubes'} with one ${color ? color.trim().toLowerCase() : 'color'}`;
    case 'everyHoop':
      return 'Sink a basket in every hoop';
  }
}
