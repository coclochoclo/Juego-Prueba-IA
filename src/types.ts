export type GameState = "menu" | "playing" | "gameover" | "victory";

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isGrounded: boolean;
  facingRight: boolean;
  isAttacking: boolean;
  attackTimer: number; // Duration of active hit outline
  attackCooldown: number;
  damageCooldown: number; // Invulnerability frames timer
  isRunning: boolean;
  score: number;
  deaths: number;
}

export type EnemyType = "slug" | "knight" | "boss";

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  startX: number; // For patrol boundaries
  patrolRange: number;
  facingRight: boolean;
  damageCooldown: number;
  attackCooldown: number;
  color: string;
  isAggro: boolean;
  shakeTimer: number; // Visual feedback when hit
}

export type PlatformType = "normal" | "moving" | "bouncy";

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  vx?: number; // For moving platforms
  rangeX?: [number, number]; // Patrol X range
  originalX?: number;
  bouncyPower?: number; // Speed boost if jump on bouncy
  color: string;
}

export type HazardType = "spikes" | "lava";

export interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
  type: HazardType;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number; // Countdown
  maxLife: number;
}

export interface Coin {
  x: number;
  y: number;
  radius: number;
  isCollected: boolean;
  bobOffset: number; // for hover animation
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}
