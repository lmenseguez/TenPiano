import { NOTES, NOTE_BY_MIDI, MAX_BOX, LESSONS, STAGES, SESSION_PARTS } from './data.js';
import * as store from './store.js';
import { buildSession } from './session.js';
import { drawStaff, drawKeyboard, drawExample } from './staff.js';
import { MicListener, keepAwake } from './audio.js';
import { midiName } from './pitch.js';

const app = document.getElementById('app');
const mic = new MicListener();
let session = null;

store.load();

// ---------- utilidades ----------

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
}

function show(html) {
  app.innerHTML = '';
  app.appendChild(h(html));
  window.scrollTo(0, 0);
}

const $ = (sel) => app.querySelector(sel);

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// Nombre para mostrar de cualquier nota que se oiga.
function heardLabel(midi) {
  const known = NOTE_BY_MIDI.get(midi);
  if (known) return known.label;
  const name = midiName(midi);
  if (midi < 60) return `${name} grave`;
  if (midi > 79) return `${name} muy agudo`;
  return name;
}

// Barra de volumen en escala logarítmica, para que se note también el sonido bajo.
function meterPct(level) {
  if (!level || level <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((Math.log10(level) + 3.3) / 2.3) * 100)));
}

const BRAND = '<span class="brand"><img src="icons/logo-mark.png" alt="" width="40" height="40"><h1>Ten<span class="p">P</span>iano</h1></span>';

function stopMic() {
  mic.onNote = null;
  mic.onLevel = null;
  mic.stop();
  keepAwake(false);
}

// ---------- inicio ----------

function renderHome() {
  stopMic();
  session = null;
  const state = store.getState();
  const st = store.streakStatus();
  const week = store.weekSummary();
  const isNew = store.unlockedNotes().length === 0;
  const { firm, lessons, pct: stagePct } = stageProgress();

  let status;
  if (st.doneToday) status = '<span class="badge badge-good">Hoy ya practicaste</span>';
  else if (st.atRisk) status = `<span class="badge badge-warn">Si practicas hoy, tu racha sigue (usa ${plural(st.willUse, 'día de perdón', 'días de perdón')})</span>`;
  else if (st.lost) status = '<span class="badge">La racha se reinició. Hoy empiezas una nueva.</span>';
  else if (st.streak > 0) status = '<span class="badge badge-warn">Te falta la sesión de hoy</span>';
  else status = '<span class="badge">Tu primera sesión te espera</span>';

  const chips = NOTES.map((n) => {
    const s = store.noteStat(n.midi);
    const dots = Array.from({ length: MAX_BOX }, (_, i) => `<span class="dot ${s && i < s.box ? 'dot-on' : ''}"></span>`).join('');
    return `<div class="chip ${s ? '' : 'chip-locked'}" title="${s ? `Dominio ${s.box} de ${MAX_BOX}` : 'Aún no presentada'}">
      ${n.label}<div class="dots" aria-hidden="true">${dots}</div></div>`;
  }).join('');

  show(`
    <header class="row-between">
      ${BRAND}
      <button class="icon-btn" id="settings" aria-label="Ajustes">⚙</button>
    </header>

    <section class="card stack">
      <div class="streak">
        <span class="streak-num">${st.streak}</span>
        <span>${st.streak === 1 ? 'día seguido' : 'días seguidos'}</span>
      </div>
      <div>${status}</div>
      <p class="small muted">Días de perdón disponibles: ${state.freezes}. Si un día no puedes, la racha no se rompe.</p>
    </section>

    <section class="stack">
      <button class="btn btn-primary" id="start">${isNew ? 'Empezar la primera sesión' : st.doneToday ? 'Practicar otra vez' : 'Empezar la sesión de hoy'}<small>Unos 10 minutos: teoría y práctica</small></button>
      ${isNew ? '' : '<button class="btn" id="start-min">Sesión mínima<small>2 minutos de práctica, para los días difíciles</small></button>'}
    </section>

    <section class="card stack">
      <p class="eyebrow">Tu camino · Etapa 1 de ${STAGES.length}</p>
      <h2>${STAGES[0].title}</h2>
      <div class="bar" role="progressbar" aria-label="Avance de la etapa" aria-valuenow="${stagePct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${stagePct}%"></div></div>
      <p class="small muted">${firm} de ${NOTES.length} notas firmes · ${lessons} de ${LESSONS.length} lecciones de teoría</p>
      <button class="btn" id="path">Ver mi plan de aprendizaje<small>Qué vas a aprender y en qué orden</small></button>
    </section>

    <section class="card stack">
      <h2>Tus notas</h2>
      <div class="notes-grid">${chips}</div>
      <p class="small muted">Cada punto verde es un nivel de dominio. Una nota nueva aparece cuando las anteriores están firmes.</p>
    </section>

    <section class="card stack">
      <h2>Últimos 7 días</h2>
      <div class="stats">
        <div><div class="stat-num">${week.days}</div><div class="small muted">días</div></div>
        <div><div class="stat-num">${week.minutes}</div><div class="small muted">minutos</div></div>
        <div><div class="stat-num">${week.accuracy === null ? '–' : week.accuracy + '%'}</div><div class="small muted">al primer intento</div></div>
      </div>
    </section>
    <button class="btn" id="mictest">Probar el micrófono<small>Comprueba que la app oye tu teclado</small></button>
    ${store.isMemoryOnly() ? '<p class="small muted center">Este navegador no permite guardar el progreso. Lo que practiques se perderá al cerrar.</p>' : ''}
  `);

  $('#start').onclick = () => startSession(false);
  if ($('#start-min')) $('#start-min').onclick = () => startSession(true);
  $('#mictest').onclick = renderMicTest;
  $('#settings').onclick = renderSettings;
  $('#path').onclick = renderPath;
}

// Avance de la etapa 1: notas firmes (dominio 3 o más) y lecciones completadas.
function stageProgress() {
  const firm = NOTES.filter((n) => (store.noteStat(n.midi)?.box || 0) >= 3).length;
  const lessons = store.lessonsDone();
  const pct = Math.round(((firm + lessons) / (NOTES.length + LESSONS.length)) * 100);
  return { firm, lessons, pct };
}

// ---------- sesión ----------

async function startSession(minimal) {
  const settings = store.getState().settings;
  let input = settings.input;
  let micNote = '';
  if (input === 'mic') {
    if (!MicListener.supported()) {
      input = 'screen';
      micNote = 'Este navegador no da acceso al micrófono. Usa el teclado en pantalla.';
    } else {
      try {
        await mic.start();
        keepAwake(true);
      } catch (e) {
        input = 'screen';
        micNote = 'No se pudo usar el micrófono (revisa el permiso del navegador). Por ahora usa el teclado en pantalla.';
      }
    }
  }
  const steps = buildSession({ minimal });
  store.save();
  session = {
    steps,
    index: 0,
    minimal,
    input,
    showKeys: input === 'screen',
    micNote,
    startedAt: Date.now(),
    answered: 0,
    firstTry: 0,
    lesson: null,
    quizzes: 0,
    quizRight: 0,
    missed: new Map(),
  };
  renderStep();
}

function sessionShell(inner) {
  const pct = Math.round((session.index / session.steps.length) * 100);
  show(`
    <header class="row">
      <button class="icon-btn" id="quit" aria-label="Salir de la sesión">✕</button>
      <div class="progress grow" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
    </header>
    ${inner}
  `);
  $('#quit').onclick = () => {
    store.save();
    renderHome();
  };
}

function renderStep() {
  mic.onNote = null;
  if (session.index >= session.steps.length) return finishSession();
  const step = session.steps[session.index];
  if (step.type === 'intro') return renderIntro(step);
  if (step.type === 'theory') return renderLesson(step.lesson, { inSession: true });
  if (step.type === 'quiz') return renderQuiz(step.lesson, { review: true });
  return renderPlay(step);
}

function nextStep() {
  session.index += 1;
  renderStep();
}

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

// ---------- teoría ----------

function lessonHtml(index) {
  const l = LESSONS[index];
  return `
    <section class="stack lesson">
      <p class="eyebrow">Teoría · Lección ${index + 1} de ${LESSONS.length}</p>
      <h2>${l.title}</h2>
      ${l.staff ? '<div class="paper" id="example"></div>' : ''}
      ${l.body.map((p) => `<p>${p}</p>`).join('')}
      ${l.keyboard ? '<div class="keys-box" id="keys"></div>' : ''}
    </section>`;
}

function paintLesson(index) {
  const l = LESSONS[index];
  if (l.staff) drawExample($('#example'), l.staff);
  if (l.keyboard) drawKeyboard($('#keys'), { highlight: l.keyboard, labels: true });
}

// Lección dentro de la sesión (seguida de su pregunta) o para releer desde "Tu camino".
function renderLesson(index, { inSession }) {
  const body = `${lessonHtml(index)}
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok">${inSession ? 'Continuar' : 'Volver'}</button>`;
  if (inSession) {
    sessionShell(body);
    $('#ok').onclick = () => renderQuiz(index, { review: false });
  } else {
    show(`<header class="row"><button class="icon-btn" id="back" aria-label="Volver">←</button><h2>Teoría</h2></header>${body}`);
    $('#back').onclick = renderPath;
    $('#ok').onclick = renderPath;
  }
  paintLesson(index);
}

function renderQuiz(index, { review }) {
  const l = LESSONS[index];
  const order = l.quiz.options.map((_, i) => i).sort(() => Math.random() - 0.5);
  sessionShell(`
    <section class="stack">
      <p class="eyebrow">${review ? 'Repaso de teoría' : 'Comprueba'} · ${l.title}</p>
      <p class="prompt" style="text-align:left">${l.quiz.q}</p>
      <div class="options">
        ${order.map((i) => `<button class="btn option" data-i="${i}">${l.quiz.options[i]}</button>`).join('')}
      </div>
      <p class="feedback" id="feedback" role="status" style="text-align:left"></p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="ok" hidden>Seguir</button>
  `);
  let tries = 0;
  app.querySelectorAll('.option').forEach((b) => {
    b.onclick = () => {
      const fb = $('#feedback');
      tries += 1;
      if (Number(b.dataset.i) === l.quiz.answer) {
        b.classList.add('option-right');
        app.querySelectorAll('.option').forEach((o) => (o.disabled = true));
        fb.textContent = `Correcto. ${l.quiz.why}`;
        fb.className = 'feedback feedback-good';
        session.quizzes += 1;
        if (tries === 1) session.quizRight += 1;
        if (!review) {
          store.completeLesson(index);
          session.lesson = index;
        }
        $('#ok').hidden = false;
        $('#ok').focus();
      } else {
        b.classList.add('option-wrong');
        b.disabled = true;
        fb.textContent = 'No es esa. Piénsalo otra vez.';
        fb.className = 'feedback feedback-bad';
      }
    };
  });
  $('#ok').onclick = nextStep;
}

// ---------- práctica ----------

function listenRow() {
  if (session.input !== 'mic') return '';
  return `<div class="listen"><span>Escuchando tu teclado</span><div class="meter" aria-hidden="true"><div id="meter"></div></div></div>`;
}

// Tarjeta de una nota o frase de varias.
function renderPlay(step) {
  const isPhrase = step.type === 'phrase';
  const targets = isPhrase ? step.midis : [step.midi];
  const play = { pos: 0, attempts: 0, shownAt: performance.now(), locked: false, hinted: !!step.guided };
  const showNames = store.getState().settings.showNames;

  sessionShell(`
    <section class="stack">
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

  function answer(midi) {
    if (play.locked) return;
    const target = targets[play.pos];
    const strict = store.getState().settings.strictOctave;
    const sameClass = ((midi - target) % 12 + 12) % 12 === 0;

    if (midi === target || (!strict && sameClass)) {
      const ms = performance.now() - play.shownAt;
      const firstTry = play.attempts === 0 && !(play.hinted && !step.guided);
      store.recordAnswer(target, firstTry, ms);
      session.answered += 1;
      if (firstTry) session.firstTry += 1;
      else session.missed.set(target, (session.missed.get(target) || 0) + 1);

      // Si costó, la misma nota vuelve un poco más adelante (una sola vez por tarjeta).
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
    if (play.attempts >= 2) {
      giveHint();
    } else {
      setFb(`Tocaste ${heardLabel(midi)}. La nota está más ${midi > target ? 'abajo (a la izquierda)' : 'arriba (a la derecha)'}.`, 'feedback-bad');
    }
  }

  $('#skip').onclick = () => {
    if (play.locked) return;
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

  if (session.input === 'mic') {
    const meter = $('#meter');
    mic.onNote = (midi) => answer(midi);
    mic.onLevel = ({ level }) => {
      if (meter && meter.isConnected) meter.style.width = meterPct(level) + '%';
    };
  }
}

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
  const hard = [...session.missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => NOTE_BY_MIDI.get(m).label);
  const next = store.nextNewNote();
  const weak = store.unlockedNotes().filter((n) => store.noteStat(n.midi).box < 2).map((n) => n.label);
  const nextLesson = LESSONS[store.lessonsDone()];
  const tomorrow = [
    nextLesson ? `Teoría de la próxima sesión: ${nextLesson.title}.` : '',
    next
      ? `Nota nueva: ${next.label}.`
      : weak.length
        ? `Toca afirmar ${weak.slice(0, 3).join(', ')}; cuando estén firmes aparece la siguiente nota.`
        : 'Seguimos con repaso y frases.',
  ].filter(Boolean).join(' ');
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  let extra = '';
  if (result.usedFreezes) extra += `<p class="small muted">Usaste ${plural(result.usedFreezes, 'día de perdón', 'días de perdón')} para mantener la racha.</p>`;
  if (result.earnedFreeze) extra += '<p class="small muted">Ganaste un día de perdón por tu constancia.</p>';

  show(`
    <header><h1>Sesión terminada</h1></header>
    <section class="card stack">
      <div class="streak"><span class="streak-num">${result.streak}</span><span>${result.streak === 1 ? 'día seguido' : 'días seguidos'}</span></div>
      ${extra}
    </section>
    <section class="card stack">
      <div class="stats">
        <div><div class="stat-num">${session.answered}</div><div class="small muted">notas</div></div>
        <div><div class="stat-num">${acc}%</div><div class="small muted">al primer intento</div></div>
        <div><div class="stat-num">${mins}:${String(secs).padStart(2, '0')}</div><div class="small muted">tiempo</div></div>
      </div>
      ${session.lesson !== null ? `<p>Teoría de hoy: ${LESSONS[session.lesson].title}.</p>` : ''}
      ${hard.length ? `<p>Las que más costaron hoy: ${hard.join(', ')}. Van a volver más seguido.</p>` : '<p>Todas al primer intento.</p>'}
      <p class="muted">${tomorrow}</p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="home">Listo</button>
  `);
  $('#home').onclick = renderHome;
}

// ---------- tu camino ----------

function renderPath() {
  stopMic();
  const { firm, lessons } = stageProgress();
  const unlocked = store.unlockedNotes().length;

  const parts = SESSION_PARTS.map((p) => `
    <div class="part"><span class="part-time">${p.time}</span><span><strong>${p.title}.</strong> ${p.text}</span></div>`).join('');

  const stages = STAGES.map((st) => `
    <div class="stage ${st.id === 1 ? 'stage-now' : ''}">
      <div class="stage-num" aria-hidden="true">${st.id}</div>
      <div class="grow">
        <p><strong>${st.title}</strong> ${st.id === 1 ? '<span class="badge badge-warn">Estás aquí</span>' : '<span class="badge">Próximamente</span>'}</p>
        <p class="small muted">${st.goal}</p>
        <ul class="small">${st.topics.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
    </div>`).join('');

  const lessonRows = LESSONS.map((l, i) => `
    <li><button class="lesson-row" data-lesson="${i}">
      <span class="lesson-mark" aria-hidden="true">${i < lessons ? '✓' : i + 1}</span>
      <span class="grow">${l.title}${i < lessons ? '<span class="small muted"> · vista</span>' : i === lessons ? '<span class="small muted"> · próxima sesión</span>' : ''}</span>
      <span aria-hidden="true">›</span>
    </button></li>`).join('');

  show(`
    <header class="row">
      <button class="icon-btn" id="back" aria-label="Volver">←</button>
      <h2>Tu plan de aprendizaje</h2>
    </header>

    <section class="card stack">
      <h2>La meta</h2>
      <p>Leer una partitura sencilla y tocarla con las dos manos. El camino tiene ${STAGES.length} etapas; cada una se apoya en la anterior.</p>
    </section>

    <section class="card stack">
      <h2>Cómo es cada sesión</h2>
      <div>${parts}</div>
      <p class="small muted">Son unos 10 minutos. La sesión mínima de 2 minutos es solo práctica, para no perder la racha.</p>
    </section>

    <section class="card stack">
      <h2>Las etapas</h2>
      ${stages}
      <p class="small muted">Las etapas 2 a 6 todavía no están construidas en la app. Se van a ir agregando en este orden.</p>
    </section>

    <section class="card stack">
      <p class="eyebrow">Etapa 1 · Dónde estás</p>
      <p><strong>Notas:</strong> ${unlocked} de ${NOTES.length} presentadas, ${firm} firmes.</p>
      <div class="bar"><div style="width:${Math.round((firm / NOTES.length) * 100)}%"></div></div>
      <p class="small muted">Orden: ${NOTES.map((n) => n.label).join(', ')}.</p>
      <p><strong>Teoría:</strong> ${lessons} de ${LESSONS.length} lecciones.</p>
      <div class="bar"><div style="width:${Math.round((lessons / LESSONS.length) * 100)}%"></div></div>
    </section>

    <section class="card stack">
      <h2>Cómo avanzas</h2>
      <ul class="plain-list">
        <li>Cada nota tiene cinco niveles de dominio. Sube uno cuando la aciertas al primer intento y en menos de 4 segundos.</li>
        <li>Si fallas, baja dos niveles y vuelve a aparecer pronto.</li>
        <li>Una nota nueva aparece cuando todas las anteriores llegan al nivel 2.</li>
        <li>Una nota cuenta como firme desde el nivel 3. La etapa termina con las 12 notas firmes y las 12 lecciones vistas.</li>
      </ul>
    </section>

    <section class="card stack">
      <h2>Lecciones de teoría</h2>
      <p class="small muted">Llega una por sesión. Aquí puedes releerlas o adelantarte cuando quieras.</p>
      <ul class="lesson-list">${lessonRows}</ul>
    </section>
  `);
  $('#back').onclick = renderHome;
  app.querySelectorAll('[data-lesson]').forEach((b) => {
    b.onclick = () => renderLesson(Number(b.dataset.lesson), { inSession: false });
  });
}

// ---------- prueba de micrófono ----------

async function renderMicTest() {
  show(`
    <header class="row">
      <button class="icon-btn" id="back" aria-label="Volver">←</button>
      <h2>Prueba de micrófono</h2>
    </header>
    <section class="card stack">
      <p>Toca una tecla a la vez en tu teclado. Aquí aparece la nota que la app oye.</p>
      <div class="heard" id="heard">…</div>
      <div class="listen"><span>Volumen</span><div class="meter" style="width:160px"><div id="meter"></div></div></div>
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
        <li>Toca una sola tecla a la vez: los acordes no se reconocen.</li>
      </ul>
    </section>
  `);
  $('#back').onclick = renderHome;

  if (!MicListener.supported()) {
    $('#msg').textContent = 'Este navegador no da acceso al micrófono.';
    return;
  }
  try {
    await mic.start();
  } catch (e) {
    if ($('#msg')) $('#msg').textContent = 'No se pudo usar el micrófono. Revisa el permiso en el navegador y vuelve a entrar.';
    return;
  }
  if (!$('#heard')) return stopMic();
  keepAwake(true);
  $('#msg').textContent = 'Escuchando.';
  let clearTimer = null;
  mic.onLevel = ({ level, midi }) => {
    const meter = $('#meter');
    if (!meter) return;
    meter.style.width = meterPct(level) + '%';
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

function renderSettings() {
  const s = store.getState().settings;
  show(`
    <header class="row">
      <button class="icon-btn" id="back" aria-label="Volver">←</button>
      <h2>Ajustes</h2>
    </header>
    <section class="card">
      <div class="setting" style="display:block">
        <p><strong>Cómo respondes</strong></p>
        <p class="small muted" style="margin-bottom:8px">Con micrófono tocas en tu teclado real. El teclado en pantalla sirve si estás lejos del piano.</p>
        <div class="seg" role="group" aria-label="Cómo respondes">
          <button data-input="mic" aria-pressed="${s.input === 'mic'}">Micrófono</button>
          <button data-input="screen" aria-pressed="${s.input === 'screen'}">Teclado en pantalla</button>
        </div>
      </div>
      <label class="setting">
        <span><strong>Exigir la altura exacta</strong><br><span class="small muted">El Do central y el Do agudo cuentan como notas distintas.</span></span>
        <input type="checkbox" id="strict" ${s.strictOctave ? 'checked' : ''}>
      </label>
      <label class="setting">
        <span><strong>Mostrar el nombre de la nota</strong><br><span class="small muted">Ayuda al principio; apágalo para leer de verdad.</span></span>
        <input type="checkbox" id="names" ${s.showNames ? 'checked' : ''}>
      </label>
    </section>
    <section class="card stack" id="reset-box">
      <p><strong>Reiniciar el progreso</strong></p>
      <p class="small muted">Borra las notas aprendidas y la racha de este dispositivo.</p>
      <button class="btn" id="reset">Reiniciar</button>
    </section>
  `);
  $('#back').onclick = renderHome;
  app.querySelectorAll('[data-input]').forEach((b) => {
    b.onclick = () => {
      store.setSetting('input', b.dataset.input);
      renderSettings();
    };
  });
  $('#strict').onchange = (e) => store.setSetting('strictOctave', e.target.checked);
  $('#names').onchange = (e) => store.setSetting('showNames', e.target.checked);
  $('#reset').onclick = () => {
    $('#reset-box').innerHTML = `
      <p><strong>¿Seguro? No se puede deshacer.</strong></p>
      <div class="row"><button class="btn" id="no">Cancelar</button><button class="btn btn-primary" id="yes">Sí, borrar</button></div>`;
    $('#no').onclick = renderSettings;
    $('#yes').onclick = () => {
      store.resetAll();
      renderHome();
    };
  };
}

// Suelta el micrófono si la app pasa a segundo plano fuera de una sesión.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!session) stopMic();
  } else if (session && session.input === 'mic' && mic.ctx && mic.ctx.state === 'suspended') {
    mic.ctx.resume().catch(() => {});
  } else if (!session && app.querySelector('#heard')) {
    renderMicTest();
  }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

renderHome();
