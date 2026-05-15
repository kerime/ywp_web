"use strict";

const BLOCK_CONCURRENT_ADJUST = 0.1;
const BLOCK_COMBO_ADJUST = 0.1;
const TYPE = {
  normal: "normal",
  vertical: "vertical",
  horizontal: "horizontal",
  medal0: "medal0",
  medal1: "medal1",
  medal2: "medal2",
};

const stages = [
  {
    id: 1,
    name: "Stage 0001",
    kinds: 5,
    enemyHp: [5000],
    enemyAtk: [270],
    enemyTurn: [3],
    shape: [
      "nnnnnnnn",
      "________",
      "__xxx___",
      "__xxx___",
      "__xxx___",
      "________",
      "________",
      "________",
    ],
    info: [
      "________",
      "________",
      "__aaa___",
      "__aAa___",
      "__aaa___",
      "________",
      "________",
      "________",
    ],
  },
  {
    id: 2,
    name: "Stage 0002",
    kinds: 4,
    enemyHp: [1000, 5000, 1000, 5000],
    enemyAtk: [90, 270, 90, 270],
    enemyTurn: [2, 2, 2, 2],
    shape: [
      "XXXnnnXXX",
      "XXX___XXX",
      "XXX___XXX",
      "nnn___nnn",
      "_________",
      "_________",
      "XXX___XXX",
      "XXX___XXX",
      "XXX___XXX",
    ],
    info: [
      "aaa___bbb",
      "aAa___bBb",
      "aaa___bbb",
      "_________",
      "_________",
      "_________",
      "ccc___ddd",
      "cCc___dDd",
      "ccc___ddd",
    ],
  },
  {
    id: 3,
    name: "Stage 0003",
    kinds: 4,
    enemyHp: [6000],
    enemyAtk: [270],
    enemyTurn: [4],
    shape: [
      "XXXXXXXXX",
      "XXXXXXXXX",
      "XXXXXXXXX",
      "nnnnnnnnn",
      "_X_____X_",
      "_X_____X_",
      "_X_____X_",
      "_X_____X_",
      "_________",
    ],
    info: [
      "aaaaaaaaa",
      "aAaaaaaAa",
      "aaaaaaaaa",
      "_________",
      "_________",
      "_________",
      "_________",
      "_________",
      "_________",
    ],
  },
  {
    id: 4,
    name: "Stage 0004",
    kinds: 5,
    enemyHp: [1000, 1000, 1000],
    enemyAtk: [75, 75, 75],
    enemyTurn: [1, 1, 1],
    shape: [
      "nnnnnnnnn",
      "_________",
      "_X____X__",
      "_X____X__",
      "_________",
      "_________",
      "XXXXXXXXX",
      "XXXXXXXXX",
      "XXXXXXXXX",
    ],
    info: [
      "_________",
      "_________",
      "_________",
      "_________",
      "_________",
      "_________",
      "aaabbbccc",
      "aAabBbcCc",
      "aaabbbccc",
    ],
  },
  {
    id: 5,
    name: "Stage 0005",
    kinds: 4,
    enemyHp: [1200, 1200, 1200, 1200],
    enemyAtk: [100, 100, 100, 100],
    enemyTurn: [2, 2, 2, 2],
    shape: [
      "XXXnnnXXX",
      "XXX___XXX",
      "XXX___XXX",
      "nnn___nnn",
      "_________",
      "_________",
      "XXX___XXX",
      "XXX___XXX",
      "XXX___XXX",
    ],
    info: [],
  },
];

const friends = [
  { name: "Jibanyan", kind: 0, atk: 220 },
  { name: "Shishimaru", kind: 2, atk: 200 },
  { name: "Onigiri", kind: 1, atk: 220 },
];

const boardEl = document.getElementById("board");
const enemyRowEl = document.getElementById("enemyRow");
const stageSelectEl = document.getElementById("stageSelect");
const scoreEl = document.getElementById("score");
const hpFillEl = document.getElementById("hpFill");
const hpTextEl = document.getElementById("hpText");
const turnTextEl = document.getElementById("turnText");
const messageEl = document.getElementById("message");
const resetButton = document.getElementById("resetButton");

let state;

function randomKind() {
  return Math.floor(Math.random() * state.stage.kinds);
}

function cloneTile(tile) {
  return tile ? { kind: tile.kind, type: tile.type } : null;
}

function isEnabled(x, y) {
  return x >= 0 && x < state.width && y >= 0 && y < state.height && state.shapes[y][x].enabled;
}

function isPass(x, y) {
  return x >= 0 && x < state.width && y >= 0 && y < state.height && state.shapes[y][x].pass;
}

function buildShapes(stage) {
  return stage.shape.map((line) => [...line].map((ch) => ({
    enabled: ch !== "X" && ch !== "x",
    spawn: ch === "n",
    pass: ch === "x",
  })));
}

function weakMap(stage, width, height) {
  const map = Array.from({ length: height }, () => Array.from({ length: width }, () => []));
  if (!stage.info.length) return map;

  stage.info.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch >= "A" && ch <= "Z") {
        map[y][x].push(ch.toLowerCase().charCodeAt(0) - 97);
      }
    });
  });
  return map;
}

function setupStage(stageIndex) {
  const stage = stages[stageIndex];
  const height = stage.shape.length;
  const width = Math.max(...stage.shape.map((line) => line.length));
  state = {
    stage,
    width,
    height,
    shapes: buildShapes(stage),
    weak: weakMap(stage, width, height),
    grid: Array.from({ length: height }, () => Array.from({ length: width }, () => null)),
    selected: null,
    locked: false,
    score: 0,
    turn: 1,
    maxHp: 390,
    hp: 390,
    enemies: stage.enemyHp.map((hp, i) => ({
      name: `Enemy ${i + 1}`,
      hp,
      maxHp: hp,
      atk: stage.enemyAtk[i] || 100,
      turn: stage.enemyTurn[i] || 2,
      wait: stage.enemyTurn[i] || 2,
      dead: false,
    })),
  };

  boardEl.style.setProperty("--cols", width);
  boardEl.style.setProperty("--rows", height);
  fillBoard();
  shuffleUntilPlayable();
  clearInitialMatches();
  render();
  setMessage("ブロックを選んで、別のブロックへ入れ替え");
}

function fillBoard() {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      state.grid[y][x] = isEnabled(x, y) ? { kind: randomKind(), type: TYPE.normal } : null;
    }
  }
}

function clearInitialMatches() {
  let guard = 0;
  while (findMatches().length && guard < 200) {
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.grid[y][x]) state.grid[y][x] = { kind: randomKind(), type: TYPE.normal };
      }
    }
    guard++;
  }
}

function shuffleUntilPlayable() {
  let guard = 0;
  while (!hasMove() && guard < 200) {
    const tiles = [];
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.grid[y][x]) tiles.push(state.grid[y][x]);
      }
    }
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    let idx = 0;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.grid[y][x]) state.grid[y][x] = tiles[idx++];
      }
    }
    guard++;
  }
}

function render() {
  boardEl.innerHTML = "";
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = document.createElement("div");
      const shape = state.shapes[y][x];
      cell.className = `cell${shape.enabled ? "" : shape.pass ? " pass" : " disabled"}`;
      cell.dataset.x = x;
      cell.dataset.y = y;

      if (state.weak[y][x]?.length) {
        const weak = document.createElement("span");
        weak.className = "weak";
        cell.appendChild(weak);
      }

      const tile = state.grid[y][x];
      if (tile) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = tileClass(tile, x, y);
        button.dataset.x = x;
        button.dataset.y = y;
        button.setAttribute("aria-label", `block ${x},${y}`);
        cell.appendChild(button);
      }
      boardEl.appendChild(cell);
    }
  }

  enemyRowEl.innerHTML = "";
  state.enemies.forEach((enemy) => {
    const card = document.createElement("article");
    card.className = `enemy${enemy.dead ? " dead" : ""}`;
    card.innerHTML = `
      <div class="enemy-face"></div>
      <div>
        <div class="enemy-name">${enemy.name}</div>
        <div class="hpbar"><span style="width:${Math.max(0, enemy.hp / enemy.maxHp * 100)}%"></span></div>
        <div class="mini">HP ${enemy.hp} / ${enemy.maxHp}</div>
        <div class="mini">TURN ${enemy.wait} / ATK ${enemy.atk}</div>
      </div>`;
    enemyRowEl.appendChild(card);
  });

  scoreEl.textContent = state.score;
  turnTextEl.textContent = state.turn;
  hpTextEl.textContent = `${state.hp} / ${state.maxHp}`;
  hpFillEl.style.width = `${Math.max(0, state.hp / state.maxHp * 100)}%`;
}

function tileClass(tile, x, y) {
  const classes = ["tile", `kind-${tile.kind}`];
  if (tile.type === TYPE.vertical) classes.push("vertical");
  if (tile.type === TYPE.horizontal) classes.push("horizontal");
  if (tile.type.startsWith("medal")) classes.push("medal");
  if (state.selected && state.selected.x === x && state.selected.y === y) classes.push("selected");
  return classes.join(" ");
}

function setMessage(text) {
  messageEl.textContent = text;
}

function onBoardPointerDown(event) {
  const tile = event.target.closest(".tile");
  if (!tile || state.locked) return;

  const point = { x: Number(tile.dataset.x), y: Number(tile.dataset.y) };
  if (!state.selected) {
    state.selected = point;
    markSelected();
    return;
  }

  if (state.selected.x === point.x && state.selected.y === point.y) {
    state.selected = null;
    markSelected();
    return;
  }

  swapAndResolve(state.selected, point);
}

function markSelected() {
  document.querySelectorAll(".tile.selected").forEach((el) => el.classList.remove("selected"));
  if (!state.selected) return;
  const selected = boardEl.querySelector(`.tile[data-x="${state.selected.x}"][data-y="${state.selected.y}"]`);
  selected?.classList.add("selected");
}

async function swapAndResolve(a, b) {
  if (!isEnabled(a.x, a.y) || !isEnabled(b.x, b.y)) return;
  state.locked = true;
  state.selected = null;

  const first = state.grid[a.y][a.x];
  const second = state.grid[b.y][b.x];
  state.grid[a.y][a.x] = second;
  state.grid[b.y][b.x] = first;
  render();
  await wait(120);

  const hadSpecialCombo = first.type !== TYPE.normal && second.type !== TYPE.normal;
  if (!findMatches().length && !hadSpecialCombo) {
    setMessage("消せる組み合わせではありません");
    await wait(240);
    state.grid[a.y][a.x] = first;
    state.grid[b.y][b.x] = second;
    state.locked = false;
    render();
    return;
  }

  await resolveBoard(hadSpecialCombo ? [a, b] : []);
  endTurn();
  state.locked = false;
  render();
}

async function resolveBoard(forcedSpecials = []) {
  let chain = 1;
  let totalDamage = 0;
  while (true) {
    const matches = findMatches();
    const removeSet = new Map();
    const specials = [];

    for (const point of forcedSpecials) {
      const tile = state.grid[point.y]?.[point.x];
      if (tile) specials.push({ x: point.x, y: point.y, type: tile.type });
    }
    forcedSpecials = [];

    for (const match of matches) {
      for (const point of match.points) {
        removeSet.set(key(point), point);
      }

      const origin = match.points[Math.floor(match.points.length / 2)];
      const originTile = state.grid[origin.y][origin.x];
      if (match.points.length >= 5) {
        originTile.type = medalTypeForKind(originTile.kind);
        removeSet.delete(key(origin));
      } else if (match.points.length >= 4) {
        originTile.type = match.axis === "x" ? TYPE.vertical : TYPE.horizontal;
        removeSet.delete(key(origin));
      }
    }

    for (const match of matches) {
      for (const point of match.points) {
        const tile = state.grid[point.y][point.x];
        if (tile && tile.type !== TYPE.normal && removeSet.has(key(point))) {
          specials.push({ x: point.x, y: point.y, type: tile.type });
        }
      }
    }

    for (const special of specials) {
      collectSpecial(special, removeSet);
    }

    if (!removeSet.size) break;

    const removed = [...removeSet.values()];
    const damage = calcDamage(removed, chain);
    totalDamage += damage;
    state.score += 100 * chain + removed.length * 25;
    setMessage(`${chain} combo / ${removed.length} blocks / ${damage} damage`);

    animateRemoval(removed);
    await wait(220);
    for (const point of removed) {
      state.grid[point.y][point.x] = null;
    }
    applyGravity();
    render();
    await wait(170);
    chain++;
  }

  if (totalDamage > 0) {
    damageEnemy(totalDamage);
  }
}

function findMatches() {
  const matches = [];
  for (let y = 0; y < state.height; y++) {
    let run = [];
    for (let x = 0; x <= state.width; x++) {
      const tile = x < state.width ? state.grid[y][x] : null;
      if (tile && isEnabled(x, y) && run.length && state.grid[y][run[0].x].kind === tile.kind) {
        run.push({ x, y });
      } else {
        if (run.length >= 3) matches.push({ axis: "x", points: run });
        run = tile && isEnabled(x, y) ? [{ x, y }] : [];
      }
    }
  }

  for (let x = 0; x < state.width; x++) {
    let run = [];
    for (let y = 0; y <= state.height; y++) {
      const tile = y < state.height ? state.grid[y][x] : null;
      if (tile && isEnabled(x, y) && run.length && state.grid[run[0].y][x].kind === tile.kind) {
        run.push({ x, y });
      } else {
        if (run.length >= 3) matches.push({ axis: "y", points: run });
        run = tile && isEnabled(x, y) ? [{ x, y }] : [];
      }
    }
  }
  return matches;
}

function collectSpecial(special, removeSet) {
  if (special.type === TYPE.vertical) {
    for (let y = 0; y < state.height; y++) {
      if (state.grid[y][special.x]) removeSet.set(`${special.x},${y}`, { x: special.x, y });
    }
  } else if (special.type === TYPE.horizontal) {
    for (let x = 0; x < state.width; x++) {
      if (state.grid[special.y][x]) removeSet.set(`${x},${special.y}`, { x, y: special.y });
    }
  } else if (special.type.startsWith("medal")) {
    for (let y = special.y - 1; y <= special.y + 1; y++) {
      for (let x = special.x - 1; x <= special.x + 1; x++) {
        if (state.grid[y]?.[x]) removeSet.set(`${x},${y}`, { x, y });
      }
    }
  }
}

function calcDamage(points, chain) {
  const byKind = new Map();
  for (const point of points) {
    const tile = state.grid[point.y][point.x];
    if (!tile) continue;
    byKind.set(tile.kind, (byKind.get(tile.kind) || 0) + 1);
  }

  let total = 0;
  for (const friend of friends) {
    const count = byKind.get(friend.kind) || 0;
    if (count > 0) {
      total += friend.atk * (1 + (count - 3) * BLOCK_CONCURRENT_ADJUST + (chain - 1) * BLOCK_COMBO_ADJUST);
    }
  }

  let weakHits = 0;
  for (const point of points) {
    weakHits += state.weak[point.y]?.[point.x]?.length || 0;
  }
  return Math.max(0, Math.round(total + weakHits * 80));
}

function applyGravity() {
  for (let x = 0; x < state.width; x++) {
    for (let y = state.height - 1; y >= 0; y--) {
      if (!isEnabled(x, y) || state.grid[y][x]) continue;

      let from = y - 1;
      while (from >= 0 && (isPass(x, from) || (isEnabled(x, from) && !state.grid[from][x]))) from--;
      if (from >= 0 && isEnabled(x, from) && state.grid[from][x]) {
        state.grid[y][x] = state.grid[from][x];
        state.grid[from][x] = null;
      } else if (canSpawnAbove(x, y)) {
        state.grid[y][x] = { kind: randomKind(), type: TYPE.normal };
      }
    }
  }
}

function canSpawnAbove(x, y) {
  for (let yy = y; yy >= 0; yy--) {
    if (state.shapes[yy][x].spawn) return true;
    if (!state.shapes[yy][x].enabled && !state.shapes[yy][x].pass) return false;
  }
  return false;
}

function endTurn() {
  state.turn++;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.wait--;
    if (enemy.wait <= 0) {
      state.hp = Math.max(0, state.hp - enemy.atk);
      enemy.wait = enemy.turn;
      setMessage(`Enemy attack / ${enemy.atk} damage`);
    }
  }
  if (state.hp <= 0) {
    state.locked = true;
    setMessage("LOSE");
  } else if (state.enemies.every((enemy) => enemy.dead)) {
    state.locked = true;
    setMessage("WIN");
  } else if (!hasMove()) {
    shuffleUntilPlayable();
    setMessage("SHUFFLE");
  }
}

function damageEnemy(amount) {
  const target = state.enemies.filter((enemy) => !enemy.dead).sort((a, b) => a.hp - b.hp)[0];
  if (!target) return;
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp <= 0) target.dead = true;
}

function hasMove() {
  const points = [];
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.grid[y][x]) points.push({ x, y });
    }
  }
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      const t = state.grid[a.y][a.x];
      state.grid[a.y][a.x] = state.grid[b.y][b.x];
      state.grid[b.y][b.x] = t;
      const ok = findMatches().length > 0;
      state.grid[b.y][b.x] = state.grid[a.y][a.x];
      state.grid[a.y][a.x] = t;
      if (ok) return true;
    }
  }
  return false;
}

function medalTypeForKind(kind) {
  return [TYPE.medal0, TYPE.medal1, TYPE.medal2][kind % 3];
}

function animateRemoval(points) {
  for (const point of points) {
    const el = boardEl.querySelector(`.tile[data-x="${point.x}"][data-y="${point.y}"]`);
    el?.classList.add("removing");
  }
}

function key(point) {
  return `${point.x},${point.y}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

stages.forEach((stage, index) => {
  const option = document.createElement("option");
  option.value = index;
  option.textContent = stage.name;
  stageSelectEl.appendChild(option);
});

boardEl.addEventListener("pointerdown", onBoardPointerDown);
stageSelectEl.addEventListener("change", () => setupStage(Number(stageSelectEl.value)));
resetButton.addEventListener("click", () => setupStage(Number(stageSelectEl.value)));

setupStage(0);
