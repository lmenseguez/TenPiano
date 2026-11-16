import { NOTES, NOTE_BY_MIDI, MAX_BOX } from './data.js';
import * as store from './store.js';
import { buildSession } from './session.js';
import { drawStaff, drawKeyboard } from './staff.js';
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
      <h1>TenPiano</h1>
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
      <button class="btn btn-primary" id="start">${isNew ? 'Empezar la primera sesión' : st.doneToday ? 'Practicar otra vez' : 'Empezar la sesión de hoy'}<small>Unos 5 minutos</small></button>
      ${isNew ? '' : '<button class="btn" id="start-min">Sesión mínima<small>2 minutos, para los días difíciles</small></button>'}
      <button class="btn" id="mictest">Probar el micrófono<small>Comprueba que la app oye tu teclado</small></button>
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
    ${store.isMemoryOnly() ? '<p class="small muted center">Este navegador no permite guardar el progreso. Lo que practiques se perderá al cerrar.</p>' : ''}
  `);

  $('#start').onclick = () => startSession(false);
  if ($('#start-min')) $('#start-min').onclick = () => startSession(true);
  $('#mictest').onclick = renderMicTest;
  $('#settings').onclick = renderSettings;
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
      if (meter && meter.isConnected) meter.style.width = Math.min(100, Math.round(level * 500)) + '%';
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
  const tomorrow = next
    ? `Mañana conoces una nota nueva: ${next.label}.`
    : weak.length
      ? `Mañana toca afirmar ${weak.slice(0, 3).join(', ')}. Cuando estén firmes aparece la siguiente nota.`
      : 'Mañana seguimos con repaso y frases.';
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
      ${hard.length ? `<p>Las que más costaron hoy: ${hard.join(', ')}. Van a volver más seguido.</p>` : '<p>Todas al primer intento.</p>'}
      <p class="muted">${tomorrow}</p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="home">Listo</button>
  `);
  $('#home').onclick = renderHome;
}

// ---------- prueba de micrófono ----------

async function renderMicTest() {
  show(`
    <header class="row">
      <button class="icon-btn" id="back" aria-label="Volver">←</button>
      <h2>Prueba de micrófono</h2>
    </header>
    <section class="card stack">
      <p>Toca una tecla a la vez en tu teclado, con el volumen a la mitad o más. Aquí aparece la nota que la app oye.</p>
      <div class="heard" id="heard">…</div>
      <div class="listen"><span>Volumen</span><div class="meter" style="width:160px"><div id="meter"></div></div></div>
      <p class="small muted center" id="msg">Pidiendo permiso para usar el micrófono…</p>
    </section>
    <section class="card stack">
      <h2>Qué comprobar</h2>
      <p>1. Toca el Do central: debe decir “Do central”.</p>
      <p>2. Toca Mi y Sol hacia la derecha: deben aparecer con su nombre.</p>
      <p>3. Si no reconoce las notas, acerca el dispositivo al parlante del teclado y usa el sonido de piano (botón Portable Grand).</p>
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
    meter.style.width = Math.min(100, Math.round(level * 500)) + '%';
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
