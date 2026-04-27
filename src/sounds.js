let _ctx = null;
let _master = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _master = _ctx.createGain();
    _master.gain.value = 0.6;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function dest() {
  getCtx();
  return _master;
}

function playNote(freq, type, startTime, duration, gain = 0.25) {
  const c = getCtx();
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const attack = 0.005;
  const release = Math.min(0.01, duration * 0.2);
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + attack);
  env.gain.setValueAtTime(gain, startTime + duration - release);
  env.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(env);
  env.connect(dest());
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

export function playClick() {
  const c = getCtx();
  playNote(880, 'square', c.currentTime, 0.04, 0.18);
}

export function playMemorizeStart() {
  const c = getCtx();
  const t = c.currentTime;
  playNote(220, 'sine', t, 0.2, 0.12);
  playNote(330, 'sine', t + 0.15, 0.2, 0.09);
}

export function playTick() {
  const c = getCtx();
  playNote(1200, 'square', c.currentTime, 0.025, 0.1);
}

export function playTickUrgent() {
  const c = getCtx();
  const t = c.currentTime;
  playNote(1400, 'square', t, 0.025, 0.14);
  playNote(1600, 'square', t + 0.09, 0.025, 0.14);
}

export function playScoreReveal(score) {
  const c = getCtx();
  const t = c.currentTime;
  const base = 220 + Math.round(score * 28);
  [1, 1.25, 1.5, 2].forEach((r, i) => {
    playNote(base * r, 'square', t + i * 0.15, 0.12, 0.16);
  });
}

export function playResultJingle(score) {
  const c = getCtx();
  const t = c.currentTime;
  if (score >= 8) {
    [523, 659, 784, 1047].forEach((f, i) => playNote(f, 'square', t + i * 0.15, 0.2, 0.18));
  } else if (score >= 5) {
    playNote(440, 'sine', t, 0.2, 0.13);
    playNote(523, 'sine', t + 0.2, 0.25, 0.11);
  } else {
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.6);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16, t + 0.03);
    env.gain.setValueAtTime(0.16, t + 0.5);
    env.gain.linearRampToValueAtTime(0, t + 0.6);
    osc.connect(env);
    env.connect(dest());
    osc.start(t);
    osc.stop(t + 0.62);
  }
}

export function playFinalFanfare(totalScore, maxScore) {
  const c = getCtx();
  const t = c.currentTime;
  const ratio = totalScore / maxScore;
  if (ratio >= 0.85) {
    const melody = [523, 659, 784, 659, 784, 880, 1047, 1047];
    const durs   = [0.12, 0.12, 0.12, 0.09, 0.09, 0.12, 0.25, 0.45];
    let time = t;
    melody.forEach((f, i) => { playNote(f, 'square', time, durs[i] * 0.85, 0.18); time += durs[i]; });
  } else if (ratio >= 0.6) {
    [392, 440, 523, 659, 784].forEach((f, i) => playNote(f, 'square', t + i * 0.14, 0.17, 0.16));
  } else {
    [523, 440, 330].forEach((f, i) => playNote(f, 'sine', t + i * 0.2, 0.3, 0.13));
  }
}

export function playTransition() {
  const c = getCtx();
  const t = c.currentTime;

  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.14, t + 0.015);
  env.gain.linearRampToValueAtTime(0, t + 0.1);
  osc.connect(env);
  env.connect(dest());
  osc.start(t);
  osc.stop(t + 0.11);

  const bufferSize = Math.floor(c.sampleRate * 0.07);
  const buf = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = 1200;
  flt.Q.value = 3;
  const noiseEnv = c.createGain();
  noiseEnv.gain.setValueAtTime(0, t);
  noiseEnv.gain.linearRampToValueAtTime(0.07, t + 0.01);
  noiseEnv.gain.linearRampToValueAtTime(0, t + 0.07);
  src.connect(flt);
  flt.connect(noiseEnv);
  noiseEnv.connect(dest());
  src.start(t);
  src.stop(t + 0.08);
}

export function playSliderTick() {
  const c = getCtx();
  playNote(660, 'sine', c.currentTime, 0.022, 0.07);
}

export function playSubmit() {
  const c = getCtx();
  const t = c.currentTime;
  [440, 554, 659].forEach((f, i) => playNote(f, 'square', t + i * 0.07, 0.1, 0.18));
}
