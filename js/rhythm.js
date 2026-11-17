// Ejercicio de ritmo: se lee un compás, se oye una cuenta de entrada y se marca
// el ritmo tocando una zona grande de la pantalla. La app mide qué tan a tiempo cae cada toque.

const INK = '#04193a';
const ACCENT = '#00a88d';
const GOOD = '#0f9d72';
const BAD = '#d64545';

// Duración de cada figura, en pulsos.
const BEATS = { w: 4, hd: 3, h: 2, qd: 1.5, q: 1, 8: 0.5, 16: 0.25 };

const MATCH_MS = 220; // ventana para emparejar un toque con una nota
const GOOD_MS = 130; // dentro de este margen el toque cuenta como preciso
const TENDENCY_MS = 60; // error medio a partir del cual se avisa la tendencia
const LEAD_MS = 350; // espera entre el botón y el primer clic
const GRACE_MS = 260; // margen tras el compás para la última nota
const PASS = 0.8;

// Niveles en orden de aprendizaje. tempo en pulsos por minuto; beats, pulsos por compás.
export const RHYTHM_LEVELS = [
  {
    title: 'Negras, blancas y redonda',
    tempo: 72,
    beats: 4,
    patterns: [
      ['q', 'q', 'q', 'q'],
      ['h', 'h'],
      ['h', 'q', 'q'],
      ['q', 'q', 'h'],
      ['q', 'h', 'q'],
      ['w'],
    ],
  },
  {
    title: 'Corcheas',
    tempo: 66,
    beats: 4,
    patterns: [
      ['8', '8', 'q', 'q', 'q'],
      ['q', '8', '8', 'q', 'q'],
      ['8', '8', '8', '8', 'q', 'q'],
      ['q', 'q', '8', '8', 'q'],
      ['8', '8', 'q', '8', '8', 'q'],
      ['q', 'q', 'q', '8', '8'],
      ['8', '8', 'q', 'h'],
    ],
  },
  {
    title: 'Compás de 3/4',
    tempo: 72,
    beats: 3,
    patterns: [
      ['q', 'q', 'q'],
      ['h', 'q'],
      ['q', 'h'],
      ['hd'],
      ['8', '8', 'q', 'q'],
      ['q', '8', '8', 'q'],
      ['q', 'q', '8', '8'],
    ],
  },
  {
    title: 'Negra con puntillo',
    tempo: 66,
    beats: 4,
    patterns: [
      ['qd', '8', 'q', 'q'],
      ['qd', '8', 'h'],
      ['q', 'qd', '8', 'q'],
      ['qd', '8', 'qd', '8'],
      ['q', 'q', 'qd', '8'],
      ['h', 'qd', '8'],
    ],
  },
  {
    title: 'Semicorcheas',
    tempo: 54,
    beats: 4,
    patterns: [
      ['16', '16', '16', '16', 'q', 'q', 'q'],
      ['q', '16', '16', '16', '16', 'q', 'q'],
      ['8', '16', '16', 'q', 'q', 'q'],
      ['16', '16', '8', 'q', 'q', 'q'],
      ['q', 'q', '16', '16', '16', '16', 'q'],
      ['q', '8', '16', '16', 'q', 'q'],
    ],
  },
];

let lastPick = '';

// Elige un patrón del nivel (desde 1), sin repetir el último que se entregó.
export function pickRhythm(level) {
  const n = Math.max(1, Math.min(RHYTHM_LEVELS.length, Math.round(Number(level)) || 1));
  const lv = RHYTHM_LEVELS[n - 1];
  let i = Math.floor(Math.random() * lv.patterns.length);
  if (lv.patterns.length > 1 && `${n}:${i}` === lastPick) i = (i + 1 + Math.floor(Math.random() * (lv.patterns.length - 1))) % lv.patterns.length;
  lastPick = `${n}:${i}`;
  return { level: n, title: lv.title, tempo: lv.tempo, beats: lv.beats, notes: [...lv.patterns[i]] };
}

// ---------- Cálculo ----------

// Momento en que empieza cada nota, en pulsos desde el inicio del compás.
function onsetsOf(notes) {
  let t = 0;
  return notes.map((d) => {
    const at = t;
    t += BEATS[d] || 1;
    return at;
  });
}

// Sílaba para contar: 1, 2, 3, 4 en el pulso; «y» en la mitad; «e» y «a» en los cuartos.
function syllable(onset) {
  const beat = Math.floor(onset + 1e-6);
  const part = Math.round((onset - beat) * 4);
  return part === 0 ? String(beat + 1) : part === 2 ? 'y' : part === 1 ? 'e' : 'a';
}

// Empareja cada nota con el toque libre más cercano dentro de la ventana.
// expected y taps en milisegundos, sobre el mismo reloj.
function score(expected, taps) {
  const pairs = [];
  expected.forEach((e, i) => taps.forEach((t, j) => {
    const err = t - e;
    if (Math.abs(err) <= MATCH_MS) pairs.push({ i, j, err });
  }));
  pairs.sort((a, b) => Math.abs(a.err) - Math.abs(b.err));
  const errs = expected.map(() => null);
  const used = new Set();
  for (const p of pairs) {
    if (errs[p.i] !== null || used.has(p.j)) continue;
    errs[p.i] = p.err;
    used.add(p.j);
  }
  const hit = errs.filter((e) => e !== null);
  const matched = hit.length;
  return {
    states: errs.map((e) => (e === null ? 'miss' : Math.abs(e) <= GOOD_MS ? 'good' : 'ok')),
    errors: errs,
    matched,
    expected: expected.length,
    taps: taps.length,
    accuracy: matched / Math.max(expected.length, taps.length, 1),
    meanError: matched ? hit.reduce((a, b) => a + b, 0) / matched : 0,
  };
}

// ---------- Dibujo ----------

const NS = 'http://www.w3.org/2000/svg';
const COLOR = { good: GOOD, ok: GOOD, miss: BAD, current: ACCENT };

function svgEl(name, attrs) {
  const el = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// Dibuja el compás. states: por nota, 'good' | 'ok' | 'miss' | 'current' o nada.
function drawRhythm(container, notes, beats, states = [], marks = false) {
  const onsets = onsetsOf(notes);
  const VF = window.Vex && window.Vex.Flow;
  const spoken = onsets.map(syllable).join(' ');
  container.innerHTML = '';
  if (!VF) {
    container.innerHTML = `<p class="rh-paper-text">${spoken}</p>`;
    return;
  }
  const width = notes.length > 6 ? 330 : notes.length > 4 ? 300 : 270;
  const height = marks ? 132 : 118;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const stave = new VF.Stave(5, -12, width - 10);
  stave.addClef('percussion');
  stave.addTimeSignature(`${beats}/4`);
  stave.setContext(ctx).draw();

  const vfNotes = notes.map((d, i) => {
    const note = new VF.StaveNote({ keys: ['b/4'], duration: d, stem_direction: 1 });
    if (d.endsWith('d')) VF.Dot.buildAndAttach([note], { all: true });
    const color = COLOR[states[i]] || INK;
    note.setStyle({ fillStyle: color, strokeStyle: color });
    if (note.setStemStyle) note.setStemStyle({ fillStyle: color, strokeStyle: color });
    if (note.setFlagStyle) note.setFlagStyle({ fillStyle: color, strokeStyle: color });
    return note;
  });

  // Una barra por pulso: se unen las corcheas y semicorcheas que comparten tiempo.
  const beams = [];
  let group = [];
  let groupBeat = -1;
  const closeGroup = () => {
    if (group.length > 1) {
      const beam = new VF.Beam(group.map((i) => vfNotes[i]));
      const first = states[group[0]];
      const color = group.every((i) => states[i] === first || COLOR[states[i]] === COLOR[first]) ? COLOR[first] || INK : INK;
      beam.setStyle({ fillStyle: color, strokeStyle: color });
      beams.push(beam);
    }
    group = [];
  };
  notes.forEach((d, i) => {
    const beat = Math.floor(onsets[i] + 1e-6);
    if (BEATS[d] >= 1 || beat !== groupBeat) closeGroup();
    if (BEATS[d] < 1) {
      group.push(i);
      groupBeat = beat;
    }
  });
  closeGroup();

  const voice = new VF.Voice({ num_beats: beats, beat_value: 4 }).setStrict(false);
  voice.addTickables(vfNotes);
  new VF.Formatter().joinVoices([voice]).format([voice], width - (stave.getNoteStartX() - stave.getX()) - 26);
  voice.draw(ctx, stave);
  beams.forEach((b) => b.setContext(ctx).draw());

  const svg = container.querySelector('svg');
  const textY = stave.getYForLine(4) + 27;
  vfNotes.forEach((note, i) => {
    const x = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
    const color = COLOR[states[i]] || INK;
    const text = svgEl('text', { x, y: textY, 'text-anchor': 'middle', 'font-family': 'Arial, Helvetica, sans-serif', 'font-size': 15, 'font-weight': 700, fill: color, stroke: 'none' });
    text.textContent = syllable(onsets[i]);
    svg.appendChild(text);
    if (!marks || !states[i] || states[i] === 'current') return;
    // Marca bajo la sílaba, para no depender solo del color.
    const y = textY + 11;
    const d = states[i] === 'miss'
      ? `M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8`
      : `M${x - 5} ${y}l3.5 3.5 6.5-7.5`;
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  });

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.maxWidth = `${Math.round(width * 1.45)}px`;
  svg.style.height = 'auto';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Ritmo en compás de ${beats}/4. Se cuenta: ${spoken}`);
}

// ---------- Sonido ----------

let actx = null;
let bus = null;
let voices = [];

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx || actx.state === 'closed') {
    try {
      actx = new AC();
    } catch (e) {
      actx = null;
    }
  }
  return actx;
}

// Convierte tiempos de performance.now() al reloj del audio, a partir de una sola referencia.
function audioClock(ctx) {
  let ref = { audio: ctx.currentTime, perf: performance.now() };
  try {
    const ts = ctx.getOutputTimestamp && ctx.getOutputTimestamp();
    const lag = ts ? ctx.currentTime - ts.contextTime : -1;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0 && lag >= 0 && lag < 0.5) ref = { audio: ts.contextTime, perf: ts.performanceTime };
  } catch (e) { /* se usa la referencia simple */ }
  return (perfMs) => ref.audio + (perfMs - ref.perf) / 1000;
}

function blip(ctx, when, { freq, dur, gain, type = 'sine' }) {
  if (!bus) return;
  try {
    const t = Math.max(when, ctx.currentTime + 0.005);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env);
    env.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    voices.push(osc);
  } catch (e) { /* sin sonido, el ejercicio sigue en pantalla */ }
}

function stopAudio() {
  voices.forEach((o) => {
    try {
      o.stop();
      o.disconnect();
    } catch (e) { /* ya había terminado */ }
  });
  voices = [];
  if (bus) {
    try {
      bus.disconnect();
    } catch (e) { /* nada que desconectar */ }
    bus = null;
  }
}

// ---------- Estado y temporizadores ----------

const timers = new Set();
let raf = 0;
let runId = 0;
let current = null; // ejercicio en pantalla

function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
  return id;
}

function halt() {
  runId += 1;
  timers.forEach((id) => clearTimeout(id));
  timers.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  stopAudio();
}

// Detiene temporizadores, animación y sonido. Se puede llamar en cualquier momento.
export function stopRhythm() {
  halt();
  const ex = current;
  if (ex && !ex.finished && ex.root.isConnected && ['countin', 'playing', 'listening'].includes(ex.root.dataset.state)) ex.toIdle();
}

// Prepara el audio dentro del gesto del usuario. Devuelve el contexto o null si no hay sonido.
async function wakeAudio() {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state !== 'running') {
    try {
      await Promise.race([ctx.resume(), new Promise((res) => later(res, 500))]);
    } catch (e) { /* sigue sin sonido */ }
  }
  if (ctx.state !== 'running') return null;
  try {
    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(ctx.destination);
  } catch (e) {
    bus = null;
    return null;
  }
  return ctx;
}

// ---------- Pantalla ----------

// pattern: lo que devuelve pickRhythm. shell(html) pone el HTML en pantalla.
// onDone({ passed, firstTry, accuracy }) se llama una sola vez, al presionar «Seguir».
export function renderRhythmExercise({ pattern, shell, onDone }) {
  halt();
  const notes = pattern.notes;
  const beats = pattern.beats;
  const beatMs = 60000 / pattern.tempo;
  const onsets = onsetsOf(notes);

  shell(`
    <section class="stack rh" id="rh-root" data-state="idle">
      <p class="eyebrow center">Ritmo · ${pattern.title}</p>
      <p class="prompt">Marca este ritmo con el pulso</p>
      <div class="paper rh-paper" id="rh-score"></div>
      <div class="rh-beats" id="rh-beats" aria-hidden="true">${'<i class="rh-beat"></i>'.repeat(beats)}</div>
      <p class="feedback rh-feedback" id="rh-feedback" role="status"></p>
      <button type="button" class="rh-pad" id="rh-pad" aria-label="Zona para marcar el ritmo">
        <span class="rh-pad-count" id="rh-count" aria-hidden="true"></span>
        <span class="rh-pad-label" id="rh-pad-label">Toca aquí</span>
        <span class="rh-pad-sub" id="rh-pad-sub"></span>
      </button>
    </section>
    <div class="spacer"></div>
    <div class="rh-actions">
      <button type="button" class="btn" id="rh-listen">Escuchar</button>
      <button type="button" class="btn btn-primary" id="rh-start">Empezar</button>
    </div>
    <div class="rh-more"><button type="button" class="link" id="rh-skip" hidden>Seguir</button></div>
  `);

  const q = (sel) => document.querySelector(sel);
  const root = q('#rh-root');
  const scoreEl = q('#rh-score');
  const dots = [...document.querySelectorAll('#rh-beats .rh-beat')];
  const fb = q('#rh-feedback');
  const pad = q('#rh-pad');
  const countEl = q('#rh-count');
  const padLabel = q('#rh-pad-label');
  const padSub = q('#rh-pad-sub');
  const listenBtn = q('#rh-listen');
  const startBtn = q('#rh-start');
  const skipBtn = q('#rh-skip');

  const ex = { root, finished: false, attempts: 0, fails: 0, last: null, taps: [], playStart: 0, toIdle };
  current = ex;

  const setFb = (text, cls) => {
    fb.textContent = text;
    fb.className = 'feedback rh-feedback ' + (cls || '');
  };
  const setState = (state) => {
    root.dataset.state = state;
  };
  const lightBeat = (i) => dots.forEach((d, k) => d.classList.toggle('rh-beat-on', k === i));
  const setCount = (text) => {
    countEl.textContent = text;
    if (!text) return;
    countEl.classList.remove('rh-count-pop');
    void countEl.offsetWidth;
    countEl.classList.add('rh-count-pop');
  };
  const setBusy = (busy) => {
    listenBtn.disabled = busy;
    startBtn.disabled = busy;
    skipBtn.disabled = busy;
  };
  const resetPad = () => {
    pad.classList.remove('rh-pad-good', 'rh-pad-bad');
    setCount('');
    padLabel.textContent = 'Toca aquí';
    padSub.textContent = '';
  };

  function toIdle() {
    setState('idle');
    lightBeat(-1);
    resetPad();
    setBusy(false);
    scoreEl.classList.remove('paper-good', 'paper-bad');
    drawRhythm(scoreEl, notes, beats);
    if (ex.attempts === 0) setFb('Escucha cómo suena o empieza cuando quieras.', 'feedback-hint');
    else setFb('Cuando quieras, inténtalo otra vez.', 'feedback-hint');
  }

  const alive = (id) => id === runId && root.isConnected;

  // Sigue el pulso en pantalla. t0: momento (performance.now) del primer pulso.
  function followPulse(id, t0, onBeat) {
    let shown = -1;
    const frame = () => {
      if (id !== runId) return;
      if (!root.isConnected) return halt();
      const k = Math.floor((performance.now() - t0) / beatMs);
      if (k >= 0 && k !== shown) {
        shown = k;
        onBeat(k);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function clicks(ctx, t0, count, soft) {
    if (!ctx) return;
    const at = audioClock(ctx);
    for (let k = 0; k < count; k++) {
      const first = k % beats === 0;
      blip(ctx, at(t0 + k * beatMs), { freq: first ? 1568 : 1046, dur: 0.07, gain: (first ? 0.5 : 0.32) * (soft ? 0.3 : 1), type: 'square' });
    }
    return at;
  }

  // «Escuchar»: el pulso suave y el ritmo con otro sonido, resaltando cada nota.
  async function listen() {
    halt();
    const id = runId;
    setBusy(true);
    resetPad();
    scoreEl.classList.remove('paper-good', 'paper-bad');
    setState('listening');
    setFb('Así suena. El clic marca el pulso.', 'feedback-hint');
    drawRhythm(scoreEl, notes, beats);
    const ctx = await wakeAudio();
    if (!alive(id)) return;
    const t0 = performance.now() + LEAD_MS;
    const at = clicks(ctx, t0, beats, true);
    notes.forEach((d, i) => {
      const len = (BEATS[d] * beatMs) / 1000;
      if (ctx) blip(ctx, at(t0 + onsets[i] * beatMs), { freq: 493.88, dur: Math.max(0.12, Math.min(len * 0.92, 1.6)), gain: 0.5, type: 'triangle' });
      later(() => {
        if (alive(id)) drawRhythm(scoreEl, notes, beats, notes.map((_, k) => (k === i ? 'current' : null)));
      }, t0 + onsets[i] * beatMs - performance.now());
    });
    followPulse(id, t0, (k) => lightBeat(k < beats ? k : -1));
    later(() => {
      if (!alive(id)) return;
      halt();
      const back = ex.last;
      if (back) showResult(back, false);
      else toIdle();
    }, t0 + beats * beatMs + 120 - performance.now());
  }

  // «Empezar»: un compás de cuenta y luego el compás que se marca.
  async function start() {
    halt();
    const id = runId;
    ex.attempts += 1;
    ex.taps = [];
    ex.playStart = 0;
    setBusy(true);
    resetPad();
    skipBtn.hidden = true;
    scoreEl.classList.remove('paper-good', 'paper-bad');
    drawRhythm(scoreEl, notes, beats);
    setState('countin');
    padLabel.textContent = 'Prepárate';
    setFb('Escucha el pulso y cuenta.', 'feedback-hint');
    const ctx = await wakeAudio();
    if (!alive(id)) return;
    const t0 = performance.now() + LEAD_MS;
    const playStart = t0 + beats * beatMs;
    ex.playStart = playStart;
    // Referencia para pruebas e integración: inicio del compás que se marca y duración del pulso.
    root.dataset.start = String(playStart);
    root.dataset.beatMs = String(beatMs);
    clicks(ctx, t0, beats * 2, false);
    followPulse(id, t0, (k) => {
      if (k < beats) {
        lightBeat(k);
        setCount(String(k + 1));
      } else if (k < beats * 2) {
        if (root.dataset.state !== 'playing') {
          setState('playing');
          setCount('');
          padLabel.textContent = 'Toca aquí';
          setFb('Toca cada nota en su momento.', 'feedback-hint');
        }
        lightBeat(k - beats);
      } else lightBeat(-1);
    });
    later(() => {
      if (!alive(id)) return;
      const result = score(onsets.map((o) => playStart + o * beatMs), ex.taps);
      halt();
      ex.last = result;
      if (result.accuracy < PASS) ex.fails += 1;
      showResult(result, true);
    }, playStart + beats * beatMs + GRACE_MS - performance.now());
  }

  function showResult(r, fresh) {
    const passed = r.accuracy >= PASS;
    setState('result');
    lightBeat(-1);
    setBusy(false);
    drawRhythm(scoreEl, notes, beats, r.states, true);
    if (fresh) {
      scoreEl.classList.remove('paper-good', 'paper-bad');
      void scoreEl.offsetWidth;
      scoreEl.classList.add(passed ? 'paper-good' : 'paper-bad');
    }
    pad.classList.toggle('rh-pad-good', passed);
    pad.classList.toggle('rh-pad-bad', !passed);
    countEl.textContent = `${r.matched} de ${r.expected}`;
    padLabel.textContent = 'a tiempo';
    padSub.textContent = '';

    const parts = [];
    if (r.taps === 0) parts.push('No se registró ningún toque. Toca el recuadro siguiendo el ritmo.');
    else {
      parts.push(`${passed ? '¡Muy bien!' : r.accuracy >= 0.5 ? 'Casi.' : 'Aún no.'} ${r.matched} de ${r.expected} a tiempo.`);
      const extra = r.taps - r.expected;
      if (extra > 0) parts.push(extra === 1 ? 'Tocaste una vez de más.' : `Tocaste ${extra} veces de más.`);
      if (r.matched > 0 && r.meanError < -TENDENCY_MS) parts.push('Tiendes a adelantarte: espera el pulso.');
      else if (r.matched > 0 && r.meanError > TENDENCY_MS) parts.push('Tiendes a atrasarte: anticipa un poco.');
    }
    setFb(parts.join(' '), passed ? 'feedback-good' : 'feedback-bad');

    if (passed) {
      listenBtn.hidden = true;
      startBtn.textContent = 'Seguir';
      startBtn.onclick = () => finish({ passed: true, firstTry: ex.attempts === 1, accuracy: r.accuracy });
      skipBtn.hidden = true;
    } else {
      startBtn.textContent = 'Intentar otra vez';
      skipBtn.hidden = ex.fails < 2;
      skipBtn.onclick = () => finish({ passed: false, firstTry: false, accuracy: r.accuracy });
    }
  }

  function finish(result) {
    if (ex.finished) return;
    ex.finished = true;
    halt();
    if (current === ex) current = null;
    onDone(result);
  }

  // Cada toque: respuesta visual inmediata y, si el compás está en curso, se anota su momento.
  function tap(when) {
    pad.classList.remove('rh-pad-hit');
    void pad.offsetWidth;
    pad.classList.add('rh-pad-hit', 'rh-pad-hit-flat');
    setTimeout(() => pad.classList.remove('rh-pad-hit-flat'), 110);
    const state = root.dataset.state;
    if (state === 'idle') return setFb('Primero presiona «Empezar».', 'feedback-hint');
    if ((state === 'countin' || state === 'playing') && ex.playStart && when >= ex.playStart - MATCH_MS) ex.taps.push(when);
  }

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const now = performance.now();
    // El momento del evento es más fiel que el del manejador, si el navegador lo da en el mismo reloj.
    const stamp = e.isTrusted && e.timeStamp > 0 && e.timeStamp <= now && now - e.timeStamp < 100 ? e.timeStamp : now;
    tap(stamp);
  });
  pad.addEventListener('keydown', (e) => {
    if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    tap(performance.now());
  });
  pad.addEventListener('contextmenu', (e) => e.preventDefault());

  listenBtn.onclick = listen;
  startBtn.onclick = start;
  toIdle();
}
