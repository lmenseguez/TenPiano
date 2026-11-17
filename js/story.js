// Tu recorrido: un repaso animado de todo lo que llevas logrado.
// Solo lee datos; no guarda nada.
import * as store from './store.js';
import { CHORDS, NOTES, BASS_NOTES, ALL_NOTES_COUNT, TOTAL_LESSONS, ACHIEVEMENTS, GOALS } from './data.js';
import { show, $, $$, icon, plural, ring, celebrate } from './ui.js';

const COUNT_MS = 900;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const nf = new Intl.NumberFormat('es-419');
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// La hoja de estilos se carga sola la primera vez, por si la página no la enlaza.
let cssReady = null;
function ensureCss() {
  if (cssReady) return cssReady;
  if ([...document.styleSheets].some((s) => s.href && /\/story\.css(\?|$)/.test(s.href)) || document.querySelector('link[href*="story.css"]')) {
    cssReady = Promise.resolve();
    return cssReady;
  }
  cssReady = new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../css/story.css', import.meta.url).href;
    link.onload = link.onerror = () => resolve();
    setTimeout(resolve, 1500);
    document.head.appendChild(link);
  });
  return cssReady;
}

// ---------- piezas de texto ----------

// Número que cuenta hacia arriba. El valor final queda siempre disponible para lectores de pantalla.
function num(value, suffix = '') {
  const text = nf.format(value) + suffix;
  return `<span class="st-n" aria-label="${text}"><span class="st-count" aria-hidden="true" data-to="${value}" data-suffix="${suffix}">${text}</span><span class="st-sr">${text}</span></span>`;
}

function fmtDay(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!m) return '';
  const base = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  return Number(m[1]) === new Date().getFullYear() ? base : `${base} ${m[1]}`;
}

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const falta = (n, one, many) => `Te ${n === 1 ? 'falta' : 'faltan'} ${plural(n, one, many)}`;

function bar(part, total, cls = '') {
  return `<div class="bar st-bar ${cls}" aria-hidden="true"><div class="st-fill" style="--w:${pct(part, total)}%"></div></div>`;
}

function flame(on) {
  return `<div class="st-flame ${on ? '' : 'st-flame-off'}" aria-hidden="true">
    <span class="st-flame-glow"></span>
    <svg viewBox="0 0 24 24">
      <defs>
        <linearGradient id="st-g-flame" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="#ff5a2d"/><stop offset="0.6" stop-color="#ff9a3d"/><stop offset="1" stop-color="#ffd35c"/></linearGradient>
        <linearGradient id="st-g-core" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ffd35c"/></linearGradient>
      </defs>
      <path class="st-flame-out" fill="url(#st-g-flame)" d="M12.4 2.5c.6 3.4 5.1 5.3 5.1 10.6a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.2-4.8 0 2 .8 3.1 1.9 3.3-.4-3.3.2-6.2 1.8-9.1z"/>
      <path class="st-flame-core" fill="url(#st-g-core)" d="M12.2 11.2c.3 1.6 2.3 2.4 2.3 4.6a2.5 2.5 0 0 1-5 0c0-1 .5-1.7 1-2.2 0 .9.4 1.4.9 1.5-.2-1.5.1-2.7.8-3.9z"/>
    </svg>
  </div>`;
}

// ---------- datos ----------

function gather() {
  const state = store.getState();
  const sessions = Array.isArray(state.sessions) ? state.sessions : [];
  const c = store.counters();
  const st = store.streakStatus();
  const cards = sessions.reduce((a, s) => a + (s.cards || 0), 0);
  const firstTry = sessions.reduce((a, s) => a + (s.firstTry || 0), 0);
  const week = store.lastDays();
  const chordsFirm = store.firmCount('c');
  const trebleFirm = store.firmCount('n');
  const bassFirm = store.firmCount('b');
  const lessons = store.lessonsDone('chords') + store.lessonsDone('staff');
  const parts = [
    { label: 'Acordes', value: chordsFirm / CHORDS.length },
    { label: 'Lectura', value: (trebleFirm + bassFirm) / ALL_NOTES_COUNT },
    { label: 'Teoría', value: lessons / TOTAL_LESSONS },
  ];
  const readiness = Math.round((parts.reduce((a, p) => a + p.value, 0) / parts.length) * 100);
  const recent = sessions.filter((s) => s.cards > 0).slice(-10).map((s) => ({
    day: s.day, cards: s.cards, firstTry: s.firstTry || 0, acc: pct(s.firstTry || 0, s.cards),
  }));
  return {
    state, sessions, c, st, cards, firstTry, week,
    sessionCount: sessions.length,
    minutes: c.minutes,
    days: new Set(sessions.map((s) => s.day)).size,
    weekDone: week.filter((d) => d.done).length,
    accuracy: cards ? pct(firstTry, cards) : null,
    chordsFirm, trebleFirm, bassFirm, lessons, parts, readiness, recent,
    unlocked: ACHIEVEMENTS.filter((a) => store.hasAchievement(a.id)),
    next: store.nextAchievement(),
  };
}

// Lectura honesta de la tendencia: compara la primera mitad con la segunda.
function trendOf(recent) {
  const n = recent.length;
  const half = Math.floor(n / 2);
  const mean = (list) => Math.round(list.reduce((a, s) => a + s.acc, 0) / list.length);
  const before = mean(recent.slice(0, half));
  const after = mean(recent.slice(n - half));
  const span = half === 1 ? 'entre la primera y la última de estas sesiones' : 'entre la primera mitad y la segunda de estas sesiones';
  const diff = after - before;
  if (diff >= 4) return { dir: 'up', title: 'Vas en alza', text: `Pasaste de ${before}% a ${after}% al primer intento ${span}.` };
  if (diff <= -4) return { dir: 'down', title: 'Bajó un poco: es normal al sumar cosas nuevas', text: `De ${before}% a ${after}% al primer intento ${span}. Lo nuevo cuesta al principio y después se asienta.` };
  return { dir: 'flat', title: 'Te mantienes', text: `Alrededor de ${after}% al primer intento ${span}.` };
}

// ---------- tarjetas ----------

function weekDots(d) {
  return `<div class="st-week" role="img" aria-label="Últimos 7 días: practicaste ${d.weekDone} de 7">
    ${d.week.map((day, i) => `<span class="st-day ${day.done ? 'st-day-on' : ''} ${day.today ? 'st-day-today' : ''}" style="--i:${i}"><span class="st-dot">${day.done ? icon('check') : ''}</span><span>${day.label}</span></span>`).join('')}
  </div>`;
}

function heroCard(d) {
  const s = d.st.streak;
  let line;
  if (s > 0 && d.st.doneToday) line = 'Hoy ya sumaste tu día.';
  else if (s > 0 && d.st.atRisk) line = 'Un día de perdón está cubriendo la pausa. Practica hoy para seguir.';
  else if (s > 0) line = 'Te falta la sesión de hoy para sumar un día.';
  else if (d.st.lost) line = `Tu racha anterior llegó a ${plural(d.st.lost, 'día', 'días')}. Lo que aprendiste sigue ahí: con la sesión de hoy empieza una nueva.`;
  else line = 'Con la sesión de hoy empieza una racha nueva.';
  return `<section class="st-card st-hero" aria-label="Tu racha">
    ${flame(s > 0)}
    <div class="st-big st-warm-text">${num(s)}</div>
    <h2 class="st-hero-title">${s === 1 ? 'día seguido' : 'días seguidos'}</h2>
    <p class="st-lead">${line}</p>
    ${weekDots(d)}
    <p class="small st-soft">Practicaste <strong>${d.weekDone} de los últimos 7 días</strong>.</p>
    <div class="st-total"><span class="st-total-num">${num(d.days)}</span><span>${d.days === 1 ? 'día de práctica en total' : 'días de práctica en total'}</span></div>
  </section>`;
}

function timeCard(d) {
  const h = Math.floor(d.minutes / 60);
  const m = d.minutes % 60;
  const hours = d.minutes >= 60 ? `<p class="small muted">Eso es ${h} h${m ? ` ${m} min` : ''} con las manos en el teclado.</p>` : '';
  const acc = d.accuracy === null
    ? '<p class="muted">Cuando respondas tus primeros ejercicios, aquí vas a ver cuántos te salen a la primera.</p>'
    : `<div class="st-acc">
        <div class="st-ring">${ring(d.accuracy, num(d.accuracy, '%'), { big: true })}</div>
        <div class="grow"><p class="st-acc-title">al primer intento</p>
        <p class="small muted">De ${plural(d.cards, 'ejercicio', 'ejercicios')}, ${d.firstTry === 1 ? '1 te salió' : `${nf.format(d.firstTry)} te salieron`} a la primera.</p></div>
      </div>`;
  return `<section class="st-card st-time" aria-label="Tiempo y esfuerzo">
    <p class="eyebrow">Tiempo y esfuerzo</p>
    <div class="st-huge grad-text">${num(d.minutes)}</div>
    <h2>${d.minutes === 1 ? 'minuto de práctica' : 'minutos de práctica'}</h2>
    ${hours}
    <div class="st-duo">
      <div class="st-mini"><div class="stat-num">${num(d.sessionCount)}</div><div class="small muted">${d.sessionCount === 1 ? 'sesión completada' : 'sesiones completadas'}</div></div>
      <div class="st-mini"><div class="stat-num">${num(d.cards)}</div><div class="small muted">${d.cards === 1 ? 'ejercicio respondido' : 'ejercicios respondidos'}</div></div>
    </div>
    ${acc}
  </section>`;
}

function chordsCard(d) {
  const table = d.state.chords || {};
  const total = CHORDS.length;
  const chips = CHORDS.map((ch, i) => {
    const s = table[ch.id];
    const kind = s && s.box >= 3 ? 'firm' : s ? 'seen' : 'off';
    const word = kind === 'firm' ? 'firme' : kind === 'seen' ? 'en práctica' : 'por venir';
    return `<li class="st-chip st-chip-${kind}" style="--i:${i}">${ch.letters}<span class="st-sr">, ${word}</span></li>`;
  }).join('');
  const inPractice = CHORDS.filter((ch) => table[ch.id] && table[ch.id].box < 3).length;
  let line;
  if (d.chordsFirm === total) line = 'Los tienes todos firmes: los armas a la primera y sin demora.';
  else if (d.chordsFirm > 0) line = `Firme quiere decir que lo armas a la primera y sin demora.${inPractice ? ` Hay ${inPractice} más en práctica.` : ''}`;
  else if (inPractice) line = `Todavía ninguno está firme, y ya tienes ${inPractice} en práctica. Un acorde queda firme cuando lo armas a la primera y sin demora varias veces.`;
  else line = 'Lo que sigue: tus primeros acordes. Quedan firmes cuando los armas a la primera y sin demora varias veces.';
  const river = GOALS[0] && Array.isArray(GOALS[0].chords) ? GOALS[0] : null;
  let riverHtml = '';
  if (river) {
    const k = river.chords.filter((id) => (table[id]?.box || 0) >= 3).length;
    riverHtml = `<div class="st-river"><span class="tile-ico violet">${icon('target')}</span><p class="grow">Acordes de ${river.title}: <strong>${k} de ${river.chords.length}</strong></p></div>`;
  }
  return `<section class="st-card st-chords" aria-label="Acordes">
    <p class="eyebrow st-violet">Acordes</p>
    <div class="st-split">
      <div class="st-ring">${ring(pct(d.chordsFirm, total), `<span class="st-frac">${num(d.chordsFirm)}<small>de ${total}</small></span>`, { color: 'url(#g-violet)', big: true })}</div>
      <div class="grow"><h2>${d.chordsFirm === 1 ? 'acorde firme' : 'acordes firmes'}</h2><p class="small muted">${line}</p></div>
    </div>
    <ul class="st-chips" aria-label="Tus acordes">${chips}</ul>
    <p class="st-legend small muted" aria-hidden="true"><span><i class="st-key st-key-firm"></i>Firme</span><span><i class="st-key st-key-seen"></i>En práctica</span><span><i class="st-key st-key-off"></i>Por venir</span></p>
    ${riverHtml}
  </section>`;
}

function readingCard(d) {
  const row = (title, hand, have, total, cls, zero) => {
    const left = total - have;
    const note = have === total ? 'Completa.' : have === 0 ? zero : `${falta(left, 'nota', 'notas')} para completarla.`;
    return `<div class="st-read">
      <div class="row-between"><div><strong>${title}</strong> <span class="small muted">· ${hand}</span></div><div class="st-read-num">${num(have)}<small> de ${total}</small></div></div>
      ${bar(have, total, cls)}
      <p class="small muted">${note}</p>
    </div>`;
  };
  const leftLessons = TOTAL_LESSONS - d.lessons;
  const lessonNote = leftLessons === 0 ? 'Completaste toda la teoría.' : d.lessons === 0 ? 'Lo que sigue: tu primera lección corta de teoría.' : `${falta(leftLessons, 'lección', 'lecciones')} para terminar la teoría.`;
  return `<section class="st-card st-reading" aria-label="Lectura">
    <span class="st-lines" aria-hidden="true"></span>
    <p class="eyebrow st-blue">Lectura</p>
    <h2>Notas que ya lees firmes</h2>
    ${row('Clave de sol', 'mano derecha', d.trebleFirm, NOTES.length, '', 'Lo que sigue: tus primeras notas firmes de la mano derecha.')}
    ${row('Clave de fa', 'mano izquierda', d.bassFirm, BASS_NOTES.length, 'st-bar-violet', 'Lo que sigue: tus primeras notas firmes de la mano izquierda.')}
    <div class="st-lessons">
      <span class="tile-ico">${icon('book')}</span>
      <div class="grow"><p><strong>${num(d.lessons)} de ${TOTAL_LESSONS}</strong> lecciones de teoría</p><p class="small muted">${lessonNote}</p></div>
    </div>
  </section>`;
}

function trendCard(d) {
  if (d.recent.length < 2) return '';
  const t = trendOf(d.recent);
  const n = d.recent.length;
  const bars = d.recent.map((s, i) => {
    const edge = i === 0 || i === n - 1;
    return `<li class="st-col ${edge ? 'st-col-edge' : ''}" style="--i:${i}"><button type="button" class="st-colbtn" aria-label="Sesión del ${fmtDay(s.day)}: ${s.acc}% al primer intento, ${s.firstTry} de ${s.cards}">
      <span class="st-colbar" style="--h:${s.acc}%"><span class="st-colval">${s.acc}%</span></span>
    </button></li>`;
  }).join('');
  const arrow = t.dir === 'up' ? '<path d="M5 17 19 7M11 7h8v8"/>' : t.dir === 'down' ? '<path d="M5 7l14 10M11 17h8V9"/>' : '<path d="M4 12h16M14 6l6 6-6 6"/>';
  return `<section class="st-card st-trend" aria-label="Tendencia">
    <p class="eyebrow">Tus últimas ${n} sesiones</p>
    <h2 class="st-trend-title"><span class="st-arrow st-arrow-${t.dir}" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${arrow}</svg></span><span>${t.title}</span></h2>
    <p class="small muted">${t.text}</p>
    <div class="st-chart">
      <div class="st-grid" aria-hidden="true"><span style="--y:100%"><i>100%</i></span><span style="--y:50%"><i>50%</i></span><span style="--y:0%"><i>0%</i></span></div>
      <ol class="st-cols" aria-label="Aciertos al primer intento por sesión, de la más antigua a la más reciente">${bars}</ol>
    </div>
    <div class="st-axis small muted" aria-hidden="true"><span>${fmtDay(d.recent[0].day)}</span><span>Aciertos al primer intento</span><span>${fmtDay(d.recent[n - 1].day)}</span></div>
    <p class="st-readout small muted" id="st-readout">Toca una barra para ver esa sesión.</p>
  </section>`;
}

function achievementsCard(d) {
  const got = d.unlocked;
  const dates = d.state.achievements || {};
  const badges = got.map((a, i) => {
    const when = fmtDay(dates[a.id]);
    return `<li class="st-badge" style="--i:${Math.min(i, 9)}"><span class="tile-ico warm">${icon(a.icon)}</span><span class="st-badge-text"><strong>${a.title}</strong>${when ? `<span class="small st-soft">${when}</span>` : ''}</span></li>`;
  }).join('');
  let next = '';
  if (d.next) {
    next = `<div class="badge-card st-next"><span class="tile-ico st-ico-off">${icon(d.next.icon)}</span><span class="grow"><span class="eyebrow st-warm">Próximo logro</span><br><strong>${d.next.title}.</strong> ${falta(d.next.left, d.next.unit[0], d.next.unit[1])}.<br><span class="small muted">${d.next.text}</span></span></div>`;
  } else if (got.length === ACHIEVEMENTS.length) {
    next = '<p class="small muted">Tienes todos los logros de la app.</p>';
  }
  return `<section class="st-card st-ach" aria-label="Logros">
    <div class="row-between"><p class="eyebrow st-warm">Logros</p><span class="pill st-pill-count">${num(got.length)}&nbsp;de ${ACHIEVEMENTS.length}</span></div>
    <h2>${got.length ? (got.length === 1 ? 'Un logro desbloqueado' : `${got.length} logros desbloqueados`) : 'Tu primer logro está cerca'}</h2>
    ${got.length ? `<ul class="st-badges">${badges}</ul>` : ''}
    ${next}
  </section>`;
}

function goalsList() {
  return `<ul class="st-goals">${GOALS.map((g) => `<li class="st-goal"><span class="tile-ico">${icon('songs')}</span><span class="grow"><strong>${g.title}</strong><br><span class="small muted">${g.by}</span></span></li>`).join('')}</ul>`;
}

function closingCard(d) {
  const r = d.readiness;
  let line;
  if (r >= 90) line = 'Ya tienes casi toda la base que piden estas piezas. Lo que sigue es tocarlas.';
  else if (r >= 75) line = 'La mayor parte de la base ya está firme. Falta poco para completarla.';
  else if (r >= 60) line = 'Más de la mitad de la base está hecha. Cada sesión te acerca un poco más a estas piezas.';
  else if (r >= 30) line = 'La base ya está tomando forma. Con constancia, lo demás llega.';
  else if (r > 0) line = 'Estás poniendo los primeros cimientos. Diez minutos al día alcanzan para avanzar.';
  else line = 'Este número va a crecer a medida que queden firmes tus acordes y tus notas.';
  return `<section class="st-card st-close" id="st-last" aria-label="Hacia tus piezas">
    <p class="eyebrow">Hacia tus piezas</p>
    <div class="st-ring st-ring-xl">${ring(r, num(r, '%'), { big: true })}</div>
    <h2 class="center">de preparación para tus piezas meta</h2>
    <div class="st-parts">${d.parts.map((p) => `<div class="st-part"><div class="row-between small"><span>${p.label}</span><strong>${Math.round(p.value * 100)}%</strong></div>${bar(p.value * 100, 100)}</div>`).join('')}</div>
    <p class="small muted center">Es el promedio de tus acordes firmes, tus notas firmes y tus lecciones de teoría.</p>
    ${goalsList()}
    <p class="st-closing">${line}</p>
    <button type="button" class="btn btn-primary" id="st-done">Seguir practicando</button>
  </section>`;
}

// Versión corta para quien todavía no completó ninguna sesión.
function emptyStory(d) {
  const have = [];
  if (d.chordsFirm) have.push(plural(d.chordsFirm, 'acorde firme', 'acordes firmes'));
  if (d.trebleFirm + d.bassFirm) have.push(plural(d.trebleFirm + d.bassFirm, 'nota firme', 'notas firmes'));
  if (d.lessons) have.push(plural(d.lessons, 'lección de teoría', 'lecciones de teoría'));
  const join = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}` : list[0]);
  const soon = [
    ['flame', 'warm', 'Tu racha', 'Los días seguidos que practicas.'],
    ['bolt', '', 'Tu tiempo y tus aciertos', 'Minutos, ejercicios y cuántos te salen a la primera.'],
    ['keys', 'violet', 'Lo que ya tienes firme', 'Acordes y notas que reconoces sin dudar.'],
  ];
  return `
    <section class="st-card st-hero st-empty" aria-label="Tu recorrido">
      ${flame(false)}
      <h2 class="st-hero-title">Tu recorrido empieza con la primera sesión</h2>
      <p class="st-lead">Todavía no hay sesiones para contar. Cuando practiques, esta pantalla se va a ir llenando con lo que logres.</p>
      ${have.length ? `<p class="small st-soft">Ya partes con ${join(have)}.</p>` : ''}
    </section>
    <section class="st-card st-soon" aria-label="Lo que vas a ver aquí">
      <p class="eyebrow">Lo que vas a ver aquí</p>
      <ul class="st-soon-list">${soon.map(([ico, tone, title, text]) => `<li><span class="tile-ico ${tone}">${icon(ico)}</span><span class="grow"><strong>${title}</strong><br><span class="small muted">${text}</span></span></li>`).join('')}</ul>
    </section>
    <section class="st-card st-close" id="st-last" aria-label="Hacia tus piezas">
      <p class="eyebrow">Hacia dónde vas</p>
      <h2>Las piezas que quieres llegar a tocar</h2>
      ${goalsList()}
      ${d.next ? `<p class="small muted"><strong class="st-ink">Primer logro: ${d.next.title}.</strong> ${falta(d.next.left, d.next.unit[0], d.next.unit[1])}.</p>` : ''}
      <p class="st-closing">Diez minutos alcanzan para empezar.</p>
      <button type="button" class="btn btn-primary" id="st-done">Empezar a practicar</button>
    </section>`;
}

// ---------- animación ----------

function countUp(el) {
  const to = Number(el.dataset.to) || 0;
  const suffix = el.dataset.suffix || '';
  const t0 = performance.now();
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - t0) / COUNT_MS);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = nf.format(Math.round(to * eased)) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function reveal(card) {
  if (card.classList.contains('st-in')) return;
  card.classList.add('st-in');
  card.querySelectorAll('.st-count').forEach((el) => countUp(el));
  card.querySelectorAll('.ring-fg').forEach((fg) => {
    if (fg.dataset.final !== undefined) setTimeout(() => { fg.style.strokeDashoffset = fg.dataset.final; }, 160);
  });
}

// ---------- pantalla ----------

// Repaso animado a pantalla completa. onClose() se llama al cerrar (botón X o botón final).
export function renderStory(onClose) {
  const d = gather();
  const empty = d.sessionCount === 0;
  const body = empty
    ? emptyStory(d)
    : [heroCard(d), timeCard(d), chordsCard(d), readingCard(d), trendCard(d), achievementsCard(d), closingCard(d)].join('');

  show(`<div class="st ${empty ? 'st-is-empty' : ''}" id="st-root">
    <header class="st-head">
      <div class="row"><div class="grow"><p class="eyebrow">Tu recorrido</p><h1 class="st-title">${empty ? 'Todo por delante' : 'Lo que llevas logrado'}</h1></div>
      <button type="button" class="icon-btn" id="st-close" aria-label="Cerrar">${icon('close')}</button></div>
      <div class="st-progress" aria-hidden="true"><div id="st-progress"></div></div>
    </header>
    ${body}
  </div>`, { animate: false });

  const root = $('#st-root');
  const ctl = new AbortController();
  let io = null;
  let closed = false;
  const cleanup = () => {
    ctl.abort();
    if (io) io.disconnect();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    cleanup();
    if (typeof onClose === 'function') onClose();
  };
  $('#st-close').onclick = close;
  $('#st-done').onclick = close;
  document.addEventListener('keydown', (e) => {
    if (!root.isConnected) return cleanup();
    if (e.key === 'Escape') close();
  }, { signal: ctl.signal });

  // Avance de lectura en el encabezado.
  const progress = $('#st-progress');
  const onScroll = () => {
    if (!root.isConnected) return cleanup();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 1})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true, signal: ctl.signal });
  window.addEventListener('resize', onScroll, { passive: true, signal: ctl.signal });

  // Gráfico: tocar una barra muestra el detalle de esa sesión.
  const readout = $('#st-readout');
  $$('.st-colbtn').forEach((btn, i) => {
    const s = d.recent[i];
    const pick = () => {
      $$('.st-col').forEach((c) => c.classList.remove('st-col-on'));
      btn.parentElement.classList.add('st-col-on');
      readout.innerHTML = `<strong class="st-ink">${fmtDay(s.day)}:</strong> ${s.acc}% al primer intento (${s.firstTry} de ${s.cards}).`;
    };
    btn.onclick = pick;
    btn.onfocus = pick;
    btn.onmouseenter = pick;
  });

  const cards = $$('.st-card');
  const animated = !reducedMotion() && 'IntersectionObserver' in window;
  const canCelebrate = !empty;
  let celebrated = false;
  const party = () => {
    if (celebrated || !canCelebrate) return;
    celebrated = true;
    celebrate();
  };

  if (animated) {
    // Estado inicial: números en cero y anillos vacíos, hasta que la tarjeta entra en pantalla.
    root.classList.add('st-js');
    $$('.st-count').forEach((el) => { el.textContent = nf.format(0) + (el.dataset.suffix || ''); });
    $$('.st-ring .ring-fg').forEach((fg) => {
      fg.dataset.final = fg.getAttribute('stroke-dashoffset');
      fg.style.transition = 'none';
      fg.style.strokeDashoffset = fg.getAttribute('stroke-dasharray');
      void fg.getBoundingClientRect();
      fg.style.transition = '';
    });
    root.style.visibility = 'hidden';
  }

  ensureCss().then(() => {
    if (!root.isConnected || closed) return;
    root.style.visibility = '';
    onScroll();
    const last = $('#st-last');
    if (!animated) {
      // Sin movimiento: todo en su valor final. La celebración respeta la misma preferencia.
      if ('IntersectionObserver' in window && last) {
        io = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { party(); io.disconnect(); }
        }, { threshold: 0.3 });
        io.observe(last);
      }
      return;
    }
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        reveal(e.target);
        io.unobserve(e.target);
        if (e.target === last) setTimeout(party, 500);
      }
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    cards.forEach((c) => io.observe(c));
  });
}
