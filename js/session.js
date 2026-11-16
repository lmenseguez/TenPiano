// Arma la sesión del día: repaso, nota nueva y frases.
import { NOTES, FIRST_SESSION_NOTES } from './data.js';
import { unlockedNotes, nextNewNote, noteWeight, noteStat, unlock } from './store.js';

function weightedPick(midis, avoid) {
  const pool = midis.filter((m) => !avoid.includes(m));
  const list = pool.length ? pool : midis;
  const weights = list.map((m) => Math.max(1, noteWeight(m)));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function cards(midis, count, boost = null) {
  const out = [];
  let prev = [];
  for (let i = 0; i < count; i++) {
    let midi;
    if (boost !== null && i % 2 === 0) midi = boost;
    else midi = weightedPick(midis, prev);
    if (midis.length > 1 && midi === prev[0]) midi = weightedPick(midis, [midi]);
    out.push({ type: 'card', midi });
    prev = [midi];
  }
  return out;
}

function phrase(midis, length = 4) {
  const notes = [];
  let prev = null;
  for (let i = 0; i < length; i++) {
    let m = weightedPick(midis, prev === null ? [] : [prev]);
    notes.push(m);
    prev = m;
  }
  return { type: 'phrase', midis: notes };
}

// Devuelve la lista de pasos de la sesión.
export function buildSession({ minimal = false } = {}) {
  const steps = [];
  let known = unlockedNotes().map((n) => n.midi);

  // Primera sesión: presenta las tres notas del acorde de Do, una por una.
  if (known.length === 0) {
    const first = NOTES.slice(0, FIRST_SESSION_NOTES).map((n) => n.midi);
    const soFar = [];
    for (const midi of first) {
      unlock(midi);
      soFar.push(midi);
      steps.push({ type: 'intro', midi });
      steps.push({ type: 'card', midi, guided: true });
      if (soFar.length > 1) steps.push(...cards(soFar, minimal ? 2 : 4, midi));
    }
    if (!minimal) {
      steps.push(...cards(soFar, 6));
      steps.push(phrase(soFar), phrase(soFar));
    }
    return steps;
  }

  // Notas que quedaron sin presentar porque una sesión anterior se interrumpió.
  for (const midi of known) {
    if (noteStat(midi).seen === 0) {
      steps.push({ type: 'intro', midi });
      steps.push({ type: 'card', midi, guided: true });
    }
  }

  // Repaso de lo que ya conoces.
  steps.push(...cards(known, minimal ? 6 : 8));

  // Nota nueva, si lo anterior ya está firme (no en la sesión mínima).
  const fresh = minimal ? null : nextNewNote();
  if (fresh) {
    unlock(fresh.midi);
    known = [...known, fresh.midi];
    steps.push({ type: 'intro', midi: fresh.midi });
    steps.push({ type: 'card', midi: fresh.midi, guided: true });
    steps.push(...cards(known, 8, fresh.midi));
  } else if (!minimal) {
    steps.push(...cards(known, 8));
  }

  // Aplicación: frases cortas para leer de corrido.
  if (known.length >= 2) {
    const n = minimal ? 1 : 3;
    for (let i = 0; i < n; i++) steps.push(phrase(known));
  }
  return steps;
}
