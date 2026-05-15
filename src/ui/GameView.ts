import { TileType, type BoardSnapshot, type EnemyState, type GameState, type Point, type StageDefinition, type Tile } from "../domain/types.js";

export interface GameViewHandlers {
  readonly onTileSelected: (point: Point) => void;
  readonly onStageChanged: (stageIndex: number) => void;
  readonly onReset: () => void;
}

export class GameView {
  private readonly boardEl = this.requiredElement<HTMLElement>("board");
  private readonly enemyRowEl = this.requiredElement<HTMLElement>("enemyRow");
  private readonly stageSelectEl = this.requiredElement<HTMLSelectElement>("stageSelect");
  private readonly scoreEl = this.requiredElement<HTMLElement>("score");
  private readonly hpFillEl = this.requiredElement<HTMLElement>("hpFill");
  private readonly hpTextEl = this.requiredElement<HTMLElement>("hpText");
  private readonly turnTextEl = this.requiredElement<HTMLElement>("turnText");
  private readonly messageEl = this.requiredElement<HTMLElement>("message");
  private readonly resetButton = this.requiredElement<HTMLButtonElement>("resetButton");

  bind(handlers: GameViewHandlers): void {
    this.boardEl.addEventListener("pointerdown", (event) => {
      const tile = (event.target as HTMLElement).closest<HTMLElement>(".tile");
      if (!tile) return;
      handlers.onTileSelected({ x: Number(tile.dataset.x), y: Number(tile.dataset.y) });
    });
    this.stageSelectEl.addEventListener("change", () => handlers.onStageChanged(Number(this.stageSelectEl.value)));
    this.resetButton.addEventListener("click", handlers.onReset);
  }

  setStages(stages: readonly StageDefinition[]): void {
    this.stageSelectEl.replaceChildren(...stages.map((stage, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = stage.name;
      return option;
    }));
  }

  setSelectedStage(index: number): void {
    this.stageSelectEl.value = String(index);
  }

  render(state: GameState): void {
    this.renderBoard(state.board);
    this.renderEnemies(state.enemies);
    this.scoreEl.textContent = String(state.score);
    this.turnTextEl.textContent = String(state.turn);
    this.hpTextEl.textContent = `${state.hp} / ${state.maxHp}`;
    this.hpFillEl.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  }

  setMessage(text: string): void {
    this.messageEl.textContent = text;
  }

  animateRemoval(points: readonly Point[]): void {
    for (const point of points) {
      this.boardEl.querySelector(`.tile[data-x="${point.x}"][data-y="${point.y}"]`)?.classList.add("removing");
    }
  }

  private renderBoard(board: BoardSnapshot): void {
    this.boardEl.style.setProperty("--cols", String(board.width));
    this.boardEl.style.setProperty("--rows", String(board.height));
    const cells: HTMLElement[] = [];
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const cell = document.createElement("div");
        const shape = board.shapes[y]![x]!;
        cell.className = `cell${shape.enabled ? "" : shape.pass ? " pass" : " disabled"}`;
        if (board.weakMap[y]?.[x]?.length) cell.appendChild(this.createWeakMarker());
        const tile = board.grid[y]![x];
        if (tile) cell.appendChild(this.createTile(tile, { x, y }, board.selected));
        cells.push(cell);
      }
    }
    this.boardEl.replaceChildren(...cells);
  }

  private renderEnemies(enemies: readonly EnemyState[]): void {
    this.enemyRowEl.replaceChildren(...enemies.map((enemy) => {
      const card = document.createElement("article");
      card.className = `enemy${enemy.dead ? " dead" : ""}`;
      const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
      card.innerHTML = `
        <div class="enemy-face"></div>
        <div>
          <div class="enemy-name">${enemy.name}</div>
          <div class="hpbar"><span style="width:${hpPercent}%"></span></div>
          <div class="mini">HP ${enemy.hp} / ${enemy.maxHp}</div>
          <div class="mini">TURN ${enemy.wait} / ATK ${enemy.atk}</div>
        </div>`;
      return card;
    }));
  }

  private createTile(tile: Tile, point: Point, selected: Point | null): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = this.tileClass(tile, point, selected);
    button.dataset.x = String(point.x);
    button.dataset.y = String(point.y);
    button.setAttribute("aria-label", `block ${point.x},${point.y}`);
    return button;
  }

  private tileClass(tile: Tile, point: Point, selected: Point | null): string {
    const classes = ["tile", `kind-${tile.kind}`];
    if (tile.type === TileType.Vertical) classes.push("vertical");
    if (tile.type === TileType.Horizontal) classes.push("horizontal");
    if (tile.type.startsWith("medal")) classes.push("medal");
    if (selected && selected.x === point.x && selected.y === point.y) classes.push("selected");
    return classes.join(" ");
  }

  private createWeakMarker(): HTMLElement {
    const marker = document.createElement("span");
    marker.className = "weak";
    return marker;
  }

  private requiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element as T;
  }
}
