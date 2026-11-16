// Progreso guardado en el dispositivo (localStorage).
import { NOTES, LESSONS, INTERVALS, MAX_BOX, FLUENT_MS, FIRST_SESSION_NOTES } from './data.js';

const KEY = 'tenpiano.v1';
const MAX_FREEZES = 2;

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}

function fresh() {
  return {
    version: 1,
    notes: {}, // midi -> { box, due, seen, right, wrong, totalMs }
    streak: 0,
    lastDay: null,
    freezes: 1,
    lessonsDone: 0, // cuántas lecciones de teoría completó
    sessions: [], // { day, cards, firstTry, seconds, minimal }
    settings: { input: 'mic', strictOctave: true, showNames: false },
  };
}

let state = fresh();
let memoryOnly = false;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...fresh(), ...parsed, settings: { ...fresh().settings, ...(parsed.settings || {}) } };
    }
  } catch (e) {
    memoryOnly = true;
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    memoryOnly = true;
  }
}

export function isMemoryOnly() {
  return memoryOnly;
}

export function getState() {
  return state;
}

export function resetAll() {
  const settings = state.settings;
  state = fresh();
  state.settings = settings;
  save();
}

export function setSetting(name, value) {
  state.settings[name] = value;
  save();
}

// ---- Notas ----

export function unlockedNotes() {
  return NOTES.filter((n) => state.notes[n.midi]);
}

export function noteStat(midi) {
  return state.notes[midi] || null;
}

export function unlock(midi, today = todayStr()) {
  if (!state.notes[midi]) {
    state.notes[midi] = { box: 0, due: today, seen: 0, right: 0, wrong: 0, totalMs: 0 };
  }
}

// La siguiente nota nueva, si las actuales ya están firmes.
export function nextNewNote() {
  const unlocked = unlockedNotes();
  const next = NOTES.find((n) => !state.notes[n.midi]);
  if (!next) return null;
  if (unlocked.length < FIRST_SESSION_NOTES) return next;
  const firm = unlocked.every((n) => state.notes[n.midi].box >= 2);
  return firm ? next : null;
}

// Registra una respuesta. firstTry: acertó al primer intento.
export function recordAnswer(midi, firstTry, ms, today = todayStr()) {
  const s = state.notes[midi];
  if (!s) return;
  s.seen += 1;
  if (firstTry) {
    s.right += 1;
    s.totalMs += ms;
    if (ms <= FLUENT_MS) s.box = Math.min(MAX_BOX, s.box + 1);
  } else {
    s.wrong += 1;
    s.box = Math.max(0, s.box - 2);
  }
  s.due = addDays(today, INTERVALS[s.box]);
}

// Peso para elegir tarjetas: más alto si la nota es débil o le toca repaso.
export function noteWeight(midi, today = todayStr()) {
  const s = state.notes[midi];
  if (!s) return 0;
  let w = (MAX_BOX + 1 - s.box) * 2;
  if (daysBetween(s.due, today) >= 0) w += 4;
  if (s.seen < 4) w += 4;
  return w;
}

// ---- Racha ----

// Estado de la racha al día de hoy, sin modificar nada.
export function streakStatus(today = todayStr()) {
  if (!state.lastDay) return { streak: 0, doneToday: false, freezes: state.freezes, atRisk: false, willUse: 0 };
  const gap = daysBetween(state.lastDay, today);
  if (gap <= 0) return { streak: state.streak, doneToday: true, freezes: state.freezes, atRisk: false, willUse: 0 };
  const missed = gap - 1;
  if (missed === 0) return { streak: state.streak, doneToday: false, freezes: state.freezes, atRisk: false, willUse: 0 };
  if (missed <= state.freezes) {
    return { streak: state.streak, doneToday: false, freezes: state.freezes, atRisk: true, willUse: missed };
  }
  return { streak: 0, doneToday: false, freezes: state.freezes, atRisk: false, willUse: 0, lost: state.streak };
}

// Cierra una sesión: actualiza la racha y guarda el resumen.
export function completeSession(summary, today = todayStr()) {
  const st = streakStatus(today);
  let earnedFreeze = false;
  if (!st.doneToday) {
    if (st.willUse) state.freezes -= st.willUse;
    state.streak = st.streak + 1;
    if (state.streak % 7 === 0 && state.freezes < MAX_FREEZES) {
      state.freezes += 1;
      earnedFreeze = true;
    }
    state.lastDay = today;
  }
  state.sessions.push({ day: today, ...summary });
  if (state.sessions.length > 400) state.sessions = state.sessions.slice(-400);
  save();
  return { streak: state.streak, usedFreezes: st.willUse, earnedFreeze, firstToday: !st.doneToday };
}

// Minutos y precisión de los últimos 7 días.
export function weekSummary(today = todayStr()) {
  const recent = state.sessions.filter((s) => {
    const d = daysBetween(s.day, today);
    return d >= 0 && d < 7;
  });
  const days = new Set(recent.map((s) => s.day)).size;
  const seconds = recent.reduce((a, s) => a + (s.seconds || 0), 0);
  const cards = recent.reduce((a, s) => a + (s.cards || 0), 0);
  const firstTry = recent.reduce((a, s) => a + (s.firstTry || 0), 0);
  return { days, minutes: Math.round(seconds / 60), accuracy: cards ? Math.round((firstTry / cards) * 100) : null };
}

// ---- Teoría ----

export function lessonsDone() {
  return Math.min(state.lessonsDone || 0, LESSONS.length);
}

export function completeLesson(index) {
  if (index === lessonsDone()) {
    state.lessonsDone = index + 1;
    save();
  }
}
