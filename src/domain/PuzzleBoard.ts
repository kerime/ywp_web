import { TileType, type BoardSnapshot, type MatchGroup, type Point, type ResolveStep, type ShapeCell, type StageDefinition, type Tile } from "./types.js";

export class PuzzleBoard {
  private readonly width: number;
  private readonly height: number;
  private readonly shapes: ShapeCell[][];
  private readonly weakMap: number[][][];
  private readonly grid: (Tile | null)[][];
  private selected: Point | null = null;

  constructor(private readonly stage: StageDefinition) {
    this.height = stage.shape.length;
    this.width = Math.max(...stage.shape.map((line) => line.length));
    this.shapes = this.buildShapes(stage);
    this.weakMap = this.buildWeakMap(stage);
    this.grid = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => null));
    this.fill();
    this.shuffleUntilPlayable();
    this.clearInitialMatches();
  }

  snapshot(): BoardSnapshot {
    return {
      width: this.width,
      height: this.height,
      shapes: this.shapes,
      weakMap: this.weakMap,
      grid: this.grid,
      selected: this.selected,
    };
  }

  select(point: Point | null): void {
    this.selected = point;
  }

  tileAt(point: Point): Tile | null {
    return this.grid[point.y]?.[point.x] ?? null;
  }

  canUse(point: Point): boolean {
    return this.isEnabled(point.x, point.y) && this.tileAt(point) !== null;
  }

  swap(a: Point, b: Point): { first: Tile; second: Tile; specialCombo: boolean } | null {
    const first = this.tileAt(a);
    const second = this.tileAt(b);
    if (!first || !second) return null;
    this.grid[a.y]![a.x] = second;
    this.grid[b.y]![b.x] = first;
    return {
      first,
      second,
      specialCombo: first.type !== TileType.Normal && second.type !== TileType.Normal,
    };
  }

  hasMatches(): boolean {
    return this.findMatches().length > 0;
  }

  async resolve(forcedSpecials: readonly Point[], onStep: (step: ResolveStep) => Promise<void> | void, damageFor: (points: readonly Point[], chain: number) => number): Promise<number> {
    let chain = 1;
    let totalDamage = 0;
    let specials = [...forcedSpecials];
    while (true) {
      const matches = this.findMatches();
      const removeSet = new Map<string, Point>();
      const specialQueue: { x: number; y: number; type: TileType }[] = [];

      for (const point of specials) {
        const tile = this.tileAt(point);
        if (tile) specialQueue.push({ ...point, type: tile.type });
      }
      specials = [];

      for (const match of matches) {
        for (const point of match.points) removeSet.set(this.key(point), point);
        this.promoteSpecialTile(match, removeSet);
      }

      for (const match of matches) {
        for (const point of match.points) {
          const tile = this.tileAt(point);
          if (tile && tile.type !== TileType.Normal && removeSet.has(this.key(point))) {
            specialQueue.push({ ...point, type: tile.type });
          }
        }
      }

      for (const special of specialQueue) this.collectSpecial(special, removeSet);
      if (removeSet.size === 0) break;

      const removed = [...removeSet.values()];
      const damage = damageFor(removed, chain);
      totalDamage += damage;
      await onStep({ chain, removed, damage });
      for (const point of removed) this.grid[point.y]![point.x] = null;
      this.applyGravity();
      chain += 1;
    }
    return totalDamage;
  }

  ensurePlayable(): boolean {
    if (this.hasMove()) return false;
    this.shuffleUntilPlayable();
    return true;
  }

  findMatches(): MatchGroup[] {
    return [...this.findHorizontalMatches(), ...this.findVerticalMatches()];
  }

  hasMove(): boolean {
    const points = this.enabledPoints();
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i]!;
        const b = points[j]!;
        const swapped = this.swap(a, b);
        if (!swapped) continue;
        this.swap(a, b);
        if (this.canMatchBySwapping(a, b)) return true;
      }
    }
    return false;
  }

  weakHits(points: readonly Point[]): number {
    return points.reduce((sum, point) => sum + (this.weakMap[point.y]?.[point.x]?.length ?? 0), 0);
  }

  private fill(): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.grid[y]![x] = this.isEnabled(x, y) ? this.createTile() : null;
      }
    }
  }

  private clearInitialMatches(): void {
    let guard = 0;
    while (this.findMatches().length > 0 && guard < 200) {
      for (const point of this.enabledPoints()) this.grid[point.y]![point.x] = this.createTile();
      guard += 1;
    }
  }

  private applyGravity(): void {
    for (let x = 0; x < this.width; x += 1) {
      for (let y = this.height - 1; y >= 0; y -= 1) {
        if (!this.isEnabled(x, y) || this.grid[y]![x]) continue;
        let from = y - 1;
        while (from >= 0 && (this.isPass(x, from) || (this.isEnabled(x, from) && !this.grid[from]![x]))) from -= 1;
        const fallingTile = from >= 0 ? this.grid[from]?.[x] ?? null : null;
        if (from >= 0 && this.isEnabled(x, from) && fallingTile) {
          this.grid[y]![x] = fallingTile;
          this.grid[from]![x] = null;
        } else if (this.canSpawnAbove(x, y)) {
          this.grid[y]![x] = this.createTile();
        }
      }
    }
  }

  private promoteSpecialTile(match: MatchGroup, removeSet: Map<string, Point>): void {
    const origin = match.points[Math.floor(match.points.length / 2)];
    if (!origin) return;
    const tile = this.tileAt(origin);
    if (!tile) return;
    if (match.points.length >= 5) tile.type = this.medalTypeForKind(tile.kind);
    else if (match.points.length >= 4) tile.type = match.axis === "x" ? TileType.Vertical : TileType.Horizontal;
    else return;
    removeSet.delete(this.key(origin));
  }

  private collectSpecial(special: Point & { type: TileType }, removeSet: Map<string, Point>): void {
    if (special.type === TileType.Vertical) {
      for (let y = 0; y < this.height; y += 1) if (this.grid[y]![special.x]) removeSet.set(`${special.x},${y}`, { x: special.x, y });
    } else if (special.type === TileType.Horizontal) {
      for (let x = 0; x < this.width; x += 1) if (this.grid[special.y]![x]) removeSet.set(`${x},${special.y}`, { x, y: special.y });
    } else if (this.isMedal(special.type)) {
      for (let y = special.y - 1; y <= special.y + 1; y += 1) {
        for (let x = special.x - 1; x <= special.x + 1; x += 1) {
          if (this.grid[y]?.[x]) removeSet.set(`${x},${y}`, { x, y });
        }
      }
    }
  }

  private findHorizontalMatches(): MatchGroup[] {
    const matches: MatchGroup[] = [];
    for (let y = 0; y < this.height; y += 1) {
      let run: Point[] = [];
      for (let x = 0; x <= this.width; x += 1) {
        const tile = x < this.width ? this.grid[y]![x] : null;
        const first = run[0] ? this.grid[run[0].y]![run[0].x] : null;
        if (tile && first && this.isEnabled(x, y) && tile.kind === first.kind) run.push({ x, y });
        else {
          if (run.length >= 3) matches.push({ axis: "x", points: run });
          run = tile && this.isEnabled(x, y) ? [{ x, y }] : [];
        }
      }
    }
    return matches;
  }

  private findVerticalMatches(): MatchGroup[] {
    const matches: MatchGroup[] = [];
    for (let x = 0; x < this.width; x += 1) {
      let run: Point[] = [];
      for (let y = 0; y <= this.height; y += 1) {
        const tile = y < this.height ? this.grid[y]![x] : null;
        const first = run[0] ? this.grid[run[0].y]![run[0].x] : null;
        if (tile && first && this.isEnabled(x, y) && tile.kind === first.kind) run.push({ x, y });
        else {
          if (run.length >= 3) matches.push({ axis: "y", points: run });
          run = tile && this.isEnabled(x, y) ? [{ x, y }] : [];
        }
      }
    }
    return matches;
  }

  private canMatchBySwapping(a: Point, b: Point): boolean {
    const swapped = this.swap(a, b);
    if (!swapped) return false;
    const matched = this.findMatches().length > 0;
    this.swap(a, b);
    return matched;
  }

  private shuffleUntilPlayable(): void {
    let guard = 0;
    while (!this.hasMove() && guard < 200) {
      const tiles = this.enabledPoints().map((point) => this.grid[point.y]![point.x]).filter((tile): tile is Tile => tile !== null);
      for (let i = tiles.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
      }
      let index = 0;
      for (const point of this.enabledPoints()) this.grid[point.y]![point.x] = tiles[index++] ?? this.createTile();
      guard += 1;
    }
  }

  private enabledPoints(): Point[] {
    const points: Point[] = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) if (this.grid[y]![x]) points.push({ x, y });
    }
    return points;
  }

  private buildShapes(stage: StageDefinition): ShapeCell[][] {
    return stage.shape.map((line) => [...line].map((char) => ({ enabled: char !== "X" && char !== "x", spawn: char === "n", pass: char === "x" })));
  }

  private buildWeakMap(stage: StageDefinition): number[][][] {
    const map = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => [] as number[]));
    stage.info.forEach((line, y) => {
      [...line].forEach((char, x) => {
        if (char >= "A" && char <= "Z") map[y]![x]!.push(char.toLowerCase().charCodeAt(0) - 97);
      });
    });
    return map;
  }

  private canSpawnAbove(x: number, y: number): boolean {
    for (let row = y; row >= 0; row -= 1) {
      if (this.shapes[row]![x]!.spawn) return true;
      if (!this.shapes[row]![x]!.enabled && !this.shapes[row]![x]!.pass) return false;
    }
    return false;
  }

  private isEnabled(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && this.shapes[y]![x]!.enabled;
  }

  private isPass(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && this.shapes[y]![x]!.pass;
  }

  private createTile(): Tile {
    return { kind: Math.floor(Math.random() * this.stage.kinds), type: TileType.Normal };
  }

  private medalTypeForKind(kind: number): TileType {
    return [TileType.Medal0, TileType.Medal1, TileType.Medal2][kind % 3]!;
  }

  private isMedal(type: TileType): boolean {
    return type === TileType.Medal0 || type === TileType.Medal1 || type === TileType.Medal2;
  }

  private key(point: Point): string {
    return `${point.x},${point.y}`;
  }
}
