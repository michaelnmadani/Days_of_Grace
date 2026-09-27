// Month illustrations, drawn as flat vector art on a 100 × 100 canvas.
// Each icon is a list of primitives { d, fill?, stroke?, sw?, op?, cap?, join? }
// that both the SVG preview and the PDF renderer can paint.

import { circle, ellipse, roundRect, polygon, smoothOpen, smoothClosed, transformPath, M, rng, fmt } from './geometry.js';

const F = (d, fill, op) => ({ d, fill, op });
const S = (d, stroke, sw, extra = {}) => ({ d, stroke, sw, cap: 'round', join: 'round', ...extra });
const FS = (d, fill, stroke, sw, extra = {}) => ({ d, fill, stroke, sw, join: 'round', ...extra });

const P = (...v) => v.map(fmt).join(' ');

/** Leaf/leaflet: base at (x, y), pointing at `angle` degrees (0 = right, 90 = down). */
function leaf(x, y, len, width, angle, bend = 0) {
  const d = `M0 0Q${P(len * 0.45, -width + bend)} ${P(len, bend * 0.6)}Q${P(len * 0.5, width + bend)} 0 0Z`;
  return transformPath(d, M.compose(M.translate(x, y), M.rotate(angle)));
}

/** Teardrop flame standing on (cx, by) with height h and half-width w. */
function flame(cx, by, h, w, lean = 0) {
  return `M${P(cx, by)}C${P(cx - w * 1.25, by - h * 0.12, cx - w * 0.7 + lean * 0.4, by - h * 0.6, cx + lean, by - h)}` +
    `C${P(cx + w * 0.7 + lean * 0.4, by - h * 0.6, cx + w * 1.25, by - h * 0.12, cx, by)}Z`;
}

/** Four-point sparkle. */
function sparkle(cx, cy, r) {
  const k = r * 0.22;
  return `M${P(cx, cy - r)}Q${P(cx + k, cy - k, cx + r, cy)}Q${P(cx + k, cy + k, cx, cy + r)}` +
    `Q${P(cx - k, cy + k, cx - r, cy)}Q${P(cx - k, cy - k, cx, cy - r)}Z`;
}

/** Five-point star. */
function star(cx, cy, r, inner = 0.45, rot = -90) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * inner : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return polygon(pts);
}

/** Wedge-shaped light rays around (cx, cy). */
function rays(cx, cy, r0, r1, count, from = 0, to = 360, spread = 0.09) {
  const out = [];
  const full = Math.abs(to - from) >= 360;
  const n = full ? count : count - 1;
  for (let i = 0; i < count; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    const w = spread * (i % 2 ? 0.6 : 1);
    out.push(polygon([
      [cx + Math.cos(a - w * 0.25) * r0, cy + Math.sin(a - w * 0.25) * r0],
      [cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1],
      [cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1],
      [cx + Math.cos(a + w * 0.25) * r0, cy + Math.sin(a + w * 0.25) * r0],
    ]));
  }
  return out;
}

/** Latin cross made of two rounded bars. */
function cross(cx, top, h, w, armY, armW, r = 0.8) {
  return [roundRect(cx - w / 2, top, w, h, r), roundRect(cx - armW / 2, armY, armW, w, r)];
}

/** Simple daisy. */
function daisy(cx, cy, r, petals = 8, rot = 0) {
  const out = [];
  for (let i = 0; i < petals; i++) {
    const a = rot + (360 / petals) * i;
    const rad = (a * Math.PI) / 180;
    out.push(FS(ellipse(cx + Math.cos(rad) * r * 0.55, cy + Math.sin(rad) * r * 0.55, r * 0.5, r * 0.2, a), '#ffffff', '#d9d3c8', 0.5));
  }
  out.push(F(circle(cx, cy, r * 0.28), '#f2c14e'));
  return out;
}

// ---------------------------------------------------------------- icons

function madonna() {
  const blue = '#6d9ed7', blueDark = '#5584c0', gold = '#e9c461';
  const out = [];
  out.push(F(circle(50, 31, 24), '#f9e6ad'));
  out.push(S(circle(50, 31, 21.5), '#efcc6e', 1.3));
  // mantle
  const mantle = 'M50 10C63 10 71 20 72 33C73 45 77 53 83 63C89 73 91 86 89 96C72 99.6 28 99.6 11 96C9 86 11 73 17 63C23 53 27 45 28 33C29 20 37 10 50 10Z';
  out.push(F(mantle, blue));
  out.push(F('M50 10C63 10 71 20 72 33C73 45 77 53 83 63C89 73 91 86 89 96C83 97.4 76 98.3 70 98.6C71 80 69 62 63 50C60 36 60 22 50 10Z', blueDark, 0.55));
  // opening of the mantle: veil + gown
  const opening = 'M50 16.5C58.5 16.5 63.5 24 63.5 34C63.5 44 64.5 52 66.5 60L68.5 97.2C57 98.8 43 98.8 31.5 97.2L33.5 60C35.5 52 36.5 44 36.5 34C36.5 24 41.5 16.5 50 16.5Z';
  out.push(F(opening, '#f7f2ea'));
  out.push(F('M38.5 50C43 47 57 47 61.5 50L67 97.3C56 98.8 44 98.8 33 97.3Z', '#f3d8d2'));
  out.push(S('M44 52C45 64 45 80 44 96M56 52C55 64 55 80 56 96', '#e7c2ba', 0.9));
  out.push(S(opening, gold, 1.6));
  // face
  out.push(F(ellipse(50, 34.5, 8.8, 10.4), '#f6d7c0'));
  out.push(F('M41.4 32C41.8 25.5 45.5 22.5 50 22.5C54.5 22.5 58.2 25.5 58.6 32C56.5 28.4 53.5 27 50 27C46.5 27 43.5 28.4 41.4 32Z', '#8a5a3c'));
  out.push(S('M44.6 35.2Q46.4 36.6 48.2 35.2M51.8 35.2Q53.6 36.6 55.4 35.2', '#6a4435', 0.85));
  out.push(F(circle(44.4, 39.1, 1.9), '#f0a597', 0.6));
  out.push(F(circle(55.6, 39.1, 1.9), '#f0a597', 0.6));
  out.push(S('M48.4 41.3Q50 42.5 51.6 41.3', '#c56f64', 0.9));
  // sleeves and praying hands
  out.push(F('M33.5 60C38 63 42 68 46 71.5C44.5 76 40 78.5 33 77.5Z', blue));
  out.push(F('M66.5 60C62 63 58 68 54 71.5C55.5 76 60 78.5 67 77.5Z', blueDark));
  out.push(F('M50 54C53.2 56.2 54.8 62 54.3 67.8C53.8 72 51.8 74.4 50 74.4C48.2 74.4 46.2 72 45.7 67.8C45.2 62 46.8 56.2 50 54Z', '#f4cdb2'));
  out.push(S('M50 57.5L50 73.5', '#dca78c', 0.7));
  // folds and stars on the mantle
  out.push(S('M22 72C24 81 24 89 22 96M78 72C76 81 76 89 78 96', '#4f7cb7', 1.1));
  out.push(F(star(24.5, 60, 2.6), gold));
  out.push(F(star(76, 84, 2.3), gold));
  out.push(F(star(19, 85, 2.1), gold));
  return out;
}

function palmFrond(x0, y0, x1, y1, bendX, bendY, opts = {}) {
  const { colors = ['#86b95f', '#6ea24e'], stem = '#5b8a41', pairs = 11, maxLen = 23, width = 3.2, sw = 1.6 } = opts;
  const out = [];
  const q = (t) => [
    (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * bendX + t * t * x1,
    (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * bendY + t * t * y1,
  ];
  const tangent = (t) => {
    const dx = 2 * (1 - t) * (bendX - x0) + 2 * t * (x1 - bendX);
    const dy = 2 * (1 - t) * (bendY - y0) + 2 * t * (y1 - bendY);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };
  const leaves = [];
  for (let i = 0; i < pairs; i++) {
    const t = 0.1 + (i / (pairs - 1)) * 0.86;
    const [px, py] = q(t);
    const a = tangent(t);
    const len = maxLen * Math.sin(Math.PI * (0.25 + t * 0.7)) * (1 - t * 0.35);
    leaves.push({ px, py, a, len, i });
  }
  // back row first (one side), then stem, then front row
  for (const { px, py, a, len, i } of leaves) out.push(F(leaf(px, py, len, width, a - 42, -1), colors[i % 2]));
  out.push(S(smoothOpen([q(0), q(0.35), q(0.7), q(1)]), stem, sw));
  for (const { px, py, a, len, i } of leaves) out.push(F(leaf(px, py, len, width, a + 42, 1), colors[(i + 1) % 2]));
  return out;
}

function ashes() {
  const out = [];
  out.push(...palmFrond(26, 70, 88, 10, 50, 52, { colors: ['#cdb95c', '#b9a24a'], stem: '#9c8a3c', pairs: 9, maxLen: 19, width: 2.8 }));
  // bowl
  out.push(F(ellipse(50, 90, 12, 3), '#b98a33'));
  out.push(F('M47 84L53 84L55 90L45 90Z', '#c9973a'));
  out.push(F('M19 62C20 78 33 88 50 88C67 88 80 78 81 62Z', '#dca646'));
  out.push(F('M60 62L81 62C80.5 76 70 86 55 87.8C66 82 70 72 60 62Z', '#c48f35'));
  out.push(S('M25.5 67C28.5 76 36 82 45 84', '#f2d386', 2, { op: 0.9 }));
  out.push(F(ellipse(50, 62, 31, 7.2), '#e9bd5f'));
  out.push(F(ellipse(50, 62, 27.5, 5.4), '#7b7674'));
  out.push(F('M26.5 62C32 55 41 51.5 50 51.5C59 51.5 68 55 73.5 62C66.5 64.8 58 65.8 50 65.8C42 65.8 33.5 64.8 26.5 62Z', '#6a6563'));
  out.push(F('M34 57.5C39 54 45 53 50 53C47 55 43 57 41 60Z', '#8d8886', 0.8));
  const r = rng(5);
  for (let i = 0; i < 9; i++) out.push(F(circle(33 + r() * 34, 57 + r() * 6, 0.55 + r() * 0.4), '#a9a4a1'));
  out.push(S('M50 53.5L50 61.5M46 56.8L54 56.8', '#d4cfcb', 1.5));
  return out;
}

function candles() {
  const out = [];
  out.push(F(circle(40, 28, 13), '#fbe7a6', 0.45));
  out.push(F(circle(62, 20, 13), '#fbe7a6', 0.45));
  const candle = (x, top, h) => {
    out.push(FS(roundRect(x - 6, top, 12, h, 2), '#fbf3e3', '#e3d3b5', 1));
    out.push(F(roundRect(x + 1.5, top + 1, 3.5, h - 2, 1.5), '#efe2c6'));
    out.push(S(`M${x} ${top}L${x} ${top - 3.5}`, '#5b4a3b', 1));
    out.push(F(flame(x, top - 2.5, 15, 4.3), '#f5a33b'));
    out.push(F(flame(x, top - 3, 8.5, 2.3), '#fde38b'));
  };
  candle(40, 41, 45);
  candle(62, 33, 53);
  // holders
  out.push(F(ellipse(40, 87, 12, 3.4), '#e2b654'));
  out.push(F(ellipse(62, 87, 12, 3.4), '#d6a746'));
  out.push(F(ellipse(51, 91, 30, 5), '#e8c268'));
  // ribbon + sprig
  out.push(F('M28 70C38 64 64 64 76 70L74 75C62 70 40 70 30 75Z', '#8fb3dc'));
  out.push(F(leaf(28, 78, 14, 3.2, 200), '#7fa65e'));
  out.push(F(leaf(76, 78, 14, 3.2, -20), '#7fa65e'));
  return out;
}

function palm() {
  return palmFrond(14, 96, 86, 8, 34, 30, { pairs: 15, maxLen: 26, width: 3.6, sw: 1.8, colors: ['#86b95f', '#679d49'] });
}

function lily(cx, cy, s, rot) {
  const out = [];
  const m = M.compose(M.translate(cx, cy), M.rotate(rot), M.scale(s));
  const T = (d) => transformPath(d, m);
  out.push(FS(T('M0 0C-6 -4 -9 -10 -10 -17C-6 -14 -3 -13 0 -13C3 -13 6 -14 10 -17C9 -10 6 -4 0 0Z'), '#ffffff', '#ddd5c9', 0.8));
  out.push(FS(T('M0 -2C-3 -8 -3 -14 0 -20C3 -14 3 -8 0 -2Z'), '#fbf8f2', '#ddd5c9', 0.7));
  out.push(S(T('M0 -4L-2.5 -16M0 -4L2.5 -16M0 -4L0 -17'), '#e8b64a', 0.7));
  out.push(F(T(circle(-2.5, -16.5, 1)), '#e39a3a'));
  out.push(F(T(circle(2.5, -16.5, 1)), '#e39a3a'));
  out.push(F(T(circle(0, -17.5, 1)), '#e39a3a'));
  return out;
}

function easter() {
  const out = [];
  // sunrise behind the hill
  out.push(...rays(50, 76, 22, 52, 13, 186, 354, 0.07).map((d) => F(d, '#fbe0a0', 0.9)));
  out.push(F(circle(50, 76, 25), '#fcdc8e'));
  out.push(F(circle(50, 76, 19), '#fde8b3'));
  // cross
  out.push(...cross(50, 10, 72, 8, 26, 38, 1.4).map((d) => F(d, '#c89f73')));
  out.push(F(roundRect(52.6, 10, 2.6, 72, 1), '#ad8358', 0.75));
  out.push(F(roundRect(31, 31, 38, 2.4, 1), '#ad8358', 0.6));
  // white sash draped over the cross-beam
  const sash = { fill: '#ffffff', stroke: '#d6ccc0', sw: 0.8, join: 'round' };
  out.push({ d: 'M46.6 30C42 36 37 41 29.5 44.5C31.5 46.5 32.6 48.6 32.8 51.5C39.5 46 44.5 40.5 48 34Z', ...sash });
  out.push({ d: 'M53.4 30C58 37 62 43 69.8 47.5C67.6 49.2 66.4 51.4 66 54.2C59.4 48.4 55 42 52 34Z', ...sash });
  out.push({ d: roundRect(44.5, 24.6, 11, 11.4, 2.6), ...sash });
  out.push(S('M47 27.5C49 29.5 51 29.5 53 27.5M47 33C49 31.5 51 31.5 53 33', '#e3dbd1', 0.7));
  // hills
  out.push(F('M4 85C18 73 36 71 50 73C66 75 84 72 96 81C99.5 84 99.5 93 95.5 96C80 99.4 20 99.4 4.5 96C0.5 93 0.5 88 4 85Z', '#b7d59c'));
  out.push(F('M2.6 91C22 82.5 42 83.5 56 86.5C72 89.5 86 86.5 98.2 89C98.6 92.5 97.6 95 95.5 96C80 99.4 20 99.4 4.5 96C2.8 95 2.2 93 2.6 91Z', '#9dc682'));
  // lilies either side of the cross
  out.push(F(leaf(28, 95, 17, 3.2, -118), '#7fae5e'));
  out.push(F(leaf(72, 95, 17, 3.2, -62), '#7fae5e'));
  out.push(S('M29 95C27 88 24 82 20 77M71 95C73 88 76 82 80 77', '#6f9f50', 1.4));
  out.push(...lily(20, 78, 0.95, -28));
  out.push(...lily(80, 78, 0.95, 28));
  return out;
}

function trinity() {
  const out = [];
  const cx = 50, cy = 54;
  out.push(F(circle(cx, cy, 42), '#f6ebc0', 0.7));
  out.push(...rays(cx, cy, 30, 47, 18, 0, 360, 0.07).map((d) => F(d, '#f3dc97', 0.7)));
  out.push(S(circle(cx, cy, 17.5), '#9b8bc9', 3.4));
  // triquetra: three lens loops from the centre toward three tips
  const L = 38;
  const R = L * 0.6;
  for (const ang of [-90, 30, 150]) {
    const a = (ang * Math.PI) / 180;
    const tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
    const d = `M${P(cx, cy)}A${P(R, R)} 0 0 1 ${P(...tip)}A${P(R, R)} 0 0 1 ${P(cx, cy)}Z`;
    out.push(S(d, '#fdf8ea', 6.4));
    out.push(S(d, '#d4a13b', 3.6));
  }
  // re-draw circle segments on top at alternate crossings for an interlaced look
  for (const ang of [-30, 90, 210]) {
    const a0 = ((ang - 13) * Math.PI) / 180, a1 = ((ang + 13) * Math.PI) / 180;
    const p0 = [cx + Math.cos(a0) * 17.5, cy + Math.sin(a0) * 17.5], p1 = [cx + Math.cos(a1) * 17.5, cy + Math.sin(a1) * 17.5];
    const d = `M${P(...p0)}A17.5 17.5 0 0 1 ${P(...p1)}`;
    out.push(S(d, '#fdf8ea', 5.6, { cap: 'butt' }));
    out.push(S(d, '#9b8bc9', 3.4, { cap: 'butt' }));
  }
  out.push(F(circle(cx, cy, 3.2), '#d4a13b'));
  return out;
}

function sacredHeart() {
  const out = [];
  out.push(...rays(50, 58, 20, 49, 16, 0, 360, 0.085).map((d) => F(d, '#f7dc92', 0.8)));
  const heart = 'M50 90C39 82 19 70 19 51C19 40 27 33.5 35.5 33.5C42.5 33.5 47.5 37.5 50 42.5C52.5 37.5 57.5 33.5 64.5 33.5C73 33.5 81 40 81 51C81 70 61 82 50 90Z';
  // flames
  out.push(F(flame(50, 40, 22, 9), '#f39a3c'));
  out.push(F(flame(50, 38, 13, 5), '#f8cf5a'));
  out.push(...cross(50, 7, 22, 3.6, 12, 14, 0.8).map((d) => F(d, '#d7a23f')));
  out.push(F(heart, '#e0584d'));
  out.push(F('M81 51C81 70 61 82 50 90C58 80 72 68 73 52C73.6 44 70 38 64.5 34.5C73 33.5 81 40 81 51Z', '#c7443b'));
  out.push(F(ellipse(33, 45.5, 6.5, 4, -35), '#f2887b', 0.9));
  // crown of thorns
  out.push(S('M20.5 57C32 63.5 45 65.5 50 65.5C57 65.5 70 63 79.5 56.5', '#7a5a3b', 2.6));
  out.push(S('M21 60.5C30 58 42 60 50 61C60 62 70 61 79 59.5', '#94704b', 2.2));
  const thorns = [[24, 58.6, -60], [31, 61.8, -110], [38, 62.8, -70], [45, 64.8, 110], [55, 64.6, -100], [62, 62.8, 70], [69, 61, -80], [75, 58.4, 100]];
  for (const [x, y, a] of thorns) out.push(S(transformPath('M0 0L4.2 0', M.compose(M.translate(x, y), M.rotate(a))), '#6b4c31', 1.1));
  // wound
  out.push(S('M60 72L66 67', '#a5302a', 1.8));
  return out;
}

function bible() {
  const out = [];
  const m = M.rotate(-7, 50, 52);
  const T = (d) => transformPath(d, m);
  out.push(F(T(roundRect(27, 15, 52, 74, 3)), '#f4ead5'));
  out.push(S(T('M31 85.5L76.5 85.5M31 83L77 83'), '#e0d2b4', 0.7));
  out.push(S(T('M76.5 20L76.5 85M74 20L74 85'), '#e0d2b4', 0.7));
  out.push(F(T(roundRect(21, 11, 53, 75, 3.5)), '#7b4a33'));
  out.push(F(T(roundRect(21, 11, 8, 75, 3.5)), '#5f3625'));
  out.push(S(T('M29 11.5L29 85.5'), '#4f2c1e', 0.9));
  out.push(S(T(roundRect(33, 17, 36, 63, 2)), '#d7ab57', 0.9));
  out.push(...cross(51, 27, 32, 5.2, 35, 21, 0.8).map((d) => F(T(d), '#e3b95c')));
  out.push(S(T('M40 69L62 69M43 73L59 73'), '#d7ab57', 1.1));
  // corner guards
  for (const [x, y, dx, dy] of [[69, 16, -1, 1], [69, 81, -1, -1]]) {
    out.push(F(T(`M${x + 5} ${y - dy * 5}L${x + 5} ${y + dy * 3}L${x + 5 + dx * 8} ${y - dy * 5}Z`), '#d7ab57'));
  }
  // ribbon
  out.push(F(T('M58 85.5L58 97L61 94L64 97L64 85.5Z'), '#c9544d'));
  return out;
}

/** Points spaced evenly along a parametric curve f(t), t in [0, 1]. */
function evenPoints(f, count, t0 = 0, t1 = 1) {
  const samples = [];
  let len = 0;
  let prev = f(t0);
  samples.push([prev, 0]);
  for (let i = 1; i <= 400; i++) {
    const p = f(t0 + ((t1 - t0) * i) / 400);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    samples.push([p, len]);
    prev = p;
  }
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (len * k) / (count - 1);
    while (j < samples.length - 1 && samples[j + 1][1] < target) j++;
    out.push(samples[j][0]);
  }
  return out;
}

function rosary() {
  const out = [];
  // a gently tilted teardrop loop that closes at the centerpiece
  const loop = (t) => {
    const a = Math.PI / 2 + t * Math.PI * 2; // starts and ends at the bottom
    const pinch = 1 - 0.55 * Math.pow(Math.max(0, Math.sin(a)), 3);
    const x = 50 + Math.cos(a) * 30 * pinch;
    const y = 36 + Math.sin(a) * 27;
    const [rx, ry] = M.apply(M.rotate(-12, 50, 40), x, y);
    return [rx, ry];
  };
  const [mx, my] = loop(0);
  out.push(S(smoothClosed(evenPoints(loop, 40).slice(0, -1)), '#caa98e', 0.8));
  const beads = evenPoints(loop, 30, 0.035, 0.965);
  beads.forEach(([x, y], i) => {
    const big = i % 6 === 2 || i % 6 === 5 ? false : false;
    const marker = i === 4 || i === 10 || i === 15 || i === 20 || i === 25;
    const r = marker ? 3.1 : 2.4;
    out.push(F(circle(x, y, r), marker ? '#d4728b' : big ? '#e997a9' : '#ea9aab'));
    out.push(F(circle(x - r * 0.35, y - r * 0.35, r * 0.36), '#fbd8e0'));
  });
  // centerpiece medal and pendant
  out.push(S(`M${P(mx, my)}L${P(mx + 3, 84)}`, '#caa98e', 0.8));
  out.push(F(ellipse(mx, my + 1, 3.6, 4.4, -8), '#e0b75a'));
  out.push(F(ellipse(mx, my + 1, 2, 2.6, -8), '#f2d78e'));
  for (const [t, r] of [[0.28, 2.3], [0.46, 2.3], [0.64, 2.3]]) {
    const x = mx + 3 * t, y = my + 5 + (84 - my - 5) * t;
    out.push(F(circle(x, y, r), '#ea9aab'));
    out.push(F(circle(x - 0.8, y - 0.8, 0.8), '#fbd8e0'));
  }
  const cm = M.rotate(8, mx + 3, 84);
  for (const d of cross(mx + 3, 81.5, 17, 3.4, 86, 12.5, 0.8)) out.push(F(transformPath(d, cm), '#d6a74b'));
  out.push(F(transformPath(roundRect(mx + 3.4, 81.5, 1.1, 17, 0.5), cm), '#b98b35', 0.8));
  return out;
}

function eucharist() {
  const out = [];
  out.push(...rays(50, 29, 16, 34, 20, 0, 360, 0.08).map((d) => F(d, '#f6dc94', 0.85)));
  out.push(FS(circle(50, 29, 15), '#fdf7e8', '#e5cf9d', 1.2));
  out.push(S(circle(50, 29, 12.4), '#eddcb4', 0.8));
  out.push(S('M50 20.5L50 37.5M43.5 27L56.5 27', '#e0c38b', 2.2));
  // chalice cup
  out.push(F('M29 47L71 47C71 63 61 71.5 50 71.5C39 71.5 29 63 29 47Z', '#e6ba53'));
  out.push(F('M58 47L71 47C71 63 61 71.5 50 71.5C58 67 62 58 58 47Z', '#cf9f3e'));
  out.push(S('M34 52C35 60 39 65 44 67.5', '#f6e0a0', 1.8));
  out.push(F(ellipse(50, 47, 21, 3.8), '#f1cf75'));
  out.push(F(ellipse(50, 47, 18, 2.4), '#c9953a'));
  out.push(...cross(50, 53, 11, 2, 56, 7, 0.4).map((d) => F(d, '#c9953a')));
  // stem, knot, foot
  out.push(F('M46.5 71L53.5 71L52.5 84L47.5 84Z', '#d6a442'));
  out.push(F(ellipse(50, 77.5, 5.6, 2.6), '#e6ba53'));
  out.push(F('M34 95C36 87 44 84 50 84C56 84 64 87 66 95Z', '#dcab47'));
  out.push(F('M56 85C61 87 65 90 66 95L60 95C60 91 58.5 88 56 85Z', '#c9953a'));
  out.push(F(ellipse(50, 95, 16, 2.6), '#c28e36'));
  return out;
}

function dove() {
  const out = [];
  const line = '#8e9dae', white = '#ffffff', shade = '#e4ebf2';
  // far wing
  out.push(FS('M52 45C55 32 62 20 74 13C74 20 72 26 69 31C76 27 82 27 87 28C83 35 76 41 66 46Z', shade, line, 1.2));
  // tail
  out.push(FS('M68 55C76 56 85 60 93 67C86 70 79 69 73 66C76 71 77 75 76 79C69 75 64 69 61 62Z', white, line, 1.2));
  // body + head
  out.push(FS('M20 42C22 36 27 33 32 34C36 35 38 38 40 42C47 44 58 46 66 50C72 53 72 60 66 63C58 67 44 66 36 60C30 56 27 50 26 46C24 46 21 45 20 42Z', white, line, 1.2));
  // near wing
  out.push(FS('M38 47C38 34 43 20 52 9C54 17 53 24 51 29C57 21 64 17 71 16C68 25 63 32 57 37C62 36 67 37 71 38C65 45 55 50 44 51Z', white, line, 1.2));
  out.push(S('M44 42C47 35 51 29 55 25M48 45C53 40 58 36 63 33', '#c6d1dc', 0.9));
  // eye, beak, blush
  out.push(F(circle(29.5, 39, 1.3), '#384758'));
  out.push(FS('M20.2 41.8L14.5 43.4L20.4 44.6Z', '#f0a856', '#d58a3c', 0.6));
  out.push(F(circle(31, 43, 1.8), '#f6c2c0', 0.7));
  // olive branch
  out.push(S('M16.5 43.8C13 50 10 57 9 66', '#7c8f45', 1.3));
  out.push(F(leaf(15, 47, 11, 2.4, 170), '#8fae5b'));
  out.push(F(leaf(12.5, 53, 11, 2.4, 20), '#a3bf6c'));
  out.push(F(leaf(11, 58, 10, 2.2, 160), '#8fae5b'));
  out.push(F(leaf(10, 62.5, 9.5, 2.2, 25), '#a3bf6c'));
  out.push(F(ellipse(16.5, 55.5, 1.7, 2.2, 20), '#6b7c38'));
  out.push(F(ellipse(7.5, 60, 1.6, 2.1, -15), '#6b7c38'));
  return out;
}

function memorialCandle() {
  const out = [];
  out.push(F(smoothClosed([[50, 5], [78, 11], [94, 36], [92, 66], [74, 90], [48, 95], [22, 88], [7, 62], [9, 32], [24, 12]]), '#2f4a7a'));
  const r = rng(11);
  for (let i = 0; i < 14; i++) {
    const x = 14 + r() * 72, y = 12 + r() * 50;
    if (Math.abs(x - 50) < 16 && y > 14) continue;
    out.push(F(i % 3 ? circle(x, y, 0.7 + r() * 0.6) : sparkle(x, y, 2.4), '#f6e7a8', 0.9));
  }
  out.push(F(circle(50, 31, 16), '#fbe7a6', 0.22));
  out.push(F(circle(50, 31, 10), '#fbe7a6', 0.3));
  // candle
  out.push(F(roundRect(36, 42, 28, 44, 3), '#fbf1dc'));
  out.push(F(roundRect(54, 43, 10, 43, 3), '#ecdcbc'));
  out.push(F(ellipse(50, 42.5, 14, 3.2), '#f4e6c8'));
  out.push(F('M41 43C41 47 42 49 43 49C44 49 45 47 45 43Z', '#fbf1dc'));
  out.push(S('M50 42L50 37', '#4d3f33', 1.1));
  out.push(F(flame(50, 38.5, 18, 5.5, 0.6), '#f6a53f'));
  out.push(F(flame(50, 38, 10, 3, 0.3), '#fde28c'));
  out.push(...cross(50, 53, 20, 3.2, 59, 13, 0.6).map((d) => F(d, '#d4a348')));
  // daisies and leaves at the base
  out.push(F(leaf(24, 90, 17, 3.4, -35), '#7ea45f'));
  out.push(F(leaf(76, 90, 17, 3.4, -145), '#7ea45f'));
  out.push(F(leaf(40, 93, 14, 3, -70), '#93b874'));
  out.push(...daisy(29, 84, 10, 9, 10));
  out.push(...daisy(71, 85, 9, 9, 0));
  out.push(...daisy(50, 90, 8, 8, 20));
  return out;
}

function wreath() {
  const out = [];
  const cx = 50, cy = 70, rx = 38, ry = 15;
  const onRing = (deg, dr = 0) => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.cos(a) * (rx + dr), cy + Math.sin(a) * (ry + dr * 0.45)];
  };
  const greens = ['#4f7d55', '#6c9a66', '#88b47c', '#5d8b5c', '#3f6b48'];
  const r = rng(3);
  const needles = (from, to) => {
    for (let deg = from; deg < to; deg += 6) {
      for (let j = 0; j < 3; j++) {
        const [x, y] = onRing(deg + r() * 5, (r() - 0.5) * 9);
        out.push(F(leaf(x, y, 8 + r() * 6, 2, deg + 90 + (r() - 0.5) * 170), greens[Math.floor(r() * greens.length)]));
      }
    }
  };
  const candle = (deg, color, shade) => {
    const [x, y] = onRing(deg);
    const top = y - 33;
    out.push(F(roundRect(x - 4.4, top, 8.8, 34, 1.6), color));
    out.push(F(roundRect(x + 1.2, top, 3.2, 34, 1.4), shade));
    out.push(F(ellipse(x, top + 0.6, 4.4, 1.3), shade, 0.6));
    out.push(S(`M${fmt(x)} ${fmt(top)}L${fmt(x)} ${fmt(top - 3)}`, '#4d3f33', 0.9));
    out.push(F(flame(x, top - 2, 11, 3.2), '#f6ac44'));
    out.push(F(flame(x, top - 2.5, 6, 1.7), '#fde28c'));
  };
  const purple = ['#8e6bb8', '#77579f'];
  // back half, back candles, front half, front candles
  needles(180, 360);
  candle(292, ...purple);
  candle(202, ...purple);
  needles(0, 180);
  candle(112, '#eaa3c6', '#d68bb1');
  candle(22, ...purple);
  for (const deg of [0, 55, 90, 150, 180, 235, 270, 325]) {
    const [x, y] = onRing(deg, deg > 180 ? -2 : 2);
    out.push(F(circle(x - 1.4, y, 1.7), '#c9464a'));
    out.push(F(circle(x + 1.4, y + 0.6, 1.7), '#d9575a'));
    out.push(F(circle(x, y - 1.6, 1.6), '#bd3c41'));
  }
  // bow
  out.push(F('M50 86C44 80 36 80 36 86C36 92 44 92 50 86Z', '#c9464a'));
  out.push(F('M50 86C56 80 64 80 64 86C64 92 56 92 50 86Z', '#c9464a'));
  out.push(F('M49 87L44 97L48 96L50 98L51 88Z', '#b33b3f'));
  out.push(F('M51 87L56 97L52 96L50 98L49 88Z', '#b33b3f'));
  out.push(F(circle(50, 86, 2.6), '#b33b3f'));
  return out;
}

export const ICONS = {
  madonna,
  ashes,
  candles,
  palm,
  easter,
  trinity,
  sacredHeart,
  bible,
  rosary,
  eucharist,
  dove,
  candle: memorialCandle,
  wreath,
};

const cache = new Map();

/** Primitives for an icon placed with its 100×100 box at (x, y) scaled to `size`. */
export function placeIcon(name, x, y, size) {
  if (!cache.has(name)) cache.set(name, ICONS[name]());
  const s = size / 100;
  const m = M.compose(M.translate(x, y), M.scale(s));
  return cache.get(name).map((p) => ({
    type: 'path',
    d: transformPath(p.d, m),
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: p.sw ? p.sw * s : undefined,
    opacity: p.op,
    lineCap: p.cap,
    lineJoin: p.join,
  }));
}
