import { BattleSystem } from "../domain/BattleSystem.js";
import { PuzzleBoard } from "../domain/PuzzleBoard.js";
import type { FriendDefinition, GameState, Point } from "../domain/types.js";
import { StageRepository } from "../infrastructure/stages.js";
import type { GameView } from "../ui/GameView.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class PuzzleGame {
  private board!: PuzzleBoard;
  private battle!: BattleSystem;
  private score = 0;
  private locked = false;
  private selected: Point | null = null;
  private stageIndex = 0;

  constructor(
    private readonly stages: StageRepository,
    private readonly friends: readonly FriendDefinition[],
    private readonly view: GameView,
  ) {}

  start(): void {
    this.view.setStages(this.stages.all());
    this.view.bind({
      onTileSelected: (point) => void this.handleTile(point),
      onStageChanged: (index) => this.setup(index),
      onReset: () => this.setup(this.stageIndex),
    });
    this.setup(0);
  }

  private setup(stageIndex: number): void {
    this.stageIndex = stageIndex;
    const stage = this.stages.byIndex(stageIndex);
    this.board = new PuzzleBoard(stage);
    this.battle = new BattleSystem(stage, this.friends);
    this.score = 0;
    this.locked = false;
    this.selected = null;
    this.view.setSelectedStage(stageIndex);
    this.view.setMessage("ブロックを選んで、別のブロックへ入れ替え");
    this.render();
  }

  private async handleTile(point: Point): Promise<void> {
    if (this.locked || !this.board.canUse(point)) return;
    if (!this.selected) {
      this.selected = point;
      this.board.select(point);
      this.render();
      return;
    }
    if (this.selected.x === point.x && this.selected.y === point.y) {
      this.selected = null;
      this.board.select(null);
      this.render();
      return;
    }
    await this.swapAndResolve(this.selected, point);
  }

  private async swapAndResolve(a: Point, b: Point): Promise<void> {
    this.locked = true;
    this.selected = null;
    this.board.select(null);
    const swap = this.board.swap(a, b);
    if (!swap) {
      this.locked = false;
      return;
    }
    this.render();
    await wait(120);

    if (!this.board.hasMatches() && !swap.specialCombo) {
      this.view.setMessage("消せる組み合わせではありません");
      await wait(240);
      this.board.swap(a, b);
      this.locked = false;
      this.render();
      return;
    }

    const totalDamage = await this.board.resolve(
      swap.specialCombo ? [a, b] : [],
      async (step) => {
        this.score += 100 * step.chain + step.removed.length * 25;
        this.view.setMessage(`${step.chain} combo / ${step.removed.length} blocks / ${step.damage} damage`);
        this.view.animateRemoval(step.removed);
        await wait(220);
        this.render();
        await wait(170);
      },
      (points, chain) => this.battle.calculateComboDamage(points, chain, this.board),
    );

    if (totalDamage > 0) this.battle.applyPlayerDamage(totalDamage);
    const result = this.battle.endTurn();
    if (result === "lose") this.view.setMessage("LOSE");
    else if (result === "win") this.view.setMessage("WIN");
    else if (this.board.ensurePlayable()) this.view.setMessage("SHUFFLE");
    this.locked = result !== "continue";
    this.render();
  }

  private render(): void {
    this.view.render(this.state());
  }

  private state(): GameState {
    return {
      board: this.board.snapshot(),
      enemies: this.battle.enemies,
      score: this.score,
      turn: this.battle.turn,
      hp: this.battle.hp,
      maxHp: this.battle.maxHp,
      locked: this.locked,
    };
  }
}
