// Small vector-geometry toolkit: SVG path parsing/normalising/transforming,
// primitive shapes, and the organic "blob" shapes used behind each month.
// Everything outputs absolute SVG path data using only M, L, C, Q and Z, which
// both the SVG preview and the PDF renderer understand.

const IS_CMD = /^[MLHVCSQTAZ]$/i;
const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

export const fmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Parse any SVG path into absolute segments: [cmd, ...points] with cmd in M L C Q Z. */
export function parsePath(d) {
  const tokens = d.match(TOKEN) || [];
  const segs = [];
  let i = 0;
  let cmd = null;
  let x = 0, y = 0, sx = 0, sy = 0; // current point, subpath start
  let lastC = null, lastQ = null; // reflected control points for S/T
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (IS_CMD.test(tokens[i])) cmd = tokens[i++];
    else if (cmd === null) throw new Error(`Bad path: ${d}`);
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    let nextC = null, nextQ = null;
    switch (C) {
      case 'M': {
        x = ox + num(); y = oy + num(); sx = x; sy = y;
        segs.push(['M', x, y]);
        cmd = rel ? 'l' : 'L'; // subsequent pairs are line-tos
        break;
      }
      case 'L': x = ox + num(); y = oy + num(); segs.push(['L', x, y]); break;
      case 'H': x = ox + num(); segs.push(['L', x, y]); break;
      case 'V': y = oy + num(); segs.push(['L', x, y]); break;
      case 'C': {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num();
        x = ox + num(); y = oy + num();
        segs.push(['C', x1, y1, x2, y2, x, y]); nextC = [x2, y2];
        break;
      }
      case 'S': {
        const [x1, y1] = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
        const x2 = ox + num(), y2 = oy + num();
        x = ox + num(); y = oy + num();
        segs.push(['C', x1, y1, x2, y2, x, y]); nextC = [x2, y2];
        break;
      }
      case 'Q': {
        const x1 = ox + num(), y1 = oy + num();
        x = ox + num(); y = oy + num();
        segs.push(['Q', x1, y1, x, y]); nextQ = [x1, y1];
        break;
      }
      case 'T': {
        const [x1, y1] = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
        x = ox + num(); y = oy + num();
        segs.push(['Q', x1, y1, x, y]); nextQ = [x1, y1];
        break;
      }
      case 'A': {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
        const ex = ox + num(), ey = oy + num();
        for (const c of arcToCubics(x, y, rx, ry, rot, large, sweep, ex, ey)) segs.push(['C', ...c]);
        x = ex; y = ey;
        break;
      }
      case 'Z': segs.push(['Z']); x = sx; y = sy; break;
      default: throw new Error(`Unsupported path command ${cmd}`);
    }
    lastC = nextC; lastQ = nextQ;
  }
  return segs;
}

// SVG arc -> cubic Béziers (SVG 1.1 implementation notes, F.6).
function arcToCubics(x1, y1, rx, ry, angle, large, sweep, x2, y2) {
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9);
  const out = [];
  const step = dt / n;
  const k = (4 / 3) * Math.tan(step / 4);
  const pt = (t) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  for (let j = 0; j < n; j++) {
    const a = t1 + j * step, b = a + step;
    const [ax, ay] = pt(a), [bx, by] = pt(b), [dax, day] = der(a), [dbx, dby] = der(b);
    out.push([ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, bx, by]);
  }
  if (out.length) { out[out.length - 1][4] = x2; out[out.length - 1][5] = y2; }
  return out;
}

export function segsToString(segs) {
  return segs.map(([c, ...p]) => c + p.map(fmt).join(' ')).join('');
}

// Affine matrices [a, b, c, d, e, f]  (x' = a x + c y + e, y' = b x + d y + f)
export const M = {
  identity: () => [1, 0, 0, 1, 0, 0],
  translate: (tx, ty = 0) => [1, 0, 0, 1, tx, ty],
  scale: (sx, sy = sx) => [sx, 0, 0, sy, 0, 0],
  rotate: (deg, cx = 0, cy = 0) => {
    const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
  },
  multiply: (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ],
  /** compose(a, b, c) = a · b · c  (c is applied first) */
  compose: (...ms) => ms.reduce((acc, m) => M.multiply(acc, m), M.identity()),
  apply: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
  scaleFactor: (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])),
};

export function transformPath(d, m) {
  const segs = parsePath(d).map(([c, ...p]) => {
    const q = [];
    for (let i = 0; i < p.length; i += 2) q.push(...M.apply(m, p[i], p[i + 1]));
    return [c, ...q];
  });
  return segsToString(segs);
}

/** Bounding box of path data (control points included — good enough for layout checks). */
export function pathBounds(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [, ...p] of parsePath(d)) {
    for (let i = 0; i < p.length; i += 2) {
      x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]);
      y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

// ---------------------------------------------------------------- shapes

const KAPPA = 0.5522847498;

export function ellipse(cx, cy, rx, ry = rx, rot = 0) {
  const kx = rx * KAPPA, ky = ry * KAPPA;
  const P = (...v) => v.map(fmt).join(' ');
  const d = `M${P(cx + rx, cy)}C${P(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry)}` +
    `C${P(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy)}` +
    `C${P(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry)}` +
    `C${P(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy)}Z`;
  return rot ? transformPath(d, M.rotate(rot, cx, cy)) : d;
}
export const circle = (cx, cy, r) => ellipse(cx, cy, r, r);

export function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const k = r * (1 - KAPPA);
  return `M${x + r} ${y}L${x + w - r} ${y}C${x + w - k} ${y} ${x + w} ${y + k} ${x + w} ${y + r}` +
    `L${x + w} ${y + h - r}C${x + w} ${y + h - k} ${x + w - k} ${y + h} ${x + w - r} ${y + h}` +
    `L${x + r} ${y + h}C${x + k} ${y + h} ${x} ${y + h - k} ${x} ${y + h - r}` +
    `L${x} ${y + r}C${x} ${y + k} ${x + k} ${y} ${x + r} ${y}Z`;
}

export const polygon = (pts) => 'M' + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L') + 'Z';
export const polyline = (pts) => 'M' + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L');

/** Smooth closed curve through points (Catmull-Rom converted to cubic Béziers). */
export function smoothClosed(pts, tension = 1) {
  const n = pts.length;
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d + 'Z';
}

/** Smooth open curve through points. */
export function smoothOpen(pts, tension = 1) {
  const n = pts.length;
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const t = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An organic, hand-painted looking rounded rectangle. The outline wanders a
 * few points in and out following smooth low-frequency waves.
 */
export function blob(x, y, w, h, { seed = 1, radius = 20, wobble = 2.6, step = 13 } = {}) {
  const rand = rng(seed * 7919 + 17);
  const r = Math.min(radius, w / 2.2, h / 2.2);
  // Sample the rounded-rect perimeter with outward normals.
  const pts = [];
  const straightW = w - 2 * r, straightH = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const per = 2 * straightW + 2 * straightH + 4 * arc;
  const n = Math.max(16, Math.round(per / step));
  const waves = [0, 1, 2].map((i) => ({ f: 2 + i + Math.floor(rand() * 2), p: rand() * Math.PI * 2, a: (1 - i * 0.3) * (0.6 + rand() * 0.6) }));
  const norm = waves.reduce((s, v) => s + v.a, 0);
  for (let i = 0; i < n; i++) {
    let s = (i / n) * per;
    let px, py, nx, ny;
    const seg = [straightW, arc, straightH, arc, straightW, arc, straightH, arc];
    let k = 0;
    while (k < 7 && s > seg[k]) { s -= seg[k]; k++; }
    const corner = (cx, cy, a0) => {
      const a = a0 + (s / arc) * (Math.PI / 2);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)];
    };
    switch (k) {
      case 0: [px, py, nx, ny] = [x + r + s, y, 0, -1]; break;
      case 1: [px, py, nx, ny] = corner(x + w - r, y + r, -Math.PI / 2); break;
      case 2: [px, py, nx, ny] = [x + w, y + r + s, 1, 0]; break;
      case 3: [px, py, nx, ny] = corner(x + w - r, y + h - r, 0); break;
      case 4: [px, py, nx, ny] = [x + w - r - s, y + h, 0, 1]; break;
      case 5: [px, py, nx, ny] = corner(x + r, y + h - r, Math.PI / 2); break;
      case 6: [px, py, nx, ny] = [x, y + h - r - s, -1, 0]; break;
      default: [px, py, nx, ny] = corner(x + r, y + r, Math.PI); break;
    }
    const t = (i / n) * Math.PI * 2;
    const off = (waves.reduce((acc, v) => acc + v.a * Math.sin(v.f * t + v.p), 0) / norm) * wobble;
    pts.push([px + nx * off, py + ny * off]);
  }
  return smoothClosed(pts);
}
