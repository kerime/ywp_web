import { TileType } from "./types.js";
export class PuzzleBoard {
    stage;
    width;
    height;
    shapes;
    weakMap;
    grid;
    selected = null;
    constructor(stage) {
        this.stage = stage;
        this.height = stage.shape.length;
        this.width = Math.max(...stage.shape.map((line) => line.length));
        this.shapes = this.buildShapes(stage);
        this.weakMap = this.buildWeakMap(stage);
        this.grid = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => null));
        this.fill();
        this.shuffleUntilPlayable();
        this.clearInitialMatches();
    }
    snapshot() {
        return {
            width: this.width,
            height: this.height,
            shapes: this.shapes,
            weakMap: this.weakMap,
            grid: this.grid,
            selected: this.selected,
        };
    }
    select(point) {
        this.selected = point;
    }
    tileAt(point) {
        return this.grid[point.y]?.[point.x] ?? null;
    }
    canUse(point) {
        return this.isEnabled(point.x, point.y) && this.tileAt(point) !== null;
    }
    swap(a, b) {
        const first = this.tileAt(a);
        const second = this.tileAt(b);
        if (!first || !second)
            return null;
        this.grid[a.y][a.x] = second;
        this.grid[b.y][b.x] = first;
        return {
            first,
            second,
            specialCombo: first.type !== TileType.Normal && second.type !== TileType.Normal,
        };
    }
    hasMatches() {
        return this.findMatches().length > 0;
    }
    async resolve(forcedSpecials, onStep, damageFor) {
        let chain = 1;
        let totalDamage = 0;
        let specials = [...forcedSpecials];
        while (true) {
            const matches = this.findMatches();
            const removeSet = new Map();
            const specialQueue = [];
            for (const point of specials) {
                const tile = this.tileAt(point);
                if (tile)
                    specialQueue.push({ ...point, type: tile.type });
            }
            specials = [];
            for (const match of matches) {
                for (const point of match.points)
                    removeSet.set(this.key(point), point);
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
            for (const special of specialQueue)
                this.collectSpecial(special, removeSet);
            if (removeSet.size === 0)
                break;
            const removed = [...removeSet.values()];
            const damage = damageFor(removed, chain);
            totalDamage += damage;
            await onStep({ chain, removed, damage });
            for (const point of removed)
                this.grid[point.y][point.x] = null;
            this.applyGravity();
            chain += 1;
        }
        return totalDamage;
    }
    ensurePlayable() {
        if (this.hasMove())
            return false;
        this.shuffleUntilPlayable();
        return true;
    }
    findMatches() {
        return [...this.findHorizontalMatches(), ...this.findVerticalMatches()];
    }
    hasMove() {
        const points = this.enabledPoints();
        for (let i = 0; i < points.length; i += 1) {
            for (let j = i + 1; j < points.length; j += 1) {
                const a = points[i];
                const b = points[j];
                const swapped = this.swap(a, b);
                if (!swapped)
                    continue;
                this.swap(a, b);
                if (this.canMatchBySwapping(a, b))
                    return true;
            }
        }
        return false;
    }
    weakHits(points) {
        return points.reduce((sum, point) => sum + (this.weakMap[point.y]?.[point.x]?.length ?? 0), 0);
    }
    fill() {
        for (let y = 0; y < this.height; y += 1) {
            for (let x = 0; x < this.width; x += 1) {
                this.grid[y][x] = this.isEnabled(x, y) ? this.createTile() : null;
            }
        }
    }
    clearInitialMatches() {
        let guard = 0;
        while (this.findMatches().length > 0 && guard < 200) {
            for (const point of this.enabledPoints())
                this.grid[point.y][point.x] = this.createTile();
            guard += 1;
        }
    }
    applyGravity() {
        for (let x = 0; x < this.width; x += 1) {
            for (let y = this.height - 1; y >= 0; y -= 1) {
                if (!this.isEnabled(x, y) || this.grid[y][x])
                    continue;
                let from = y - 1;
                while (from >= 0 && (this.isPass(x, from) || (this.isEnabled(x, from) && !this.grid[from][x])))
                    from -= 1;
                const fallingTile = from >= 0 ? this.grid[from]?.[x] ?? null : null;
                if (from >= 0 && this.isEnabled(x, from) && fallingTile) {
                    this.grid[y][x] = fallingTile;
                    this.grid[from][x] = null;
                }
                else if (this.canSpawnAbove(x, y)) {
                    this.grid[y][x] = this.createTile();
                }
            }
        }
    }
    promoteSpecialTile(match, removeSet) {
        const origin = match.points[Math.floor(match.points.length / 2)];
        if (!origin)
            return;
        const tile = this.tileAt(origin);
        if (!tile)
            return;
        if (match.points.length >= 5)
            tile.type = this.medalTypeForKind(tile.kind);
        else if (match.points.length >= 4)
            tile.type = match.axis === "x" ? TileType.Vertical : TileType.Horizontal;
        else
            return;
        removeSet.delete(this.key(origin));
    }
    collectSpecial(special, removeSet) {
        if (special.type === TileType.Vertical) {
            for (let y = 0; y < this.height; y += 1)
                if (this.grid[y][special.x])
                    removeSet.set(`${special.x},${y}`, { x: special.x, y });
        }
        else if (special.type === TileType.Horizontal) {
            for (let x = 0; x < this.width; x += 1)
                if (this.grid[special.y][x])
                    removeSet.set(`${x},${special.y}`, { x, y: special.y });
        }
        else if (this.isMedal(special.type)) {
            for (let y = special.y - 1; y <= special.y + 1; y += 1) {
                for (let x = special.x - 1; x <= special.x + 1; x += 1) {
                    if (this.grid[y]?.[x])
                        removeSet.set(`${x},${y}`, { x, y });
                }
            }
        }
    }
    findHorizontalMatches() {
        const matches = [];
        for (let y = 0; y < this.height; y += 1) {
            let run = [];
            for (let x = 0; x <= this.width; x += 1) {
                const tile = x < this.width ? this.grid[y][x] : null;
                const first = run[0] ? this.grid[run[0].y][run[0].x] : null;
                if (tile && first && this.isEnabled(x, y) && tile.kind === first.kind)
                    run.push({ x, y });
                else {
                    if (run.length >= 3)
                        matches.push({ axis: "x", points: run });
                    run = tile && this.isEnabled(x, y) ? [{ x, y }] : [];
                }
            }
        }
        return matches;
    }
    findVerticalMatches() {
        const matches = [];
        for (let x = 0; x < this.width; x += 1) {
            let run = [];
            for (let y = 0; y <= this.height; y += 1) {
                const tile = y < this.height ? this.grid[y][x] : null;
                const first = run[0] ? this.grid[run[0].y][run[0].x] : null;
                if (tile && first && this.isEnabled(x, y) && tile.kind === first.kind)
                    run.push({ x, y });
                else {
                    if (run.length >= 3)
                        matches.push({ axis: "y", points: run });
                    run = tile && this.isEnabled(x, y) ? [{ x, y }] : [];
                }
            }
        }
        return matches;
    }
    canMatchBySwapping(a, b) {
        const swapped = this.swap(a, b);
        if (!swapped)
            return false;
        const matched = this.findMatches().length > 0;
        this.swap(a, b);
        return matched;
    }
    shuffleUntilPlayable() {
        let guard = 0;
        while (!this.hasMove() && guard < 200) {
            const tiles = this.enabledPoints().map((point) => this.grid[point.y][point.x]).filter((tile) => tile !== null);
            for (let i = tiles.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
            }
            let index = 0;
            for (const point of this.enabledPoints())
                this.grid[point.y][point.x] = tiles[index++] ?? this.createTile();
            guard += 1;
        }
    }
    enabledPoints() {
        const points = [];
        for (let y = 0; y < this.height; y += 1) {
            for (let x = 0; x < this.width; x += 1)
                if (this.grid[y][x])
                    points.push({ x, y });
        }
        return points;
    }
    buildShapes(stage) {
        return stage.shape.map((line) => [...line].map((char) => ({ enabled: char !== "X" && char !== "x", spawn: char === "n", pass: char === "x" })));
    }
    buildWeakMap(stage) {
        const map = Array.from({ length: this.height }, () => Array.from({ length: this.width }, () => []));
        stage.info.forEach((line, y) => {
            [...line].forEach((char, x) => {
                if (char >= "A" && char <= "Z")
                    map[y][x].push(char.toLowerCase().charCodeAt(0) - 97);
            });
        });
        return map;
    }
    canSpawnAbove(x, y) {
        for (let row = y; row >= 0; row -= 1) {
            if (this.shapes[row][x].spawn)
                return true;
            if (!this.shapes[row][x].enabled && !this.shapes[row][x].pass)
                return false;
        }
        return false;
    }
    isEnabled(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && this.shapes[y][x].enabled;
    }
    isPass(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && this.shapes[y][x].pass;
    }
    createTile() {
        return { kind: Math.floor(Math.random() * this.stage.kinds), type: TileType.Normal };
    }
    medalTypeForKind(kind) {
        return [TileType.Medal0, TileType.Medal1, TileType.Medal2][kind % 3];
    }
    isMedal(type) {
        return type === TileType.Medal0 || type === TileType.Medal1 || type === TileType.Medal2;
    }
    key(point) {
        return `${point.x},${point.y}`;
    }
}
