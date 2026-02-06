const GRID_SIZE = 20;
const CELL = 21; // canvas 420px / 20
const BASE_TICK_MS = 200;
const MIN_TICK_MS = 50;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");
const scorePopEl = document.getElementById("scorePop");

const mobileControls = document.querySelectorAll(".mobile-controls button[data-dir]");

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

function createInitialState() {
  const mid = Math.floor(GRID_SIZE / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return {
    snake,
    direction: "right",
    pendingDirection: "right",
    food: spawnFood(snake),
    foodPlacedAt: Date.now(),
    score: 0,
    running: false,
    gameOver: false,
  };
}

function spawnFood(snake) {
  const occupied = new Set(snake.map((seg) => `${seg.x},${seg.y}`));
  const open = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) open.push({ x, y });
    }
  }
  if (open.length === 0) return null;
  const idx = Math.floor(Math.random() * open.length);
  return open[idx];
}

function isOpposite(a, b) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function step(state) {
  const nextDir = state.pendingDirection;
  if (!isOpposite(state.direction, nextDir)) {
    state.direction = nextDir;
  }

  const head = state.snake[0];
  const delta = DIRECTIONS[state.direction];
  const next = {
    x: (head.x + delta.x + GRID_SIZE) % GRID_SIZE,
    y: (head.y + delta.y + GRID_SIZE) % GRID_SIZE,
  };

  for (let i = 0; i < state.snake.length; i += 1) {
    const seg = state.snake[i];
    if (seg.x === next.x && seg.y === next.y) {
      state.gameOver = true;
      state.running = false;
      return state;
    }
  }

  state.snake.unshift(next);

  if (state.food && next.x === state.food.x && next.y === state.food.y) {
    state.score += 1;
    state.food = spawnFood(state.snake);
    state.foodPlacedAt = Date.now();
  } else {
    state.snake.pop();
  }

  if (!state.food) {
    state.gameOver = true;
    state.running = false;
  }

  return state;
}

function draw(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = state.snake.length >= 8 ? "#15101a" : "#0f1219";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let i = 1; i < GRID_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  if (state.food) {
    ctx.fillStyle = "#f25f5c";
    ctx.beginPath();
    ctx.arc(
      state.food.x * CELL + CELL / 2,
      state.food.y * CELL + CELL / 2,
      (CELL - 6) / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const length = state.snake.length;
  state.snake.forEach((seg, idx) => {
    const hue = (length * 37 + idx * 97) % 360;
    const light = length >= 8 ? 62 : 56;
    ctx.fillStyle = `hsl(${hue} 70% ${light}%)`;
    ctx.fillRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4);
  });
}

let state = createInitialState();
let timerId = null;
let currentTickMs = BASE_TICK_MS;
let lastScore = 0;

function tickMsForLength(length) {
  if (length < 8) return BASE_TICK_MS;
  const speedup = length - 8;
  const next = BASE_TICK_MS - speedup * 12;
  return Math.max(MIN_TICK_MS, next);
}

function updateOverlay() {
  if (state.gameOver) {
    overlayEl.textContent = "Game Over. Hit Space to restart";
    overlayEl.classList.add("visible");
    return;
  }
  if (!state.running) {
    overlayEl.textContent = "Hit Space to start";
    overlayEl.classList.add("visible");
    return;
  }
  overlayEl.classList.remove("visible");
}

function updateScore() {
  scoreEl.textContent = `Score: ${state.score}`;
}

function showScorePop(scoreValue) {
  scorePopEl.textContent = `+${scoreValue}`;
  scorePopEl.classList.remove("show");
  void scorePopEl.offsetWidth;
  scorePopEl.classList.add("show");
}

function tick() {
  if (!state.running) return;
  if (state.score >= 20 && state.food && Date.now() - state.foodPlacedAt >= 5000) {
    state.food = spawnFood(state.snake);
    state.foodPlacedAt = Date.now();
  }
  state = step(state);
  const nextTick = tickMsForLength(state.snake.length);
  if (nextTick !== currentTickMs) {
    currentTickMs = nextTick;
    clearInterval(timerId);
    timerId = setInterval(tick, currentTickMs);
  }
  if (state.score !== lastScore) {
    if (state.score > 0 && state.score % 5 === 0) {
      showScorePop(state.score);
    }
    lastScore = state.score;
  }
  updateScore();
  updateOverlay();
  draw(state);
}

function start() {
  if (state.gameOver) return;
  state.running = true;
  updateOverlay();
}

function restart() {
  state = createInitialState();
  currentTickMs = BASE_TICK_MS;
  clearInterval(timerId);
  timerId = setInterval(tick, currentTickMs);
  lastScore = 0;
  updateScore();
  updateOverlay();
  draw(state);
}

function setDirection(dir) {
  if (!dir || isOpposite(state.direction, dir)) return;
  state.pendingDirection = dir;
}

function handleKey(event) {
  if (event.key === " ") {
    event.preventDefault();
    if (state.running) {
      restart();
      start();
      return;
    }
    if (state.gameOver) {
      restart();
      start();
      return;
    }
    start();
    return;
  }
  const dir = KEY_MAP[event.key];
  if (dir) {
    event.preventDefault();
    if (!state.running && !state.gameOver) start();
    setDirection(dir);
  }
}

mobileControls.forEach((btn) => {
  btn.addEventListener("click", () => {
    const dir = btn.dataset.dir;
    if (!state.running && !state.gameOver) start();
    setDirection(dir);
  });
});

window.addEventListener("keydown", handleKey);

restart();
