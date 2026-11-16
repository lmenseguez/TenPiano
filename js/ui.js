// Utilidades compartidas por las pantallas.
import { MicListener, keepAwake } from './audio.js';
import { NOTE_BY_MIDI, PC_NAMES } from './data.js';

export const app = document.getElementById('app');
export const mic = new MicListener();

export function show(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  app.innerHTML = '';
  app.appendChild(t.content);
  window.scrollTo(0, 0);
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
  return `<header class="row"><button class="icon-btn" id="back" aria-label="Volver">←</button><h2>${title}</h2></header>`;
}
