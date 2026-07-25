E.init({ canvas: 'game', width: 480, height: 720 });

const SKY_TOP = '#75c7f2';
const SKY_BOTTOM = '#d8f6ff';
const PIPE = '#2fbf62';
const PIPE_DARK = '#188044';
const PIPE_LIGHT = '#78e08f';
const GROUND = '#d99b45';
const DIRT = '#a76734';
const INK = '#1f2937';
const GOLD = '#f6c85f';
const WHITE = '#ffffff';

const FLOOR_Y = 640;
const GRAVITY = 1450;
const FLAP = -455;
const PIPE_W = 76;
const GAP = 178;
const PIPE_SPACING = 248;

let bird;
let pipes;
let score;
let scroll;
let speed;
let clouds;
let topScores = [];
let deadReason = '';
let submitted = false;

function resetWorld() {
  bird = { x: 128, y: 300, vy: 0, r: 18, rot: 0 };
  pipes = [];
  score = 0;
  scroll = 0;
  speed = 148;
  deadReason = '';
  for (let i = 0; i < 4; i++) addPipe(560 + i * PIPE_SPACING);
  clouds = [
    { x: 52, y: 120, s: 0.95 },
    { x: 260, y: 86, s: 1.25 },
    { x: 406, y: 178, s: 0.75 },
  ];
}

function addPipe(x) {
  const minTop = 86;
  const maxTop = FLOOR_Y - GAP - 106;
  const top = minTop + Math.random() * (maxTop - minTop);
  pipes.push({ x, top, passed: false });
}

function flap() {
  bird.vy = FLAP;
  bird.rot = -0.45;
  E.sfx.jump();
  E.fx.burst(bird.x - 8, bird.y + 4, { count: 5, color: 'rgba(255,255,255,0.9)', speed: 70, life: 0.25, size: 3 });
}

function birdBox() {
  return { x: bird.x - 15, y: bird.y - 14, w: 30, h: 28 };
}

function endRun(reason) {
  if (E.sceneName !== 'play') return;
  deadReason = reason;
  E.sfx.hit();
  E.sfx.over();
  E.fx.shake(10, 0.28);
  E.fx.burst(bird.x, bird.y, { count: 18, color: GOLD, speed: 165, life: 0.6, size: 4 });
  E.best.set('flappy_best', score);
  E.go('over');
}

function drawBackground(c) {
  const g = c.createLinearGradient(0, 0, 0, FLOOR_Y);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(1, SKY_BOTTOM);
  E.draw.clear(g);

  c.fillStyle = 'rgba(255,255,255,0.72)';
  for (const cloud of clouds) drawCloud(c, cloud.x, cloud.y, cloud.s);

  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(0, 0, E.W, 120);
}

function drawCloud(c, x, y, s) {
  c.save();
  c.scale(s, s);
  const cx = x / s;
  const cy = y / s;
  E.draw.circle(cx, cy + 12, 23, 'rgba(255,255,255,0.7)');
  E.draw.circle(cx + 28, cy, 31, 'rgba(255,255,255,0.7)');
  E.draw.circle(cx + 62, cy + 15, 24, 'rgba(255,255,255,0.7)');
  E.draw.rrect(cx - 2, cy + 14, 76, 23, 12, 'rgba(255,255,255,0.7)');
  c.restore();
}

function drawPipe(c, p) {
  drawPipeSegment(c, p.x, 0, p.top, true);
  drawPipeSegment(c, p.x, p.top + GAP, FLOOR_Y - (p.top + GAP), false);
}

function drawPipeSegment(c, x, y, h, flipCap) {
  const capH = 34;
  const capY = flipCap ? y + h - capH : y;
  const bodyY = flipCap ? y : y + capH;
  const bodyH = Math.max(0, h - capH);

  E.draw.rrect(x + 8, bodyY, PIPE_W - 16, bodyH, 4, PIPE);
  c.fillStyle = PIPE_DARK;
  c.fillRect(x + PIPE_W - 22, bodyY, 10, bodyH);
  c.fillStyle = PIPE_LIGHT;
  c.fillRect(x + 18, bodyY + 8, 7, Math.max(0, bodyH - 16));
  E.draw.rrect(x - 5, capY, PIPE_W + 10, capH, 6, PIPE);
  c.fillStyle = PIPE_DARK;
  c.fillRect(x + PIPE_W - 14, capY + 4, 9, capH - 8);
  c.strokeStyle = 'rgba(0,0,0,0.16)';
  c.lineWidth = 3;
  c.strokeRect(x + 8, bodyY, PIPE_W - 16, bodyH);
}

function drawBird(c) {
  c.save();
  c.translate(bird.x, bird.y);
  c.rotate(bird.rot);
  E.draw.circle(0, 0, bird.r + 3, '#f3b23a');
  E.draw.circle(4, -3, bird.r, GOLD);

  c.fillStyle = '#ffe3a1';
  c.beginPath();
  c.ellipse(-9, 7, 13, 8, -0.25, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#f06b45';
  c.beginPath();
  c.moveTo(17, -2);
  c.lineTo(38, 5);
  c.lineTo(17, 12);
  c.closePath();
  c.fill();

  E.draw.circle(9, -9, 5, WHITE);
  E.draw.circle(11, -9, 2.2, INK);
  c.restore();
}

function drawGround(c) {
  E.draw.rrect(0, FLOOR_Y, E.W, E.H - FLOOR_Y, 0, GROUND);
  c.fillStyle = '#f1c36d';
  c.fillRect(0, FLOOR_Y, E.W, 13);
  c.fillStyle = DIRT;
  for (let x = -((scroll * 0.9) % 48); x < E.W + 48; x += 48) {
    c.fillRect(x, FLOOR_Y + 36, 28, 8);
    c.fillRect(x + 18, FLOOR_Y + 60, 36, 7);
  }
}

function drawHud() {
  E.draw.text(String(score), E.W / 2 + 3, 72 + 3, { size: 56, color: 'rgba(0,0,0,0.22)', align: 'center' });
  E.draw.text(String(score), E.W / 2, 72, { size: 56, color: WHITE, align: 'center' });
}

function drawButton(x, y, w, h, label, fill = INK) {
  E.draw.rrect(x, y, w, h, 8, fill);
  E.draw.text(label, x + w / 2, y + h / 2, { size: 17, color: WHITE, align: 'center' });
}

function renderWorld(c) {
  drawBackground(c);
  for (const p of pipes) drawPipe(c, p);
  drawGround(c);
  drawBird(c);
}

E.scene('menu', {
  async enter() {
    resetWorld();
    topScores = await E.leaderboard.top(5);
  },
  onTap() {
    E.go('play');
    flap();
  },
  onKey(k) {
    if (k === 'action' || k === 'up') {
      E.go('play');
      flap();
    }
  },
  update(dt) {
    scroll += 46 * dt;
    bird.y = 300 + Math.sin(performance.now() / 260) * 9;
    bird.rot = Math.sin(performance.now() / 420) * 0.12;
    for (const cloud of clouds) {
      cloud.x -= 12 * cloud.s * dt;
      if (cloud.x < -120) cloud.x = E.W + 40 + Math.random() * 90;
    }
  },
  render(c) {
    renderWorld(c);
    E.draw.text('FLAPPY', E.W / 2 + 3, 126 + 3, { size: 58, color: 'rgba(0,0,0,0.2)', align: 'center' });
    E.draw.text('FLAPPY', E.W / 2, 126, { size: 58, color: WHITE, align: 'center' });
    E.draw.text('tap or press space to flap', E.W / 2, 176, { size: 18, color: INK, align: 'center' });
    E.draw.text(`best ${E.best.get('flappy_best')}`, E.W / 2, 224, { size: 20, color: INK, align: 'center' });

    if (topScores.length) {
      E.draw.rrect(115, 390, 250, 164, 8, 'rgba(255,255,255,0.48)');
      E.draw.text('top flights', E.W / 2, 416, { size: 17, color: INK, align: 'center' });
      topScores.forEach((s, i) => {
        E.draw.text(`${i + 1}. ${s.name.slice(0, 10)}  ${s.score}`, E.W / 2, 452 + i * 22, { size: 15, color: INK, align: 'center' });
      });
    }

    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 260);
    c.globalAlpha = pulse;
    drawButton(134, 585, 212, 52, 'START');
    c.globalAlpha = 1;
  },
});

E.scene('play', {
  enter() {
    resetWorld();
  },
  onTap() {
    flap();
  },
  onKey(k) {
    if (k === 'action' || k === 'up') flap();
  },
  update(dt) {
    scroll += speed * dt;
    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.55, Math.min(1.05, bird.vy / 520));
    speed += 1.3 * dt;

    for (const cloud of clouds) {
      cloud.x -= 18 * cloud.s * dt;
      if (cloud.x < -120) cloud.x = E.W + 70 + Math.random() * 110;
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed * dt;
      if (!p.passed && p.x + PIPE_W < bird.x) {
        p.passed = true;
        score += 1;
        E.sfx.coin();
        E.fx.text(bird.x, bird.y - 28, '+1', WHITE);
      }
      if (p.x + PIPE_W < -20) {
        pipes.splice(i, 1);
        const lastX = pipes.reduce((max, pipe) => Math.max(max, pipe.x), 0);
        addPipe(lastX + PIPE_SPACING);
      }
    }

    const b = birdBox();
    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 80;
    }
    if (bird.y + bird.r > FLOOR_Y) endRun('grounded');

    for (const p of pipes) {
      const topRect = { x: p.x + 7, y: 0, w: PIPE_W - 14, h: p.top };
      const botRect = { x: p.x + 7, y: p.top + GAP, w: PIPE_W - 14, h: FLOOR_Y - (p.top + GAP) };
      if (E.hit.aabb(b, topRect) || E.hit.aabb(b, botRect)) {
        endRun('pipe hit');
        break;
      }
    }
  },
  render(c) {
    renderWorld(c);
    drawHud();
  },
});

E.scene('over', {
  enter() {
    submitted = false;
  },
  async onTap(x, y) {
    if (!submitted && y > 426 && y < 480) {
      submitted = true;
      const raw = prompt('Name for the leaderboard? (3-12 chars)') || 'PILOT';
      const name = raw.replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 12) || 'PILOT';
      const res = await E.leaderboard.submit(name, score);
      if (res && res.rank) alert(`Rank #${res.rank} saved.`);
      return;
    }
    if (y > 500 && y < 558) {
      E.go('play');
      flap();
      return;
    }
    E.go('menu');
  },
  onKey(k) {
    if (k === 'action' || k === 'up') {
      E.go('play');
      flap();
    }
  },
  render(c) {
    renderWorld(c);
    E.draw.rrect(66, 176, 348, 392, 8, 'rgba(255,255,255,0.84)');
    E.draw.text('GAME OVER', E.W / 2, 220, { size: 36, color: INK, align: 'center' });
    E.draw.text(`score ${score}`, E.W / 2, 278, { size: 32, color: INK, align: 'center' });
    E.draw.text(`best ${E.best.get('flappy_best')}`, E.W / 2, 318, { size: 20, color: PIPE_DARK, align: 'center' });
    E.draw.text(deadReason || 'crashed', E.W / 2, 358, { size: 15, color: '#6b7280', align: 'center' });

    if (!submitted) drawButton(124, 426, 232, 54, 'SAVE SCORE', PIPE_DARK);
    else E.draw.text('score saved', E.W / 2, 454, { size: 17, color: PIPE_DARK, align: 'center' });
    drawButton(124, 504, 232, 54, 'PLAY AGAIN');
  },
});

E.start('menu');
