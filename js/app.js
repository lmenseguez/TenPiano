import {
  NOTES, NOTE_BY_MIDI, MAX_BOX, LESSONS, TOTAL_LESSONS, TRACKS, SESSION_PARTS, GOALS,
  CHORDS, CHORD_BY_ID, CHORD_LEVELS, chordText, BASS_NOTES, noteInfo, ALL_NOTES_COUNT, ACHIEVEMENTS,
  FLUENT_MS, FLUENT_CHORD_MS,
} from './data.js';
import * as store from './store.js';
import { buildSession, buildPlacement } from './session.js';
import { drawStaff, drawKeyboard, drawExample, foldToKeyboard } from './staff.js';
import { app, mic, show, $, $$, plural, heardLabel, pcName, meterPct, stopMic, startMic, BRAND, backHeader, icon, ring, celebrate, setNav } from './ui.js';
import { renderSongs } from './songs.js';

let session = null;

store.load();

// Notación para mostrar un acorde en una tarjeta: letras, nombres, o una de las dos al azar.
function pickNotation() {
  const n = store.getState().settings.notation;
  if (n === 'both') return Math.random() < 0.5 ? 'letters' : 'names';
  return n;
}

function progress() {
  const chordsFirm = store.firmCount('c');
  const notesFirm = store.firmCount('n') + store.firmCount('b');
  const lessons = store.lessonsDone('chords') + store.lessonsDone('staff');
  return { chordsFirm, notesFirm, lessons };
}

// Lo que trae la próxima sesión: lección, acordes y notas nuevas.
function upcoming() {
  const lc = store.lessonsDone('chords');
  const ls = store.lessonsDone('staff');
  const track = lc < LESSONS.chords.length && (lc <= ls || ls >= LESSONS.staff.length) ? 'chords' : ls < LESSONS.staff.length ? 'staff' : null;
  const items = [];
  if (track) items.push({ icon: 'book', text: `Teoría: ${LESSONS[track][track === 'chords' ? lc : ls].title}` });
  const chords = store.getState().chords && Object.keys(store.getState().chords).length ? store.nextNew('c') : [];
  if (chords.length) items.push({ icon: 'keys', text: `${chords.length === 1 ? 'Acorde nuevo' : 'Acordes nuevos'}: ${chords.map((id) => CHORD_BY_ID.get(id).letters).join(' y ')}` });
  const notes = store.nextNew('n');
  if (notes.length) items.push({ icon: 'staff', text: `Mano derecha: ${notes.map((m) => NOTE_BY_MIDI.get(m).label).join(', ')}` });
  const bass = store.nextNew('b');
  if (bass.length) items.push({ icon: 'staff', text: `Mano izquierda: ${bass.map((m) => noteInfo('b', m).label).join(', ')}` });
  if (items.length <= (track ? 1 : 0)) items.push({ icon: 'target', text: 'Afirmar lo que ya viste para desbloquear lo siguiente' });
  return items;
}

// Preparación general para las piezas meta: promedio de acordes, notas y teoría.
function readiness() {
  const p = progress();
  return Math.round(((p.chordsFirm / CHORDS.length + p.notesFirm / ALL_NOTES_COUNT + p.lessons / TOTAL_LESSONS) / 3) * 100);
}

function achievementBadge(a, { fresh = false } = {}) {
  return `<div class="badge-card ${fresh ? 'badge-new' : ''}"><span class="tile-ico warm">${icon(a.icon)}</span><span class="grow"><strong>${a.title}</strong><br><span class="small muted">${a.text}</span></span></div>`;
}

// ---------- inicio ----------

function renderHome() {
  stopMic();
  session = null;
  const state = store.getState();
  const st = store.streakStatus();
  const week = store.weekSummary();
  const p = progress();
  const pct = (v, t) => Math.round((v / t) * 100);
  const ready = readiness();
  const nextAch = store.nextAchievement();

  let status;
  if (st.doneToday) status = 'Hoy ya practicaste. Puedes repetir cuando quieras.';
  else if (st.atRisk) status = `Si practicas hoy, tu racha sigue (usa ${plural(st.willUse, 'día de perdón', 'días de perdón')}).`;
  else if (st.lost) status = 'La racha se reinició. Hoy empiezas una nueva.';
  else if (st.streak > 0) status = 'Te falta la sesión de hoy para sumar un día.';
  else status = 'Tu primera sesión te espera.';

  const days = store.lastDays().map((d) => `
    <div class="day ${d.done ? 'day-on' : ''} ${d.today ? 'day-today' : ''}">
      <span class="day-dot">${icon('check')}</span><span>${d.label}</span>
    </div>`).join('');

  show(`
    <header class="row-between">
      ${BRAND}
      <span class="pill pill-fire" aria-label="Racha: ${plural(st.streak, 'día', 'días')}">${icon('flame')}${st.streak}</span>
    </header>

    <section class="hero">
      <p class="eyebrow">${st.doneToday ? 'Hecho por hoy · mañana te espera' : 'Hoy te toca'}</p>
      <h2>${st.doneToday ? `Vas por ${plural(st.streak, 'día', 'días')}` : '10 minutos de piano'}</h2>
      <ul class="hero-list">
        ${upcoming().slice(0, 3).map((u) => `<li>${icon(u.icon)}<span>${u.text}</span></li>`).join('')}
      </ul>
      <button class="hero-go" id="start">${icon('play')}${st.doneToday ? 'Practicar otra vez' : 'Empezar'}</button>
    </section>

    <section class="tiles">
      <button class="tile" id="start-min">
        <span class="tile-ico warm">${icon('bolt')}</span>
        <strong>Sesión mínima</strong>
        <span class="small muted">2 minutos, para los días difíciles</span>
      </button>
      <button class="tile" id="mictest">
        <span class="tile-ico violet">${icon('mic')}</span>
        <strong>Probar micrófono</strong>
        <span class="small muted">Comprueba que oye tu teclado</span>
      </button>
    </section>

    <section class="card stack">
      <div class="row-between">
        <h2>Esta semana</h2>
        <span class="small muted">${plural(week.minutes, 'minuto', 'minutos')}</span>
      </div>
      <div class="week">${days}</div>
      <p class="small muted">${status}${week.accuracy === null ? '' : ` Aciertos al primer intento: ${week.accuracy}%.`} Días de perdón: ${state.freezes}.</p>
    </section>

    <section class="card stack">
      <div class="row-between"><h2>Tu avance</h2><button class="link" id="path">Ver plan</button></div>
      <div class="rings">
        <div>${ring(pct(p.chordsFirm, CHORDS.length), `${p.chordsFirm}/${CHORDS.length}`)}<div class="small"><strong>Acordes</strong></div></div>
        <div>${ring(pct(p.notesFirm, ALL_NOTES_COUNT), `${p.notesFirm}/${ALL_NOTES_COUNT}`, { color: 'url(#g-violet)' })}<div class="small"><strong>Pentagrama</strong></div></div>
        <div>${ring(pct(p.lessons, TOTAL_LESSONS), `${p.lessons}/${TOTAL_LESSONS}`, { color: 'url(#g-warm)' })}<div class="small"><strong>Teoría</strong></div></div>
      </div>
    </section>

    <section class="card stack">
      <div class="row-between"><p class="eyebrow">Tu meta</p><span class="pill">${ready}% listo</span></div>
      <div class="bar"><div style="width:${ready}%"></div></div>
      ${GOALS.map((g) => {
        const firm = g.chords ? g.chords.filter((id) => (store.stat('c', id)?.box || 0) >= 3).length : null;
        return `<div class="goal-chip"><span class="tile-ico">${icon('target')}</span><span class="grow"><strong>${g.title}</strong><br><span class="small muted">${g.chords ? `Sus acordes (${g.chords.join(', ')}): ${firm} de ${g.chords.length} firmes` : g.by}</span></span></div>`;
      }).join('')}
      ${nextAch ? `<p class="small muted">${icon('star')} Próximo logro: <strong>${nextAch.title}</strong>. Te ${nextAch.left === 1 ? 'falta' : 'faltan'} ${plural(nextAch.left, nextAch.unit[0], nextAch.unit[1])}.</p>` : ''}
    </section>
    ${store.isMemoryOnly() ? '<p class="small muted center">Este navegador no permite guardar el progreso. Lo que practiques se perderá al cerrar.</p>' : ''}
  `, { tab: 'today' });

  $('#start').onclick = () => startSession({ minimal: false });
  $('#start-min').onclick = () => startSession({ minimal: true });
  $('#mictest').onclick = renderMicTest;
  $('#path').onclick = renderPath;
}

// ---------- sesión ----------

async function startSession({ minimal = false, placement = false } = {}) {
  let input = store.getState().settings.input;
  let micNote = '';
  if (input === 'mic') {
    micNote = await startMic();
    if (micNote) input = 'screen';
  }
  const steps = placement ? buildPlacement(NOTES.map((n) => n.midi)) : buildSession({ minimal });
  store.save();
  session = {
    steps,
    index: 0,
    minimal,
    placement,
    placed: [],
    input,
    showKeys: input === 'screen',
    micNote,
    startedAt: Date.now(),
    answered: 0,
    firstTry: 0,
    lesson: null,
    missed: new Map(),
    results: [], // { group, label, tip, firstTry, slow, up, firmed }
  };
  renderStep();
}

function sessionShell(inner) {
  const pct = Math.round((session.index / session.steps.length) * 100);
  show(`
    <header class="row">
      <button class="icon-btn" id="quit" aria-label="Salir de la sesión">${icon('close')}</button>
      <div class="progress grow" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
    </header>
    ${inner}
  `, { animate: session.index === 0 || ['section', 'theory', 'intro', 'chord-intro'].includes(session.steps[session.index]?.type) });
  $('#quit').onclick = () => {
    store.save();
    renderHome();
  };
}

function renderStep() {
  mic.onNote = null;
  mic.expect = null;
  if (session.index >= session.steps.length) return session.placement ? finishPlacement() : finishSession();
  const step = session.steps[session.index];
  switch (step.type) {
    case 'section': return renderSection(step);
    case 'theory': return renderLesson(step.track, step.lesson, { inSession: true });
    case 'quiz': return renderQuiz(step.track, step.lesson, { review: true });
    case 'intro': return renderIntro(step);
    case 'chord-intro': return renderChordIntro(step);
    case 'chord-build': return renderChordBuild(step);
    case 'chord-name': return renderChordName(step);
    default: return renderPlay(step);
  }
}

function nextStep() {
  session.index += 1;
  renderStep();
}

function renderSection(step) {
  sessionShell(`
    <div class="spacer"></div>
    <section class="stack center">
      <div class="section-ico">${icon(step.title === 'Acordes' ? 'keys' : 'staff')}</div>
      <p class="eyebrow">Ahora</p>
      <h1>${step.title}</h1>
      <p class="muted">${step.text}</p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">Empezar</button>
  `);
  $('#ok').onclick = nextStep;
}

function listenRow(text = 'Escuchando tu teclado') {
  if (session.input !== 'mic') return '';
  return `<div class="listen">${icon('mic')}<span>${text}</span><div class="meter" aria-hidden="true"><div id="meter"></div></div></div>`;
}

// expect: dice qué nota espera el ejercicio, para que el micrófono no confunda
// la cola de la tecla anterior con una respuesta.
function bindMic(onNote, expect = null) {
  if (session.input !== 'mic') return;
  const meter = $('#meter');
  mic.onNote = onNote;
  mic.expect = expect;
  mic.onLevel = ({ level }) => {
    if (meter && meter.isConnected) meter.style.width = meterPct(level) + '%';
  };
}

// Anota un resultado en el resumen de la sesión.
function tally(firstTry, label) {
  session.answered += 1;
  if (firstTry) session.firstTry += 1;
  else session.missed.set(label, (session.missed.get(label) || 0) + 1);
}

// Guarda una respuesta en el progreso y en el resumen de la sesión.
// kind: 'c' acorde, 'n' nota en clave de sol, 'b' nota en clave de fa.
function recordAnswer(kind, id, firstTry, ms) {
  const before = store.stat(kind, id)?.box ?? 0;
  store.record(kind, id, firstTry, ms);
  const after = store.stat(kind, id)?.box ?? 0;
  let label;
  let tip;
  if (kind === 'c') {
    const c = CHORD_BY_ID.get(id);
    label = c.letters;
    tip = `Con nombres es ${c.latin}. Sus notas: ${c.names.join(', ')}.`;
  } else {
    const n = noteInfo(kind, id);
    label = kind === 'b' ? `${n.label} en clave de fa` : n.label;
    tip = n.where;
  }
  tally(firstTry, label);
  session.results.push({
    group: kind === 'c' ? 'Acordes' : kind === 'b' ? 'Mano izquierda' : 'Mano derecha',
    label,
    tip,
    firstTry,
    slow: firstTry && ms > (kind === 'c' ? FLUENT_CHORD_MS : FLUENT_MS),
    up: after > before,
    firmed: before < 3 && after >= 3,
  });
}

// ---------- teoría ----------

const TRACK_NAME = { chords: 'Acordes', staff: 'Pentagrama' };

function lessonHtml(track, index) {
  const l = LESSONS[track][index];
  const chord = l.chord ? CHORD_BY_ID.get(l.chord) || null : null;
  return `
    <section class="stack lesson">
      <p class="eyebrow">Teoría · ${TRACK_NAME[track]} · ${index + 1} de ${LESSONS[track].length}</p>
      <h2>${l.title}</h2>
      ${l.staff ? '<div class="paper" id="example"></div>' : ''}
      ${l.body.map((p) => `<p>${p}</p>`).join('')}
      ${l.keyboard || l.key || l.chord ? '<div class="keys-box" id="keys"></div>' : ''}
      ${chord ? `<p class="small muted center">${chordText(chord, 'both')}: ${chord.names.join(', ')}</p>` : ''}
    </section>`;
}

function paintLesson(track, index) {
  const l = LESSONS[track][index];
  if (l.staff) drawExample($('#example'), l.staff, l.clef || 'treble');
  if (l.keyboard) drawKeyboard($('#keys'), { highlight: l.keyboard, labels: true });
  if (l.key) drawKeyboard($('#keys'), { highlight: l.key });
  if (l.chord) drawKeyboard($('#keys'), { highlight: CHORD_BY_ID.get(l.chord).midis.map(foldToKeyboard) });
}

// Lección dentro de la sesión (seguida de su pregunta) o para releer desde el plan.
function renderLesson(track, index, { inSession }) {
  const body = `${lessonHtml(track, index)}
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">${inSession ? 'Continuar' : 'Volver'}</button>`;
  if (inSession) {
    sessionShell(body);
    $('#ok').onclick = () => renderQuiz(track, index, { review: false });
  } else {
    show(`${backHeader('Teoría')}${body}`);
    $('#back').onclick = renderPath;
    $('#ok').onclick = renderPath;
  }
  paintLesson(track, index);
}

function renderQuiz(track, index, { review }) {
  const l = LESSONS[track][index];
  const order = l.quiz.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  sessionShell(`
    <section class="stack">
      <p class="eyebrow">${review ? 'Repaso de teoría' : 'Comprueba'} · ${l.title}</p>
      <p class="prompt left">${l.quiz.q}</p>
      <div class="options">
        ${order.map((i) => `<button class="btn option" data-i="${i}">${l.quiz.options[i]}</button>`).join('')}
      </div>
      <p class="feedback left" id="feedback" role="status"></p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok" hidden>Seguir</button>
  `);
  $$('.option').forEach((b) => {
    b.onclick = () => {
      const fb = $('#feedback');
      if (Number(b.dataset.i) === l.quiz.answer) {
        b.classList.add('option-right');
        $$('.option').forEach((o) => (o.disabled = true));
        fb.textContent = `Correcto. ${l.quiz.why}`;
        fb.className = 'feedback left feedback-good';
        if (!review) {
          store.completeLesson(track, index);
          session.lesson = l.title;
        }
        $('#ok').hidden = false;
        $('#ok').focus();
      } else {
        b.classList.add('option-wrong');
        b.disabled = true;
        fb.textContent = 'No es esa. Piénsalo otra vez.';
        fb.className = 'feedback left feedback-bad';
      }
    };
  });
  $('#ok').onclick = nextStep;
}

// ---------- acordes ----------

function renderChordIntro(step) {
  const c = CHORD_BY_ID.get(step.chord);
  sessionShell(`
    <section class="stack">
      <p class="small muted center">Acorde nuevo</p>
      <div class="symbol">${c.letters}</div>
      <p class="center"><strong>${c.full}</strong> · con nombres se escribe ${c.latin}</p>
      <div class="keys-box" id="keys"></div>
      <p><strong>Notas:</strong> ${c.names.join(', ')}.</p>
      <p class="muted"><strong>Cómo se arma:</strong> desde ${c.names[0]}, ${c.formula}.</p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">Entendido, quiero armarlo</button>
  `);
  drawKeyboard($('#keys'), { highlight: c.midis.map(foldToKeyboard) });
  $('#ok').onclick = nextStep;
}

// Ves el símbolo y tocas sus notas, de a una y en cualquier orden.
function renderChordBuild(step) {
  const c = CHORD_BY_ID.get(step.chord);
  const label = chordText(c, pickNotation());
  const play = { found: new Set(), keys: [], attempts: 0, hinted: !!step.guided, shownAt: performance.now(), locked: false };
  const byMic = session.input === 'mic';

  sessionShell(`
    <section class="stack">
      <p class="prompt">${byMic ? 'Toca las notas de este acorde, de a una' : 'Marca las notas de este acorde'}</p>
      <div class="symbol" id="symbol">${label}</div>
      <p class="feedback" id="feedback" role="status"></p>
      ${listenRow()}
      ${session.micNote ? `<p class="small muted center">${session.micNote}</p>` : ''}
      <div class="keys-box" id="keys"></div>
      <p class="small muted center">${byMic ? 'También puedes marcarlas en este teclado.' : 'En cualquier orden y altura.'}</p>
    </section>
    <div class="spacer"></div>
    <div class="row-between"><span></span><button class="link" id="skip">No lo sé</button></div>
  `);
  session.micNote = '';
  const fb = $('#feedback');
  const keysEl = $('#keys');
  const symbolEl = $('#symbol');

  const setFb = (text, cls) => {
    fb.textContent = text;
    fb.className = 'feedback ' + (cls || '');
  };
  const flash = (cls) => {
    symbolEl.classList.remove('symbol-good', 'symbol-bad');
    void symbolEl.offsetWidth;
    symbolEl.classList.add(cls);
  };
  const drawKeys = () => {
    drawKeyboard(keysEl, {
      highlight: play.hinted ? c.midis.map(foldToKeyboard) : null,
      selected: play.keys,
      onPress: (midi) => answer(midi),
    });
  };
  drawKeys();
  if (step.guided) setFb(`${c.full}: ${c.names.join(', ')}.`, 'feedback-hint');

  function giveHint() {
    play.hinted = true;
    drawKeys();
    setFb(`${c.full}: ${c.names.join(', ')}. Toca las teclas resaltadas.`, 'feedback-hint');
  }

  function answer(midi) {
    if (play.locked) return;
    const pc = ((midi % 12) + 12) % 12;
    const i = c.pcs.indexOf(pc);
    if (i === -1) {
      play.attempts += 1;
      flash('symbol-bad');
      if (play.attempts >= 2) giveHint();
      else setFb(`${pcName(midi)} no forma parte de este acorde.`, 'feedback-bad');
      return;
    }
    if (play.found.has(pc)) return;
    play.found.add(pc);
    play.keys.push(foldToKeyboard(midi));
    drawKeys();
    const left = c.pcs.length - play.found.size;
    if (left > 0) {
      setFb(`${c.names[i]}, bien. ${left === 1 ? 'Falta una nota.' : `Faltan ${left} notas.`}`, 'feedback-good');
      return;
    }
    play.locked = true;
    const firstTry = play.attempts === 0 && !(play.hinted && !step.guided);
    recordAnswer('c', c.id, firstTry, performance.now() - play.shownAt);
    if (!firstTry && !step.retry && !step.guided) {
      const at = Math.min(session.steps.length, session.index + 4);
      session.steps.splice(at, 0, { type: 'chord-build', chord: c.id, retry: true });
    }
    flash('symbol-good');
    setFb(`Correcto. ${c.letters} · ${c.latin}: ${c.names.join(', ')}.`, 'feedback-good');
    setTimeout(nextStep, 1100);
  }

  $('#skip').onclick = () => {
    if (play.locked) return;
    play.attempts += 2;
    giveHint();
  };
  bindMic(answer, (midi) => {
    const pc = ((midi % 12) + 12) % 12;
    return c.pcs.includes(pc) && !play.found.has(pc);
  });
}

// Ves las teclas y eliges qué acorde es.
function renderChordName(step) {
  const c = CHORD_BY_ID.get(step.chord);
  const notation = pickNotation();
  const key = (ch) => [...ch.pcs].sort((a, b) => a - b).join(',');
  const others = CHORDS.filter((o) => o.id !== c.id && key(o) !== key(c));
  const sameRoot = others.filter((o) => o.rootPc === c.rootPc);
  const sameKind = others.filter((o) => o.quality === c.quality && o.rootPc !== c.rootPc);
  const pickFrom = (list, taken) => {
    const pool = list.filter((o) => !taken.includes(o));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };
  const wrong = [];
  for (const list of [sameRoot, sameKind, others, others]) {
    if (wrong.length >= 3) break;
    const o = pickFrom(list, wrong);
    if (o) wrong.push(o);
  }
  const options = [c, ...wrong.slice(0, 3)].sort(() => Math.random() - 0.5);
  const shownAt = performance.now();
  let tries = 0;

  sessionShell(`
    <section class="stack">
      <p class="prompt">¿Qué acorde forman estas teclas?</p>
      <div class="keys-box" id="keys"></div>
      <div class="options options-grid">
        ${options.map((o) => `<button class="btn option center" data-id="${o.id}">${chordText(o, notation)}</button>`).join('')}
      </div>
      <p class="feedback" id="feedback" role="status"></p>
    </section>
    <div class="spacer"></div>
  `);
  drawKeyboard($('#keys'), { highlight: c.midis.map(foldToKeyboard) });
  $$('.option').forEach((b) => {
    b.onclick = () => {
      const fb = $('#feedback');
      tries += 1;
      if (b.dataset.id === c.id) {
        b.classList.add('option-right');
        $$('.option').forEach((o) => (o.disabled = true));
        recordAnswer('c', c.id, tries === 1, performance.now() - shownAt);
        fb.textContent = `Correcto. ${c.full}: ${c.names.join(', ')}.`;
        fb.className = 'feedback feedback-good';
        setTimeout(nextStep, 1100);
      } else {
        b.classList.add('option-wrong');
        b.disabled = true;
        const o = CHORD_BY_ID.get(b.dataset.id);
        fb.textContent = `No: ${o.letters} sería ${o.names.join(', ')}.`;
        fb.className = 'feedback feedback-bad';
      }
    };
  });
}

// ---------- pentagrama ----------

const CLEF = { n: 'treble', b: 'bass' };
const KEY_BASE = { n: 60, b: 48 };

function renderIntro(step) {
  const kind = step.kind || 'n';
  const n = noteInfo(kind, step.midi);
  sessionShell(`
    <section class="stack">
      <p class="small muted center">Nota nueva · clave de ${kind === 'b' ? 'fa' : 'sol'}</p>
      <h2 class="center">${n.label}</h2>
      <div class="paper staff-single" id="staff"></div>
      <p>${n.where}</p>
      <p class="muted">${n.link}</p>
      <div class="keys-box" id="keys"></div>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">Entendido, quiero tocarla</button>
  `);
  drawStaff($('#staff'), [step.midi], [], CLEF[kind]);
  drawKeyboard($('#keys'), { highlight: step.midi, labels: true, base: KEY_BASE[kind] });
  $('#ok').onclick = nextStep;
}

// Tarjeta de una nota o frase de varias.
function renderPlay(step) {
  const kind = step.kind || 'n';
  const info = (midi) => noteInfo(kind, midi);
  const hand = kind === 'b' ? ' con la mano izquierda' : '';
  const isPhrase = step.type === 'phrase';
  const targets = isPhrase ? step.midis : [step.midi];
  const play = { pos: 0, attempts: 0, shownAt: performance.now(), locked: false, hinted: !!step.guided };
  const showNames = store.getState().settings.showNames && !step.placement;

  sessionShell(`
    <section class="stack">
      ${step.placement ? '<p class="eyebrow center">Prueba de nivel</p>' : ''}
      <p class="prompt">${isPhrase ? `Lee y toca las notas en orden${hand}` : step.guided ? `Toca ${info(step.midi).label}${hand || ' en tu teclado'}` : `Toca esta nota${hand}`}</p>
      <div class="paper ${isPhrase ? '' : 'staff-single'}" id="staff"></div>
      <p class="feedback" id="feedback" role="status"></p>
      ${listenRow()}
      ${session.micNote ? `<p class="small muted center">${session.micNote}</p>` : ''}
      <div class="keys-box" id="keys" ${session.showKeys || step.guided ? '' : 'hidden'}></div>
    </section>
    <div class="spacer"></div>
    <div class="row-between">
      ${session.input === 'mic' ? `<button class="link" id="toggle-keys">${session.showKeys ? 'Ocultar teclado' : 'Tocar en pantalla'}</button>` : '<span></span>'}
      <button class="link" id="skip">No la sé</button>
    </div>
  `);
  session.micNote = '';

  const staffEl = $('#staff');
  const fb = $('#feedback');
  const keysEl = $('#keys');

  const draw = () => {
    const states = targets.map((_, i) => (i < play.pos ? 'done' : i === play.pos ? 'current' : 'todo'));
    drawStaff(staffEl, targets, states, CLEF[kind]);
  };
  const drawKeys = () => {
    drawKeyboard(keysEl, {
      highlight: play.hinted ? targets[play.pos] : null,
      labels: play.hinted,
      base: KEY_BASE[kind],
      onPress: (midi) => answer(midi),
    });
  };
  const setFb = (text, cls) => {
    fb.textContent = text;
    fb.className = 'feedback ' + (cls || '');
  };
  const flash = (cls) => {
    staffEl.classList.remove('paper-good', 'paper-bad');
    void staffEl.offsetWidth;
    staffEl.classList.add(cls);
  };

  draw();
  drawKeys();
  if (showNames && !isPhrase) setFb(info(targets[0]).label, 'feedback-hint');

  function giveHint() {
    play.hinted = true;
    keysEl.hidden = false;
    drawKeys();
    const n = info(targets[play.pos]);
    setFb(`Es ${n.label}. ${n.where}`, 'feedback-hint');
  }

  // En la prueba de nivel no hay pistas: se anota y se pasa a la siguiente.
  function placementResult(ok) {
    play.locked = true;
    if (ok) session.placed.push(targets[0]);
    flash(ok ? 'paper-good' : 'paper-bad');
    setFb(ok ? 'Correcto.' : `Era ${info(targets[0]).label}.`, ok ? 'feedback-good' : 'feedback-bad');
    setTimeout(nextStep, ok ? 500 : 1200);
  }

  function answer(midi) {
    if (play.locked) return;
    const target = targets[play.pos];
    const strict = store.getState().settings.strictOctave;
    const sameClass = ((midi - target) % 12 + 12) % 12 === 0;
    const right = midi === target || (!strict && sameClass);

    if (step.placement) return placementResult(right);

    if (right) {
      const ms = performance.now() - play.shownAt;
      const firstTry = play.attempts === 0 && !(play.hinted && !step.guided);
      recordAnswer(kind, target, firstTry, ms);

      // Si costó, la misma nota vuelve un poco más adelante (una sola vez).
      if (!firstTry && !isPhrase && !step.retry) {
        const at = Math.min(session.steps.length, session.index + 4);
        session.steps.splice(at, 0, { type: 'card', kind, midi: target, retry: true });
      }

      flash('paper-good');
      setFb(`Correcto: ${info(target).label}`, 'feedback-good');
      play.pos += 1;
      play.attempts = 0;
      play.hinted = false;
      if (play.pos >= targets.length) {
        play.locked = true;
        draw();
        setTimeout(nextStep, 650);
      } else {
        play.shownAt = performance.now();
        draw();
        drawKeys();
      }
      return;
    }

    if (sameClass) {
      flash('paper-bad');
      setFb(`Es ${info(target).name}, pero en otra altura. Búscala más ${midi > target ? 'a la izquierda' : 'a la derecha'}.`, 'feedback-bad');
      return;
    }

    play.attempts += 1;
    flash('paper-bad');
    if (play.attempts >= 2) giveHint();
    else setFb(`Tocaste ${heardLabel(midi)}. La nota está más ${midi > target ? 'abajo (a la izquierda)' : 'arriba (a la derecha)'}.`, 'feedback-bad');
  }

  $('#skip').onclick = () => {
    if (play.locked) return;
    if (step.placement) return placementResult(false);
    play.attempts += 2;
    giveHint();
  };
  if ($('#toggle-keys')) {
    $('#toggle-keys').onclick = () => {
      session.showKeys = !session.showKeys;
      keysEl.hidden = !session.showKeys && !play.hinted;
      $('#toggle-keys').textContent = session.showKeys ? 'Ocultar teclado' : 'Tocar en pantalla';
    };
  }
  bindMic(answer, (midi) => {
    const target = targets[Math.min(play.pos, targets.length - 1)];
    if (midi === target) return true;
    return !store.getState().settings.strictOctave && ((midi - target) % 12 + 12) % 12 === 0;
  });
}

// ---------- cierre ----------

function finishSession() {
  const seconds = Math.round((Date.now() - session.startedAt) / 1000);
  const previous = store.getState().sessions.filter((x) => !x.minimal && x.cards).slice(-1)[0];
  const result = store.completeSession({
    cards: session.answered,
    firstTry: session.firstTry,
    seconds,
    minimal: session.minimal,
  });
  const newBadges = store.checkAchievements();
  stopMic();

  const acc = session.answered ? Math.round((session.firstTry / session.answered) * 100) : 0;
  const res = session.results;
  const uniq = (list) => [...new Set(list)];
  const join = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}` : list[0]);

  // Lo que salió bien.
  const groups = ['Acordes', 'Mano derecha', 'Mano izquierda'].map((g) => {
    const items = res.filter((r) => r.group === g);
    return { g, total: items.length, ok: items.filter((r) => r.firstTry).length };
  }).filter((x) => x.total);
  const missedLabels = new Set(res.filter((r) => !r.firstTry).map((r) => r.label));
  const clean = uniq(res.filter((r) => r.firstTry && !r.slow && !missedLabels.has(r.label)).map((r) => r.label));
  const firmed = uniq(res.filter((r) => r.firmed).map((r) => r.label));
  const good = [];
  const best = [...groups].sort((a, b) => b.ok / b.total - a.ok / a.total)[0];
  if (best && best.ok / best.total >= 0.7) good.push(`Tu punto fuerte fue <strong>${best.g.toLowerCase()}</strong>: ${best.ok} de ${best.total} al primer intento.`);
  if (clean.length) good.push(`Te ${clean.length === 1 ? 'salió' : 'salieron'} a la primera y sin dudar: ${join(clean.slice(0, 5))}.`);
  if (firmed.length) good.push(`${firmed.length === 1 ? 'Quedó firme' : 'Quedaron firmes'}: ${join(firmed.slice(0, 5))}.`);
  if (session.lesson) good.push(`Sumaste una lección de teoría: ${session.lesson}.`);
  if (previous) {
    const prevAcc = Math.round((previous.firstTry / previous.cards) * 100);
    if (acc > prevAcc) good.push(`Mejoraste respecto de la sesión anterior: de ${prevAcc}% a ${acc}%.`);
  }
  if (!good.length) good.push('Completaste la sesión entera, que es lo que más cuenta.');

  // En qué mejorar.
  const tips = new Map();
  for (const r of res) if (!r.firstTry && !tips.has(r.label)) tips.set(r.label, r.tip);
  const worst = [...session.missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label);
  const slow = uniq(res.filter((r) => r.slow && !missedLabels.has(r.label)).map((r) => r.label)).slice(0, 3);
  const improve = worst.map((label) => `<li><strong>${label}.</strong> ${tips.get(label) || ''}</li>`);
  if (slow.length) improve.push(`<li><strong>Más rápido:</strong> acertaste ${join(slow)}, pero con demora. La meta es reconocerlas sin pensar.</li>`);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const next = upcoming();
  const nextAch = store.nextAchievement();
  let extra = '';
  if (result.usedFreezes) extra += `<p class="small muted">Usaste ${plural(result.usedFreezes, 'día de perdón', 'días de perdón')} para mantener la racha.</p>`;
  if (result.earnedFreeze) extra += '<p class="small muted">Ganaste un día de perdón por tu constancia.</p>';

  show(`
    <header class="center"><p class="eyebrow">Sesión terminada</p><h1 class="title grad-text">${acc >= 90 ? '¡Excelente!' : acc >= 70 ? '¡Bien hecho!' : '¡Sesión cumplida!'}</h1></header>
    <section class="card stack center">
      ${ring(acc, `${acc}%`, { big: true })}
      <p class="muted">al primer intento · ${session.answered} ejercicios · ${mins}:${String(secs).padStart(2, '0')}</p>
      <div><span class="pill pill-fire">${icon('flame')}${plural(result.streak, 'día seguido', 'días seguidos')}</span></div>
      ${extra}
    </section>

    ${newBadges.length ? `<section class="card stack">
      <p class="eyebrow">${newBadges.length === 1 ? 'Logro desbloqueado' : 'Logros desbloqueados'}</p>
      ${newBadges.map((a) => achievementBadge(a, { fresh: true })).join('')}
    </section>` : ''}

    <section class="card stack">
      <h2>${icon('check')} Lo que hiciste bien</h2>
      <ul class="plain-list">${good.map((g) => `<li>${g}</li>`).join('')}</ul>
      ${groups.length > 1 ? `<div class="stats">${groups.map((x) => `<div><div class="stat-num">${x.ok}/${x.total}</div><div class="small muted">${x.g}</div></div>`).join('')}</div>` : ''}
    </section>

    <section class="card stack">
      <h2>${icon('target')} Para mejorar</h2>
      ${improve.length ? `<ul class="plain-list">${improve.join('')}</ul><p class="small muted">Estas van a aparecer más seguido en las próximas sesiones.</p>` : '<p>Nada que corregir hoy: todo salió al primer intento y a buen ritmo.</p>'}
    </section>

    <section class="hero">
      <p class="eyebrow">Mañana te espera</p>
      <h2>${plural(result.streak + 1, 'día seguido', 'días seguidos')}</h2>
      <ul class="hero-list">${next.slice(0, 3).map((u) => `<li>${icon(u.icon)}<span>${u.text}</span></li>`).join('')}</ul>
      ${nextAch ? `<p class="small"><strong>Próximo logro: ${nextAch.title}.</strong> Te ${nextAch.left === 1 ? 'falta' : 'faltan'} ${plural(nextAch.left, nextAch.unit[0], nextAch.unit[1])}.</p>` : ''}
      <p class="small">Si mañana no hay tiempo, la sesión mínima de 2 minutos mantiene la racha.</p>
    </section>

    <button class="btn btn-primary" id="home">Listo</button>
  `);
  celebrate();
  $('#home').onclick = renderHome;
}

function finishPlacement() {
  stopMic();
  const known = session.placed;
  store.applyPlacement(known);
  const labels = known.map((m) => NOTE_BY_MIDI.get(m).label);
  show(`
    <header class="center"><p class="eyebrow">Prueba de nivel</p><h1 class="title">Resultado</h1></header>
    <section class="card stack center">
      ${ring(Math.round((known.length / NOTES.length) * 100), `${known.length}/${NOTES.length}`, { big: true, color: 'url(#g-violet)' })}
      <p class="muted">notas reconocidas</p>
      ${known.length
        ? `<p>Quedan como firmes: ${labels.join(', ')}. Solo van a aparecer en repasos espaciados.</p>`
        : '<p>Ninguna quedó como firme, así que el pentagrama empieza desde el principio. Es el punto de partida normal.</p>'}
      <p class="muted">Las demás se presentan de a dos por sesión.</p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="home">Listo</button>
  `);
  $('#home').onclick = renderPath;
}

// ---------- tu plan ----------

function dots(box) {
  return `<span class="dots dots-inline" aria-hidden="true">${Array.from({ length: MAX_BOX }, (_, i) => `<span class="dot ${i < box ? 'dot-on' : ''}"></span>`).join('')}</span>`;
}

function renderPath() {
  stopMic();
  const p = progress();

  const goals = GOALS.map((g) => `
    <div class="goal">
      <p><strong>${g.title}</strong> <span class="small muted">· ${g.by}</span></p>
      <ul class="check-list small">
        ${g.needs.map((n) => `<li class="${n.ready ? 'check-on' : ''}">${icon(n.ready ? 'check' : 'target')}<span>${n.text} <span class="muted">· ${n.ready ? 'ya se entrena en la app' : 'próximamente'}</span></span></li>`).join('')}
      </ul>
    </div>`).join('');

  const parts = SESSION_PARTS.map((s) => `
    <div class="part"><span class="part-time">${s.time}</span><span><strong>${s.title}.</strong> ${s.text}</span></div>`).join('');

  const tracks = TRACKS.map((t) => `
    <section class="card stack">
      <p class="eyebrow">Camino</p>
      <h2>${t.title}</h2>
      <p class="muted">${t.goal}</p>
      ${t.units.map((u, i) => `
        <div class="stage ${u.ready ? 'stage-now' : ''}">
          <div class="stage-num" aria-hidden="true">${i + 1}</div>
          <div class="grow">
            <p><strong>${u.title}</strong> ${u.ready ? '<span class="badge badge-warn">Disponible</span>' : '<span class="badge">Próximamente</span>'}</p>
            <ul class="small">${u.topics.map((x) => `<li>${x}</li>`).join('')}</ul>
          </div>
        </div>`).join('')}
    </section>`).join('');

  const chordLevels = CHORD_LEVELS.map((lv) => `
    <p class="small"><strong>${lv.title}</strong></p>
    <div class="chip-row">${lv.ids.map((id) => {
      const c = CHORD_BY_ID.get(id);
      const s = store.stat('c', id);
      return `<span class="chip ${s ? '' : 'chip-locked'}">${c.letters}${dots(s ? s.box : 0)}</span>`;
    }).join('')}</div>`).join('');

  const noteChips = NOTES.map((n) => {
    const s = store.stat('n', n.midi);
    return `<span class="chip ${s ? '' : 'chip-locked'}">${n.label}${dots(s ? s.box : 0)}</span>`;
  }).join('');

  const bassChips = BASS_NOTES.map((n) => {
    const s = store.stat('b', n.midi);
    return `<span class="chip ${s ? '' : 'chip-locked'}">${n.label}${dots(s ? s.box : 0)}</span>`;
  }).join('');

  const lessonRows = (track) => LESSONS[track].map((l, i) => {
    const done = store.lessonsDone(track);
    return `<li class="${i < done ? 'lesson-done' : ''}"><button class="lesson-row" data-track="${track}" data-lesson="${i}">
      <span class="lesson-mark" aria-hidden="true">${i < done ? icon('check') : i + 1}</span>
      <span class="grow">${l.title}${i < done ? '<span class="small muted"> · vista</span>' : ''}</span>
      ${icon('chevron')}
    </button></li>`;
  }).join('');

  show(`
    <header><h1 class="title">Tu plan</h1></header>

    <section class="card stack">
      <p class="eyebrow">Tu meta</p>
      <p>Leer y tocar con fluidez estas dos piezas. Esto es lo que exige cada una:</p>
      ${goals}
      <p class="small muted">Sus partituras tienen derechos de autor y no están dentro de la app: se consiguen aparte. Sus acordes los puedes cargar en Canciones.</p>
    </section>

    <section class="card stack">
      <h2>Cómo es cada sesión</h2>
      <div>${parts}</div>
      <p class="small muted">Además, en Canciones practicas cuando quieras, sin límite de tiempo.</p>
    </section>

    ${tracks}

    <section class="card stack">
      <p class="eyebrow">Dónde estás</p>
      <h2>Acordes</h2>
      <p class="small muted">${p.chordsFirm} de ${CHORDS.length} firmes. Los básicos se dan por conocidos y solo se repasan.</p>
      ${chordLevels}
      <h2>Notas en el pentagrama</h2>
      <p class="small muted">${p.notesFirm} de ${ALL_NOTES_COUNT} firmes.</p>
      <p class="small"><strong>Clave de sol · mano derecha</strong></p>
      <div class="chip-row">${noteChips}</div>
      <p class="small"><strong>Clave de fa · mano izquierda</strong></p>
      <div class="chip-row">${bassChips}</div>
      <button class="btn" id="placement">${store.getState().placementDone ? 'Repetir la prueba de nivel' : 'Hacer la prueba de nivel'}<small>Las 12 notas de clave de sol, 1 minuto. Las que aciertes quedan como firmes.</small></button>
    </section>

    <section class="card stack">
      <div class="row-between"><h2>Logros</h2><span class="pill">${ACHIEVEMENTS.filter((a) => store.hasAchievement(a.id)).length} de ${ACHIEVEMENTS.length}</span></div>
      <div class="badge-grid">
        ${ACHIEVEMENTS.map((a) => `<div class="badge-tile ${store.hasAchievement(a.id) ? 'badge-on' : ''}" title="${a.text}">
          <span class="tile-ico ${store.hasAchievement(a.id) ? 'warm' : 'off'}">${icon(a.icon)}</span>
          <strong class="small">${a.title}</strong><span class="small muted">${a.text}</span></div>`).join('')}
      </div>
    </section>

    <section class="card stack">
      <h2>Cómo avanzas</h2>
      <ul class="plain-list">
        <li>Cada nota y cada acorde tiene cinco niveles de dominio. Sube uno cuando aciertas al primer intento y sin demorarte.</li>
        <li>Si fallas, baja dos niveles y vuelve a aparecer pronto.</li>
        <li>Llegan hasta dos acordes y dos notas nuevas de cada clave por sesión, cuando lo anterior de ese grupo está en nivel 2 o más.</li>
        <li>Algo cuenta como firme desde el nivel 3, y a partir de ahí se repasa cada vez más espaciado.</li>
      </ul>
    </section>

    <section class="card stack">
      <h2>Teoría de acordes</h2>
      <ul class="lesson-list">${lessonRows('chords')}</ul>
    </section>
    <section class="card stack">
      <h2>Teoría de pentagrama</h2>
      <p class="small muted">Llega una lección por sesión, alternando caminos. Aquí puedes releerlas o adelantarte.</p>
      <ul class="lesson-list">${lessonRows('staff')}</ul>
    </section>
  `, { tab: 'plan' });
  $('#placement').onclick = () => startSession({ placement: true });
  $$('[data-lesson]').forEach((b) => {
    b.onclick = () => renderLesson(b.dataset.track, Number(b.dataset.lesson), { inSession: false });
  });
}

// ---------- prueba de micrófono ----------

async function renderMicTest() {
  show(`
    ${backHeader('Prueba de micrófono')}
    <section class="card stack">
      <p>Toca una tecla a la vez en tu teclado. Aquí aparece la nota que la app oye.</p>
      <div class="heard" id="heard">…</div>
      <div class="listen">${icon('mic')}<span>Volumen</span><div class="meter" style="width:160px"><div id="meter"></div></div></div>
      <p class="small muted center" id="msg">Pidiendo permiso para usar el micrófono…</p>
    </section>
    <section class="card stack">
      <h2>Qué comprobar</h2>
      <p>Toca el Do central, Mi y Sol, de a una y dejando sonar cada nota un segundo. Deben aparecer con su nombre.</p>
      <h2>Si le cuesta oír</h2>
      <ul class="plain-list">
        <li>Apoya el dispositivo en el atril del teclado, con el micrófono (borde inferior del celular) hacia los parlantes.</li>
        <li>Usa el sonido de piano: botón Portable Grand.</li>
        <li>Quita la funda si tapa el micrófono y evita música o televisión de fondo.</li>
        <li>Toca una sola tecla a la vez: los acordes completos no se reconocen.</li>
      </ul>
    </section>
  `);
  $('#back').onclick = renderHome;

  const problem = await startMic();
  if (!$('#heard')) return stopMic();
  if (problem) {
    $('#msg').textContent = problem;
    return;
  }
  $('#msg').textContent = 'Escuchando.';
  let clearTimer = null;
  mic.onLevel = ({ level }) => {
    const meter = $('#meter');
    if (meter) meter.style.width = meterPct(level) + '%';
  };
  mic.onNote = (midi) => {
    const heard = $('#heard');
    if (!heard) return;
    heard.textContent = heardLabel(midi);
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      if (heard.isConnected) heard.textContent = '…';
    }, 2500);
  };
}

// ---------- ajustes ----------

function renderSettings(keepScroll = 0) {
  const s = store.getState().settings;
  const seg = (name, options) => `
    <div class="seg" role="group">
      ${options.map(([value, label]) => `<button data-set="${name}" data-value="${value}" aria-pressed="${s[name] === value}">${label}</button>`).join('')}
    </div>`;
  show(`
    <header><h1 class="title">Ajustes</h1></header>
    <section class="card">
      <div class="setting setting-block">
        <p><strong>Cómo respondes</strong></p>
        <p class="small muted">Con micrófono tocas en tu teclado real. El teclado en pantalla sirve si estás lejos del piano.</p>
        ${seg('input', [['mic', 'Micrófono'], ['screen', 'Teclado en pantalla']])}
      </div>
      <div class="setting setting-block">
        <p><strong>Cómo se escriben los acordes</strong></p>
        <p class="small muted">Letras: C, Dm, G7. Nombres: Do, Rem, Sol7. Con "Ambas" la app alterna para que leas las dos.</p>
        ${seg('notation', [['both', 'Ambas'], ['letters', 'Letras'], ['names', 'Nombres']])}
      </div>
      <label class="setting">
        <span><strong>Exigir la altura exacta</strong><br><span class="small muted">En el pentagrama, el Do central y el Do agudo cuentan como notas distintas.</span></span>
        <input type="checkbox" id="strict" ${s.strictOctave ? 'checked' : ''}>
      </label>
      <label class="setting">
        <span><strong>Mostrar el nombre de la nota</strong><br><span class="small muted">Ayuda al principio; apágalo para leer de verdad.</span></span>
        <input type="checkbox" id="names" ${s.showNames ? 'checked' : ''}>
      </label>
    </section>
    <section class="card stack" id="backup-box">
      <p><strong>Copia de seguridad</strong></p>
      <p class="small muted">Tu progreso vive solo en este dispositivo. Guarda una copia para no perderlo, o para pasarlo a otro dispositivo.</p>
      <button class="btn" id="backup">Guardar una copia</button>
      <button class="btn" id="restore">Restaurar una copia</button>
      <p class="feedback left" id="backup-msg" role="status" hidden></p>
    </section>
    <button class="btn" id="welcome">Ver la bienvenida de TenPiano</button>
    <section class="card stack" id="reset-box">
      <p><strong>Reiniciar el progreso</strong></p>
      <p class="small muted">Borra lo aprendido y la racha de este dispositivo. Tus canciones se conservan.</p>
      <button class="btn" id="reset">Reiniciar</button>
    </section>
  `, { tab: 'settings', animate: !keepScroll });
  if (keepScroll) window.scrollTo(0, keepScroll);
  $$('[data-set]').forEach((b) => {
    b.onclick = () => {
      store.setSetting(b.dataset.set, b.dataset.value);
      renderSettings(window.scrollY || 1);
    };
  });
  const say = (text, cls) => {
    const el = $('#backup-msg');
    el.hidden = false;
    el.textContent = text;
    el.className = 'feedback left ' + cls;
  };
  $('#backup').onclick = async () => {
    const text = store.exportData();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Copia de TenPiano', text });
        say('Copia compartida. Guárdala en Notas, Archivos o envíatela por correo.', 'feedback-good');
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      say('Copia en el portapapeles. Pégala en una nota o un correo para guardarla.', 'feedback-good');
    } catch (e) {
      say('No se pudo copiar automáticamente. Usa "Restaurar una copia" para ver el texto y copiarlo a mano.', 'feedback-bad');
    }
  };
  $('#restore').onclick = () => {
    $('#backup-box').innerHTML = `
      <p><strong>Restaurar una copia</strong></p>
      <label class="field"><span class="small muted">Pega aquí el texto de la copia. Reemplaza el progreso actual.</span>
        <textarea id="backup-text" rows="5" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      </label>
      <p class="feedback left" id="backup-msg" role="status" hidden></p>
      <div class="row"><button class="btn" id="cancel-restore">Cancelar</button><button class="btn btn-primary" id="do-restore">Restaurar</button></div>`;
    $('#cancel-restore').onclick = () => renderSettings();
    $('#do-restore').onclick = () => {
      if (store.importData($('#backup-text').value.trim())) renderHome();
      else say('Ese texto no es una copia válida de TenPiano.', 'feedback-bad');
    };
  };
  $('#welcome').onclick = renderWelcome;
  $('#strict').onchange = (e) => store.setSetting('strictOctave', e.target.checked);
  $('#names').onchange = (e) => store.setSetting('showNames', e.target.checked);
  $('#reset').onclick = () => {
    $('#reset-box').innerHTML = `
      <p><strong>¿Seguro? No se puede deshacer.</strong></p>
      <div class="row"><button class="btn" id="no">Cancelar</button><button class="btn btn-primary" id="yes">Sí, borrar</button></div>`;
    $('#no').onclick = () => renderSettings();
    $('#yes').onclick = () => {
      store.resetAll();
      renderHome();
    };
  };
}

// ---------- bienvenida ----------

const PITCH = [
  ['bolt', '10 minutos al día', 'Sesiones cortas que la app arma por ti. Abres, tocas y listo.'],
  ['keys', 'Acordes y partitura', 'Aprende a leer de las dos formas: cifrado (C, Dm, G7) y pentagrama, con las dos manos.'],
  ['mic', 'Te escucha tocar', 'Usa tu propio teclado. La app oye cada nota y te corrige al instante.'],
  ['flame', 'Hecha para que vuelvas', 'Racha, logros y un adelanto de lo que te espera mañana.'],
  ['target', 'Con una meta real', 'Todo el plan apunta a las piezas que tú quieres tocar.'],
];

function renderWelcome() {
  stopMic();
  session = null;
  show(`
    <div class="spacer"></div>
    <header class="welcome-top center">
      <img class="welcome-logo" src="icons/icon-192.png" alt="" width="112" height="112">
      <h1 class="welcome-name">Ten<span class="p">P</span>iano</h1>
      <p class="welcome-tag">Aprende a leer y tocar el piano. <span class="grad-text">De verdad.</span></p>
    </header>
    <section class="stack">
      ${PITCH.map(([ico, title, text]) => `<div class="list-row"><span class="tile-ico">${icon(ico)}</span><span class="grow"><strong>${title}</strong><br><span class="small muted">${text}</span></span></div>`).join('')}
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="go">Empezar ahora</button>
  `);
  $('#go').onclick = () => {
    store.setWelcomed();
    renderHome();
  };
}

// Pantalla de apertura: el logo y una frase, un instante, cada vez que abres la app.
function splash() {
  const line = PITCH[new Date().getDate() % PITCH.length];
  const el = document.createElement('div');
  el.className = 'splash';
  el.innerHTML = `
    <img src="icons/icon-192.png" alt="" width="128" height="128">
    <div class="splash-name">Ten<span class="p">P</span>iano</div>
    <div class="splash-tag">${line[1]}</div>
    <div class="splash-sub">${line[2]}</div>`;
  document.body.appendChild(el);
  const close = () => {
    el.classList.add('splash-out');
    setTimeout(() => el.remove(), 450);
  };
  el.onclick = close;
  setTimeout(close, 2200);
}

// Suelta el micrófono si la app pasa a segundo plano fuera de una sesión.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!session && !app.querySelector('[data-keep-mic]')) stopMic();
  } else if (mic.ctx && mic.ctx.state === 'suspended') {
    mic.ctx.resume().catch(() => {});
  } else if (!session && app.querySelector('#heard')) {
    renderMicTest();
  }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

setNav({ today: renderHome, songs: () => renderSongs(renderHome), plan: renderPath, settings: () => renderSettings() });

splash();
if (store.getState().welcomed) renderHome();
else renderWelcome();
