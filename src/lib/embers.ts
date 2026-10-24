// Shared helpers for the ember canvases.
export type RGB = [number, number, number];

export function hexToRgb(h: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [232, 163, 61];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lift a dark hue so it still reads as light: embers and the nav highlight must glow, whatever a cover color is. */
export function lit(rgb: RGB, minLum = 0.55): RGB {
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (lum >= minLum) return rgb;
  const t = (minLum - lum) / (1 - lum);           // how far toward white we must go
  return rgb.map(c => Math.round(c + (255 - c) * t)) as RGB;
}
export const toHex = (rgb: RGB) => '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');

/** A soft 32px ember dot with a warm core, drawn once and reused with drawImage (cheap on phones). */
export function makeSprite(rgb: RGB): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,236,190,1)');
  grd.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.85)`);
  grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return c;
}

/** Rasterise a shape into normalised points in [-0.5, 0.5]². */
export function samplePoints(draw: (g: CanvasRenderingContext2D, SZ: number) => void, SZ = 420, step = 2): number[][] {
  const c = document.createElement('canvas'); c.width = c.height = SZ;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, SZ);
  const d = g.getImageData(0, 0, SZ, SZ).data; const pts: number[][] = [];
  for (let y = 0; y < SZ; y += step) for (let x = 0; x < SZ; x += step) if (d[(y * SZ + x) * 4 + 3] > 120) pts.push([(x - SZ / 2) / SZ, (y - SZ / 2) / SZ]);
  return pts;
}

/** Resample any point list to exactly N points, deterministically. */
export function fitPoints(pts: number[][], N: number): Float32Array {
  const out = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { const p = pts[(i * 7919) % pts.length]; out[i * 2] = p[0]; out[i * 2 + 1] = p[1]; }
  return out;
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** The four stage shapes the embers form on the home page. Index 0 is replaced by the real mark once the PNG loads. */
export const STAGE_SHAPES: Array<(g: CanvasRenderingContext2D, SZ: number) => void> = [
  // 0: fallback flame
  (g) => { g.beginPath(); g.moveTo(210, 60); g.bezierCurveTo(300, 170, 320, 250, 210, 350); g.bezierCurveTo(100, 250, 120, 170, 210, 60); g.fill(); },
  // 1: binder
  (g) => { roundRect(g, 110, 60, 210, 300, 10); g.stroke(); g.beginPath(); g.moveTo(140, 60); g.lineTo(140, 360); g.stroke();
    [120, 180, 240, 300].forEach(y => { g.beginPath(); g.arc(140, y, 13, 0, Math.PI * 2); g.stroke(); });
    [130, 200, 270].forEach(y => { g.beginPath(); g.moveTo(175, y); g.lineTo(285, y); g.stroke(); }); },
  // 2: plate and cutlery
  (g) => { g.beginPath(); g.arc(210, 215, 120, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(210, 215, 78, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(52, 110); g.lineTo(52, 330); g.stroke(); [36, 52, 68].forEach(x => { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 165); g.stroke(); }); g.beginPath(); g.moveTo(36, 165); g.lineTo(68, 165); g.stroke();
    g.beginPath(); g.moveTo(368, 110); g.lineTo(368, 330); g.stroke(); g.beginPath(); g.moveTo(368, 110); g.quadraticCurveTo(392, 160, 368, 215); g.stroke(); },
  // 3: workflow graph
  (g) => { const N: [number, number][] = [[90, 120], [210, 80], [330, 120], [150, 230], [270, 230], [210, 340]];
    ([[0, 1], [1, 2], [0, 3], [2, 4], [3, 4], [3, 5], [4, 5], [1, 3], [1, 4]] as [number, number][]).forEach(e => { g.beginPath(); g.moveTo(N[e[0]][0], N[e[0]][1]); g.lineTo(N[e[1]][0], N[e[1]][1]); g.stroke(); });
    N.forEach(n => { g.beginPath(); g.arc(n[0], n[1], 22, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(n[0], n[1], 7, 0, Math.PI * 2); g.fill(); }); },
];
