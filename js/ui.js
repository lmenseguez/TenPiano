// Utilidades compartidas por las pantallas.
import { MicListener, keepAwake } from './audio.js';
import { NOTE_BY_MIDI, PC_NAMES } from './data.js';
import { pianoNote } from './intro-sound.js';

export const app = document.getElementById('app');
export const mic = new MicListener();

// Íconos propios de la app (trazo sobre una cuadrícula de 24 x 24).
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  songs: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  plan: '<path d="M5 21V4"/><path d="M5 5h13l-3 4 3 4H5"/>',
  settings: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M20 18h0"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/>',
  flame: '<path fill="currentColor" stroke="none" d="M12.4 2.5c.6 3.4 5.1 5.3 5.1 10.6a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.2-4.8 0 2 .8 3.1 1.9 3.3-.4-3.3.2-6.2 1.8-9.1z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  play: '<path fill="currentColor" stroke="none" d="M8 5.2v13.6a1 1 0 0 0 1.5.9l11-6.8a1 1 0 0 0 0-1.7l-11-6.8A1 1 0 0 0 8 5.2z"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M9 13v6M15 13v6"/><path d="M7.5 5v7h3V5M13.5 5v7h3V5" fill="currentColor"/>',
  staff: '<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/><ellipse cx="9" cy="16" rx="2.6" ry="2" fill="currentColor" stroke="none"/><path d="M11.5 16V7"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
};

export function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Barra de pestañas inferior. Las pantallas principales indican cuál está activa.
const TABS = [
  ['today', 'Hoy', 'home'],
  ['songs', 'Canciones', 'songs'],
  ['plan', 'Plan', 'plan'],
  ['settings', 'Ajustes', 'settings'],
];
let nav = {};
export function setNav(handlers) {
  nav = handlers;
}

let tabbar = null;
function paintTabs(active) {
  if (!active) {
    if (tabbar) tabbar.remove();
    tabbar = null;
    return;
  }
  if (!tabbar) {
    tabbar = document.createElement('nav');
    tabbar.className = 'tabbar';
    tabbar.setAttribute('aria-label', 'Secciones');
    document.body.appendChild(tabbar);
  }
  tabbar.innerHTML = TABS.map(([id, label, ico]) => `<button class="tab" data-tab="${id}" ${id === active ? 'aria-current="page"' : ''}>${icon(ico)}<span>${label}</span></button>`).join('');
  tabbar.querySelectorAll('.tab').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.tab !== active && nav[b.dataset.tab]) nav[b.dataset.tab]();
    };
  });
}

// Muestra una pantalla. tab: pestaña activa (o nada, para pantallas a pantalla completa).
export function show(html, { tab = null, animate = true } = {}) {
  document.querySelectorAll('.confetti').forEach((el) => el.remove());
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  app.innerHTML = '';
  app.appendChild(t.content);
  app.classList.toggle('with-tabs', !!tab);
  paintTabs(tab);
  app.classList.remove('enter');
  if (animate) {
    void app.offsetWidth;
    app.classList.add('enter');
  }
  window.scrollTo(0, 0);
}

// Anillo de progreso. pct de 0 a 100.
export function ring(pct, text, { color = 'url(#g-brand)', big = false } = {}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<div class="ring ${big ? 'ring-big' : ''}"><svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="g-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#01dbb8"/><stop offset="1" stop-color="#38c6ff"/></linearGradient>
    <linearGradient id="g-violet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f6bff"/><stop offset="1" stop-color="#ff7ad9"/></linearGradient>
    <linearGradient id="g-warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a3d"/><stop offset="1" stop-color="#ffd35c"/></linearGradient></defs>
    <circle class="ring-bg" cx="50" cy="50" r="${r}"/>
    <circle class="ring-fg" cx="50" cy="50" r="${r}" stroke="${color}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
  </svg><div class="ring-num">${text}</div></div>`;
}

// Lluvia de papelitos al terminar una sesión.
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#01dbb8', '#38c6ff', '#8f6bff', '#ffd35c', '#ff7ad9', '#ffffff'];
  for (let i = 0; i < 44; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    piece.style.animationDelay = Math.random() * 0.4 + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(piece);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}

export const $ = (sel) => app.querySelector(sel);
export const $$ = (sel) => [...app.querySelectorAll(sel)];

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// Escapa texto escrito por el usuario antes de insertarlo como HTML.
export function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Nombre para mostrar de cualquier nota que se oiga.
export function heardLabel(midi) {
  const known = NOTE_BY_MIDI.get(midi);
  if (known) return known.label;
  const name = PC_NAMES[((midi % 12) + 12) % 12];
  if (midi < 60) return `${name} grave`;
  if (midi > 79) return `${name} muy agudo`;
  return name;
}

export const pcName = (midi) => PC_NAMES[((midi % 12) + 12) % 12];

// Barra de volumen en escala logarítmica, para que se note también el sonido bajo.
export function meterPct(level) {
  if (!level || level <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((Math.log10(level) + 3.3) / 2.3) * 100)));
}

export function stopMic() {
  mic.onNote = null;
  mic.expect = null;
  mic.chord = null;
  mic.onChord = null;
  mic.onLevel = null;
  mic.stop();
  keepAwake(false);
}

// Intenta encender el micrófono. Devuelve '' si quedó escuchando, o el motivo si no.
export async function startMic() {
  if (!MicListener.supported()) return 'Este navegador no da acceso al micrófono. Usa el teclado en pantalla.';
  try {
    await mic.start();
    keepAwake(true);
    return '';
  } catch (e) {
    return 'No se pudo usar el micrófono (revisa el permiso). Por ahora usa el teclado en pantalla.';
  }
}

export const BRAND = '<span class="brand"><img src="icons/logo-mark.png" alt="" width="40" height="40"><h1>Ten<span class="p">P</span>iano</h1></span>';

export function backHeader(title) {
  return `<header class="row"><button class="icon-btn" id="back" aria-label="Volver">${icon('back')}</button><h2 class="grow">${title}</h2></header>`;
}

// Sonido de una tecla del teclado en pantalla, para entrenar el oído.
// Solo se usa cuando el micrófono no está escuchando: si no, la app se oiría a sí misma.
let keyCtx = null;
let keyOut = null;
export function keySound(midi, velocity = 0.32) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!keyCtx) {
      keyCtx = new Ctx();
      keyOut = keyCtx.createGain();
      keyOut.gain.value = 0.7;
      keyOut.connect(keyCtx.destination);
    }
    if (keyCtx.state !== 'running') keyCtx.resume().catch(() => {});
    pianoNote(keyCtx, keyOut, midi, keyCtx.currentTime + 0.01, velocity, 1.6);
  } catch (e) {
    /* sin sonido: el ejercicio sigue igual */
  }
}
