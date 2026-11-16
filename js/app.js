import {
  NOTES, NOTE_BY_MIDI, MAX_BOX, LESSONS, TOTAL_LESSONS, TRACKS, SESSION_PARTS, GOALS,
  CHORDS, CHORD_BY_ID, CHORD_LEVELS, chordText,
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
  const notesFirm = store.firmCount('n');
  const lessons = store.lessonsDone('chords') + store.lessonsDone('staff');
  return { chordsFirm, notesFirm, lessons };
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
      <p class="eyebrow">${st.doneToday ? 'Sesión completada' : 'Sesión de hoy'}</p>
      <h2>${st.doneToday ? 'Una vuelta más' : '10 minutos de piano'}</h2>
      <div class="hero-steps">
        <span>${icon('book')}Teoría</span><span>${icon('keys')}Acordes</span><span>${icon('staff')}Pentagrama</span>
      </div>
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
        <div>${ring(pct(p.notesFirm, NOTES.length), `${p.notesFirm}/${NOTES.length}`, { color: 'url(#g-violet)' })}<div class="small"><strong>Pentagrama</strong></div></div>
        <div>${ring(pct(p.lessons, TOTAL_LESSONS), `${p.lessons}/${TOTAL_LESSONS}`, { color: 'url(#g-warm)' })}<div class="small"><strong>Teoría</strong></div></div>
      </div>
      <p class="eyebrow">Tu meta</p>
      ${GOALS.map((g) => `<div class="goal-chip"><span class="tile-ico">${icon('target')}</span><span class="grow"><strong>${g.title}</strong><br><span class="small muted">${g.by}</span></span></div>`).join('')}
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

function bindMic(onNote) {
  if (session.input !== 'mic') return;
  const meter = $('#meter');
  mic.onNote = onNote;
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
  if (l.staff) drawExample($('#example'), l.staff);
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
    store.record('c', c.id, firstTry, performance.now() - play.shownAt);
    tally(firstTry, c.letters);
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
  bindMic(answer);
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
        store.record('c', c.id, tries === 1, performance.now() - shownAt);
        tally(tries === 1, c.letters);
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

function renderIntro(step) {
  const n = NOTE_BY_MIDI.get(step.midi);
  sessionShell(`
    <section class="stack">
      <p class="small muted center">Nota nueva</p>
      <h2 class="center">${n.label}</h2>
      <div class="paper staff-single" id="staff"></div>
      <p>${n.where}</p>
      <p class="muted">${n.link}</p>
      <div class="keys-box" id="keys"></div>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">Entendido, quiero tocarla</button>
  `);
  drawStaff($('#staff'), [step.midi]);
  drawKeyboard($('#keys'), { highlight: step.midi, labels: true });
  $('#ok').onclick = nextStep;
}

// Tarjeta de una nota o frase de varias.
function renderPlay(step) {
  const isPhrase = step.type === 'phrase';
  const targets = isPhrase ? step.midis : [step.midi];
  const play = { pos: 0, attempts: 0, shownAt: performance.now(), locked: false, hinted: !!step.guided };
  const showNames = store.getState().settings.showNames && !step.placement;

  sessionShell(`
    <section class="stack">
      ${step.placement ? '<p class="eyebrow center">Prueba de nivel</p>' : ''}
      <p class="prompt">${isPhrase ? 'Lee y toca las notas en orden' : step.guided ? `Toca ${NOTE_BY_MIDI.get(step.midi).label} en tu teclado` : 'Toca esta nota'}</p>
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
    drawStaff(staffEl, targets, states);
  };
  const drawKeys = () => {
    drawKeyboard(keysEl, {
      highlight: play.hinted ? targets[play.pos] : null,
      labels: play.hinted,
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
  if (showNames && !isPhrase) setFb(NOTE_BY_MIDI.get(targets[0]).label, 'feedback-hint');

  function giveHint() {
    play.hinted = true;
    keysEl.hidden = false;
    drawKeys();
    const n = NOTE_BY_MIDI.get(targets[play.pos]);
    setFb(`Es ${n.label}. ${n.where}`, 'feedback-hint');
  }

  // En la prueba de nivel no hay pistas: se anota y se pasa a la siguiente.
  function placementResult(ok) {
    play.locked = true;
    if (ok) session.placed.push(targets[0]);
    flash(ok ? 'paper-good' : 'paper-bad');
    setFb(ok ? 'Correcto.' : `Era ${NOTE_BY_MIDI.get(targets[0]).label}.`, ok ? 'feedback-good' : 'feedback-bad');
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
      store.record('n', target, firstTry, ms);
      tally(firstTry, NOTE_BY_MIDI.get(target).label);

      // Si costó, la misma nota vuelve un poco más adelante (una sola vez).
      if (!firstTry && !isPhrase && !step.retry) {
        const at = Math.min(session.steps.length, session.index + 4);
        session.steps.splice(at, 0, { type: 'card', midi: target, retry: true });
      }

      flash('paper-good');
      setFb(`Correcto: ${NOTE_BY_MIDI.get(target).label}`, 'feedback-good');
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
      setFb(`Es ${NOTE_BY_MIDI.get(target).name}, pero en otra altura. Búscala más ${midi > target ? 'a la izquierda' : 'a la derecha'}.`, 'feedback-bad');
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
  bindMic(answer);
}

// ---------- cierre ----------

function finishSession() {
  const seconds = Math.round((Date.now() - session.startedAt) / 1000);
  const result = store.completeSession({
    cards: session.answered,
    firstTry: session.firstTry,
    seconds,
    minimal: session.minimal,
  });
  stopMic();

  const acc = session.answered ? Math.round((session.firstTry / session.answered) * 100) : 0;
  const hard = [...session.missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label]) => label);
  const next = [];
  const lc = store.lessonsDone('chords');
  const ls = store.lessonsDone('staff');
  const nextTrack = lc < LESSONS.chords.length && (lc <= ls || ls >= LESSONS.staff.length) ? 'chords' : ls < LESSONS.staff.length ? 'staff' : null;
  if (nextTrack) next.push(`Teoría: ${LESSONS[nextTrack][nextTrack === 'chords' ? lc : ls].title}.`);
  const newChords = store.nextNew('c');
  if (newChords.length) next.push(`Acordes nuevos: ${newChords.map((id) => CHORD_BY_ID.get(id).letters).join(' y ')}.`);
  const newNotes = store.nextNew('n');
  if (newNotes.length) next.push(`Notas nuevas: ${newNotes.map((m) => NOTE_BY_MIDI.get(m).label).join(' y ')}.`);
  if (!newChords.length && !newNotes.length) next.push('Toca afirmar lo que ya viste antes de sumar algo nuevo.');

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  let extra = '';
  if (result.usedFreezes) extra += `<p class="small muted">Usaste ${plural(result.usedFreezes, 'día de perdón', 'días de perdón')} para mantener la racha.</p>`;
  if (result.earnedFreeze) extra += '<p class="small muted">Ganaste un día de perdón por tu constancia.</p>';

  show(`
    <header class="center"><p class="eyebrow">Sesión terminada</p><h1 class="title grad-text">¡Bien hecho!</h1></header>
    <section class="card stack center">
      ${ring(acc, `${acc}%`, { big: true })}
      <p class="muted">al primer intento</p>
      <div><span class="pill pill-fire">${icon('flame')}${plural(result.streak, 'día seguido', 'días seguidos')}</span></div>
      ${extra}
    </section>
    <section class="card stack">
      <div class="stats">
        <div><div class="stat-num">${session.answered}</div><div class="small muted">ejercicios</div></div>
        <div><div class="stat-num">${session.firstTry}</div><div class="small muted">aciertos directos</div></div>
        <div><div class="stat-num">${mins}:${String(secs).padStart(2, '0')}</div><div class="small muted">tiempo</div></div>
      </div>
      ${session.lesson ? `<p>Teoría de hoy: ${session.lesson}.</p>` : ''}
      ${hard.length ? `<p>Lo que más costó hoy: ${hard.join(', ')}. Va a volver más seguido.</p>` : '<p>Todo al primer intento.</p>'}
      <p class="muted"><strong>Próxima sesión.</strong> ${next.join(' ')}</p>
    </section>
    <div class="spacer"></div>
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
      <p class="small muted">${p.notesFirm} de ${NOTES.length} firmes.</p>
      <div class="chip-row">${noteChips}</div>
      <button class="btn" id="placement">${store.getState().placementDone ? 'Repetir la prueba de nivel' : 'Hacer la prueba de nivel'}<small>12 notas, 1 minuto. Las que aciertes quedan como firmes.</small></button>
    </section>

    <section class="card stack">
      <h2>Cómo avanzas</h2>
      <ul class="plain-list">
        <li>Cada nota y cada acorde tiene cinco niveles de dominio. Sube uno cuando aciertas al primer intento y sin demorarte.</li>
        <li>Si fallas, baja dos niveles y vuelve a aparecer pronto.</li>
        <li>Llegan hasta dos notas y dos acordes nuevos por sesión, cuando todo lo anterior está en nivel 2 o más.</li>
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

renderHome();
