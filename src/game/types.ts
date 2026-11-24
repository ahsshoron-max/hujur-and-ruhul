export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type LaneIndex = 0 | 1 | 2; // 0 = left, 1 = center, 2 = right

export type PowerUpType = 'magnet' | 'jetpack' | 'multiplier' | 'sneakers';

export type ObstacleKind =
  | 'low_barrier'
  | 'high_gate'
  | 'tall_barrier'
  | 'train_static'
  | 'train_ramp'
  | 'train_moving';

export interface ActivePowerUpState {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface GameHudState {
  phase: GamePhase;
  score: number;
  bestScore: number;
  coins: number;
  distance: number;
  speedKmh: number;
  multiplier: number;
  chaseDanger: number; // 0 (safe) -> 1 (Ruhul right behind)
  stumbleActive: boolean;
  activePowerUps: ActivePowerUpState[];
  caughtReason: string;
  muted: boolean;
}

export const LANE_WIDTH = 3.2;
export const LANE_POSITIONS: readonly number[] = [-LANE_WIDTH, 0, LANE_WIDTH];

export const RUHUL_PHOTO_URL =
  '/assets/aistudio/145732405_1951989401621574_1704307000126007504_n_0879591f.jpg';
export const HUJUR_PHOTO_URL =
  '/assets/aistudio/475755067_636238459087944_2268730108774900864_n_1628d75d.jpg';
export const CAUGHT_AUDIO_VIDEO_URL =
  '/assets/aistudio/Facebook_-_Google_Chrome_2026-10-24_22-18-56_-_Trim_47d03146.mp4';
