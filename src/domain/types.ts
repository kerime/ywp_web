export enum TileType {
  Normal = "normal",
  Vertical = "vertical",
  Horizontal = "horizontal",
  Medal0 = "medal0",
  Medal1 = "medal1",
  Medal2 = "medal2",
}

export type Axis = "x" | "y";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Tile {
  kind: number;
  type: TileType;
}

export interface ShapeCell {
  enabled: boolean;
  spawn: boolean;
  pass: boolean;
}

export interface StageDefinition {
  readonly id: number;
  readonly name: string;
  readonly kinds: number;
  readonly enemyHp: readonly number[];
  readonly enemyAtk: readonly number[];
  readonly enemyTurn: readonly number[];
  readonly shape: readonly string[];
  readonly info: readonly string[];
}

export interface FriendDefinition {
  readonly name: string;
  readonly kind: number;
  readonly atk: number;
}

export interface EnemyState {
  readonly name: string;
  hp: number;
  readonly maxHp: number;
  readonly atk: number;
  readonly turn: number;
  wait: number;
  dead: boolean;
}

export interface MatchGroup {
  readonly axis: Axis;
  readonly points: readonly Point[];
}

export interface ResolveStep {
  readonly chain: number;
  readonly removed: readonly Point[];
  readonly damage: number;
}

export interface BoardSnapshot {
  readonly width: number;
  readonly height: number;
  readonly shapes: readonly (readonly ShapeCell[])[];
  readonly weakMap: readonly (readonly number[][])[];
  readonly grid: readonly (readonly (Tile | null)[])[];
  readonly selected: Point | null;
}

export interface GameState {
  readonly board: BoardSnapshot;
  readonly enemies: readonly EnemyState[];
  readonly score: number;
  readonly turn: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly locked: boolean;
}
