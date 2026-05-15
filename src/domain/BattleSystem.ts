import type { EnemyState, FriendDefinition, Point, StageDefinition, Tile } from "./types.js";
import { TileType } from "./types.js";
import type { PuzzleBoard } from "./PuzzleBoard.js";

const blockConcurrentAdjust = 0.1;
const blockComboAdjust = 0.1;

export class BattleSystem {
  readonly enemies: EnemyState[];
  readonly maxHp = 390;
  hp = this.maxHp;
  turn = 1;

  constructor(stage: StageDefinition, private readonly friends: readonly FriendDefinition[]) {
    this.enemies = stage.enemyHp.map((hp, index) => ({
      name: `Enemy ${index + 1}`,
      hp,
      maxHp: hp,
      atk: stage.enemyAtk[index] ?? 100,
      turn: stage.enemyTurn[index] ?? 2,
      wait: stage.enemyTurn[index] ?? 2,
      dead: false,
    }));
  }

  calculateDamage(points: readonly Point[], board: PuzzleBoard): number {
    const countByKind = new Map<number, number>();
    for (const point of points) {
      const tile = board.tileAt(point);
      if (!tile) continue;
      countByKind.set(tile.kind, (countByKind.get(tile.kind) ?? 0) + 1);
    }
    let total = 0;
    for (const friend of this.friends) {
      const count = countByKind.get(friend.kind) ?? 0;
      if (count > 0) total += friend.atk * (1 + (count - 3) * blockConcurrentAdjust);
    }
    return Math.max(0, Math.round(total + board.weakHits(points) * 80));
  }

  calculateComboDamage(points: readonly Point[], chain: number, board: PuzzleBoard): number {
    const baseDamage = this.calculateDamage(points, board);
    return Math.round(baseDamage * (1 + (chain - 1) * blockComboAdjust));
  }

  applyPlayerDamage(amount: number): void {
    const target = this.enemies.filter((enemy) => !enemy.dead).sort((a, b) => a.hp - b.hp)[0];
    if (!target) return;
    target.hp = Math.max(0, target.hp - amount);
    target.dead = target.hp === 0;
  }

  endTurn(): "win" | "lose" | "continue" {
    this.turn += 1;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.wait -= 1;
      if (enemy.wait <= 0) {
        this.hp = Math.max(0, this.hp - enemy.atk);
        enemy.wait = enemy.turn;
      }
    }
    if (this.hp <= 0) return "lose";
    if (this.enemies.every((enemy) => enemy.dead)) return "win";
    return "continue";
  }
}
