import { TileType } from "../domain/types.js";
export class GameView {
    boardEl = this.requiredElement("board");
    enemyRowEl = this.requiredElement("enemyRow");
    stageSelectEl = this.requiredElement("stageSelect");
    scoreEl = this.requiredElement("score");
    hpFillEl = this.requiredElement("hpFill");
    hpTextEl = this.requiredElement("hpText");
    turnTextEl = this.requiredElement("turnText");
    messageEl = this.requiredElement("message");
    resetButton = this.requiredElement("resetButton");
    bind(handlers) {
        this.boardEl.addEventListener("pointerdown", (event) => {
            const tile = event.target.closest(".tile");
            if (!tile)
                return;
            handlers.onTileSelected({ x: Number(tile.dataset.x), y: Number(tile.dataset.y) });
        });
        this.stageSelectEl.addEventListener("change", () => handlers.onStageChanged(Number(this.stageSelectEl.value)));
        this.resetButton.addEventListener("click", handlers.onReset);
    }
    setStages(stages) {
        this.stageSelectEl.replaceChildren(...stages.map((stage, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = stage.name;
            return option;
        }));
    }
    setSelectedStage(index) {
        this.stageSelectEl.value = String(index);
    }
    render(state) {
        this.renderBoard(state.board);
        this.renderEnemies(state.enemies);
        this.scoreEl.textContent = String(state.score);
        this.turnTextEl.textContent = String(state.turn);
        this.hpTextEl.textContent = `${state.hp} / ${state.maxHp}`;
        this.hpFillEl.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
    }
    setMessage(text) {
        this.messageEl.textContent = text;
    }
    animateRemoval(points) {
        for (const point of points) {
            this.boardEl.querySelector(`.tile[data-x="${point.x}"][data-y="${point.y}"]`)?.classList.add("removing");
        }
    }
    renderBoard(board) {
        this.boardEl.style.setProperty("--cols", String(board.width));
        this.boardEl.style.setProperty("--rows", String(board.height));
        const cells = [];
        for (let y = 0; y < board.height; y += 1) {
            for (let x = 0; x < board.width; x += 1) {
                const cell = document.createElement("div");
                const shape = board.shapes[y][x];
                cell.className = `cell${shape.enabled ? "" : shape.pass ? " pass" : " disabled"}`;
                if (board.weakMap[y]?.[x]?.length)
                    cell.appendChild(this.createWeakMarker());
                const tile = board.grid[y][x];
                if (tile)
                    cell.appendChild(this.createTile(tile, { x, y }, board.selected));
                cells.push(cell);
            }
        }
        this.boardEl.replaceChildren(...cells);
    }
    renderEnemies(enemies) {
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
    createTile(tile, point, selected) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = this.tileClass(tile, point, selected);
        button.dataset.x = String(point.x);
        button.dataset.y = String(point.y);
        button.setAttribute("aria-label", `block ${point.x},${point.y}`);
        return button;
    }
    tileClass(tile, point, selected) {
        const classes = ["tile", `kind-${tile.kind}`];
        if (tile.type === TileType.Vertical)
            classes.push("vertical");
        if (tile.type === TileType.Horizontal)
            classes.push("horizontal");
        if (tile.type.startsWith("medal"))
            classes.push("medal");
        if (selected && selected.x === point.x && selected.y === point.y)
            classes.push("selected");
        return classes.join(" ");
    }
    createWeakMarker() {
        const marker = document.createElement("span");
        marker.className = "weak";
        return marker;
    }
    requiredElement(id) {
        const element = document.getElementById(id);
        if (!element)
            throw new Error(`Missing #${id}`);
        return element;
    }
}
