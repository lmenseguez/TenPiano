// Progreso guardado en el dispositivo (localStorage).
import {
  NOTES, CHORDS, KNOWN_CHORDS, LESSONS, INTERVALS, MAX_BOX, FLUENT_MS, FLUENT_CHORD_MS,
  FIRST_SESSION_NOTES, NEW_PER_SESSION,
} from './data.js';

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
  return todayStr(new Date(y, m - 1, d + n));
}

function fresh() {
  return {
    version: 2,
    notes: {}, // midi -> { box, due, seen, right, wrong, totalMs }
    chords: {}, // id -> igual
    lessons: { chords: 0, staff: 0 }, // lecciones completadas por camino
    placementDone: false,
    streak: 0,
    lastDay: null,
    freezes: 1,
    sessions: [], // { day, cards, firstTry, seconds, minimal }
    mySongs: [], // { id, title, text }
    settings: { input: 'mic', strictOctave: true, showNames: false, notation: 'both', tempo: 70, click: true },
  };
}

let state = fresh();
let memoryOnly = false;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = fresh();
      state = { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings || {}) } };
      // Datos de la versión anterior: una sola lista de lecciones, de pentagrama.
      if (!parsed.lessons) state.lessons = { chords: 0, staff: Math.min(parsed.lessonsDone || 0, LESSONS.staff.length) };
      delete state.lessonsDone;
      state.version = 2;
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

export const isMemoryOnly = () => memoryOnly;
export const getState = () => state;

export function resetAll() {
  const settings = state.settings;
  const mySongs = state.mySongs;
  state = fresh();
  state.settings = settings;
  state.mySongs = mySongs;
  save();
}

export function setSetting(name, value) {
  state.settings[name] = value;
  save();
}

// ---- Notas y acordes: mismo sistema de repaso ----
// kind: 'n' (notas, por número MIDI) o 'c' (acordes, por símbolo).

const table = (kind) => (kind === 'c' ? state.chords : state.notes);
const catalog = (kind) => (kind === 'c' ? CHORDS.map((c) => c.id) : NOTES.map((n) => n.midi));

export function stat(kind, id) {
  return table(kind)[id] || null;
}
export const noteStat = (midi) => stat('n', midi);

export function unlocked(kind) {
  return catalog(kind).filter((id) => table(kind)[id]);
}
export const unlockedNotes = () => NOTES.filter((n) => state.notes[n.midi]);

export function unlock(kind, id, box = 0, today = todayStr()) {
  const t = table(kind);
  if (!t[id]) t[id] = { box, due: today, seen: 0, right: 0, wrong: 0, totalMs: 0 };
}

// Lo próximo por presentar, si lo anterior ya está firme.
export function nextNew(kind) {
  const have = unlocked(kind);
  const pending = catalog(kind).filter((id) => !table(kind)[id]);
  if (!pending.length) return [];
  if (kind === 'n' && have.length < FIRST_SESSION_NOTES) return pending.slice(0, FIRST_SESSION_NOTES - have.length);
  const firm = have.every((id) => table(kind)[id].box >= 2);
  return firm ? pending.slice(0, NEW_PER_SESSION) : [];
}

// Al empezar, los acordes básicos se dan por conocidos (solo se repasan).
export function ensureKnownChords() {
  if (Object.keys(state.chords).length) return;
  for (const id of KNOWN_CHORDS) unlock('c', id, 1);
}

// Registra una respuesta. firstTry: acertó al primer intento.
export function record(kind, id, firstTry, ms, today = todayStr()) {
  const s = table(kind)[id];
  if (!s) return;
  s.seen += 1;
  if (firstTry) {
    s.right += 1;
    s.totalMs += ms;
    if (ms <= (kind === 'c' ? FLUENT_CHORD_MS : FLUENT_MS)) s.box = Math.min(MAX_BOX, s.box + 1);
  } else {
    s.wrong += 1;
    s.box = Math.max(0, s.box - 2);
  }
  s.due = addDays(today, INTERVALS[s.box]);
}

// Peso para elegir tarjetas: más alto si es débil o le toca repaso.
export function weight(kind, id, today = todayStr()) {
  const s = table(kind)[id];
  if (!s) return 0;
  let w = (MAX_BOX + 1 - s.box) * 2;
  if (daysBetween(s.due, today) >= 0) w += 4;
  if (s.seen < 4) w += 4;
  return w;
}

export function firmCount(kind) {
  return unlocked(kind).filter((id) => table(kind)[id].box >= 3).length;
}

// Resultado de la prueba de nivel: las notas acertadas quedan firmes.
export function applyPlacement(knownMidis) {
  for (const midi of knownMidis) {
    unlock('n', midi, 3);
    state.notes[midi].box = Math.max(state.notes[midi].box, 3);
  }
  state.placementDone = true;
  save();
}

// ---- Teoría ----

export function lessonsDone(track) {
  return Math.min(state.lessons[track] || 0, LESSONS[track].length);
}

export function completeLesson(track, index) {
  if (index === lessonsDone(track)) {
    state.lessons[track] = index + 1;
    save();
  }
}

// ---- Racha ----

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

// ---- Mis canciones ----

export function saveSong(song) {
  const i = state.mySongs.findIndex((s) => s.id === song.id);
  if (i >= 0) state.mySongs[i] = song;
  else state.mySongs.push(song);
  save();
}

export function deleteSong(id) {
  state.mySongs = state.mySongs.filter((s) => s.id !== id);
  save();
}
