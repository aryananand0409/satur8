export function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function hsbToHex(h, s, b) {
  return rgbToHex(...hsbToRgb(h, s, b));
}

export function rgbToLab(r, g, b) {
  let R = r / 255, G = g / 255, B = b / 255;
  R = R > 0.04045 ? ((R + 0.055) / 1.055) ** 2.4 : R / 12.92;
  G = G > 0.04045 ? ((G + 0.055) / 1.055) ** 2.4 : G / 12.92;
  B = B > 0.04045 ? ((B + 0.055) / 1.055) ** 2.4 : B / 12.92;
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) / 1.08883;
  const fn = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * fn(Y) - 16, 500 * (fn(X) - fn(Y)), 200 * (fn(Y) - fn(Z))];
}

// CIEDE2000 — full implementation
function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const C1 = Math.sqrt(a1 ** 2 + b1 ** 2);
  const C2 = Math.sqrt(a2 ** 2 + b2 ** 2);
  const Cb = (C1 + C2) / 2;
  const Cb7 = Cb ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p ** 2 + b1 ** 2);
  const C2p = Math.sqrt(a2p ** 2 + b2 ** 2);

  const h1p = (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360;
  const h2p = (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2;
  else hbp = (h1p + h2p - 360) / 2;

  const T = 1
    - 0.17 * Math.cos((hbp - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hbp * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbp - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * (Lbp - 50) ** 2 / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;

  const Cbp7 = Cbp ** 7;
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7));
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RT = -Math.sin(2 * dTheta * Math.PI / 180) * RC;

  return Math.sqrt(
    (dLp / SL) ** 2 +
    (dCp / SC) ** 2 +
    (dHp / SH) ** 2 +
    RT * (dCp / SC) * (dHp / SH)
  );
}

// Full Dialed.gg scoring pipeline
export function scoreGuess(targetHsb, guessHsb) {
  const labTarget = rgbToLab(...hsbToRgb(...targetHsb));
  const labGuess  = rgbToLab(...hsbToRgb(...guessHsb));

  const dE = ciede2000(labTarget, labGuess);

  // S-curve: midpoint 25.25, steepness 1.55
  const base = 10 / (1 + (dE / 25.25) ** 1.55);

  // Hue difference (shortest path around the wheel)
  const hueDiff = Math.min(
    Math.abs(targetHsb[0] - guessHsb[0]),
    360 - Math.abs(targetHsb[0] - guessHsb[0])
  );
  const avgSat = (targetHsb[1] + guessHsb[1]) / 2;

  // Hue recovery (within ~25°)
  const hueAccuracy = Math.max(0, 1 - (hueDiff / 25) ** 1.5);
  const satWeightR  = Math.min(1, avgSat / 30);
  const recovery    = (10 - base) * hueAccuracy * satWeightR * 0.25;

  // Hue penalty (beyond 30°)
  const huePenFactor = Math.max(0, (hueDiff - 30) / 150);
  const satWeightP   = Math.min(1, avgSat / 40);
  const penalty      = base * huePenFactor * satWeightP * 0.15;

  return Math.max(0, Math.min(10, base + recovery - penalty));
}

export function luma(h, s, b) {
  const [r, g, bl] = hsbToRgb(h, s, b);
  return (0.299 * r + 0.587 * g + 0.114 * bl) / 255;
}

function deltaE(hsb1, hsb2) {
  return ciede2000(rgbToLab(...hsbToRgb(...hsb1)), rgbToLab(...hsbToRgb(...hsb2)));
}

const PALETTE_FAMILIES = [
  { h: [0, 30],    s: [70, 95], b: [50, 85] },  // red / coral
  { h: [30, 60],   s: [70, 95], b: [50, 80] },  // orange / amber
  { h: [60, 90],   s: [55, 85], b: [40, 70] },  // yellow / olive
  { h: [90, 185],  s: [55, 90], b: [35, 70] },  // green / teal
  { h: [185, 260], s: [55, 90], b: [35, 75] },  // sky / blue / indigo
  { h: [260, 310], s: [55, 85], b: [35, 70] },  // violet / purple
  { h: [310, 360], s: [60, 90], b: [45, 80] },  // pink / magenta
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickFromFamily({ h, s, b }) {
  return [randInt(h[0], h[1]), randInt(s[0], s[1]), randInt(b[0], b[1])];
}

export function generateColors(n = 5, mode = 'classic') {
  if (mode === 'hard') {
    return Array.from({ length: n }, () => {
      if (Math.random() < 0.45) {
        return [
          Math.floor(Math.random() * 360),
          15 + Math.floor(Math.random() * 30),
          30 + Math.floor(Math.random() * 40),
        ];
      }
      return [
        Math.floor(Math.random() * 360),
        50 + Math.floor(Math.random() * 50),
        45 + Math.floor(Math.random() * 50),
      ];
    });
  }

  const families = shuffle(PALETTE_FAMILIES).slice(0, n);
  const result = [];
  const MIN_DELTA_E = 25;
  const MAX_ATTEMPTS = 50;

  for (const family of families) {
    let candidate;
    let attempts = 0;

    do {
      candidate = pickFromFamily(family);
      attempts++;
      const tooClose = result.some(existing => deltaE(existing, candidate) < MIN_DELTA_E);
      if (!tooClose) break;
    } while (attempts < MAX_ATTEMPTS);

    result.push(candidate);
  }

  return result;
}
