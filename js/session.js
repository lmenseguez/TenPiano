// Arma la sesión del día: teoría, acordes y pentagrama.
import { LESSONS } from './data.js';
import * as store from './store.js';

function weightedPick(kind, ids, avoid) {
  const pool = ids.filter((m) => !avoid.includes(m));
  const list = pool.length ? pool : ids;
  const weights = list.map((m) => Math.max(1, store.weight(kind, m)));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// Elige `count` elementos sin repetir dos veces seguidas; `boost` aparece más.
function pickMany(kind, ids, count, boost = []) {
  const out = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    let id;
    if (boost.length && i % 2 === 0) id = boost[(i / 2) % boost.length];
    else id = weightedPick(kind, ids, prev === null ? [] : [prev]);
    if (ids.length > 1 && id === prev) id = weightedPick(kind, ids, [id]);
    out.push(id);
    prev = id;
  }
  return out;
}

const noteCards = (kind, ids, count, boost) => pickMany(kind, ids, count, boost).map((midi) => ({ type: 'card', kind, midi }));

function phrase(kind, ids, length = 4) {
  return { type: 'phrase', kind, midis: pickMany(kind, ids, length) };
}

// Tarjetas de acordes: alterna entre armar el acorde y reconocerlo.
function chordCards(ids, count, boost) {
  return pickMany('c', ids, count, boost).map((id, i) => ({
    type: i % 3 === 2 && ids.length >= 3 ? 'chord-name' : 'chord-build',
    chord: id,
  }));
}

// Teoría: una pregunta de repaso y la lección nueva del camino que va más atrás.
function theorySteps() {
  const out = [];
  const done = { chords: store.lessonsDone('chords'), staff: store.lessonsDone('staff') };
  const seen = [];
  for (const track of ['chords', 'staff']) for (let i = 0; i < done[track]; i++) seen.push({ track, lesson: i });
  if (seen.length) out.push({ type: 'quiz', ...seen[Math.floor(Math.random() * seen.length)] });

  const left = (t) => LESSONS[t].length - done[t];
  let track = null;
  if (left('chords') > 0 && left('staff') > 0) track = done.chords <= done.staff ? 'chords' : 'staff';
  else if (left('chords') > 0) track = 'chords';
  else if (left('staff') > 0) track = 'staff';
  if (track) out.push({ type: 'theory', track, lesson: done[track] });
  else if (seen.length > 1) out.push({ type: 'quiz', ...seen[Math.floor(Math.random() * seen.length)] });
  return out;
}

function chordBlock(minimal) {
  const steps = [];
  store.ensureKnownChords();
  let known = store.unlocked('c');
  const fresh = minimal ? [] : store.nextNew('c');
  steps.push(...chordCards(known, minimal ? 4 : 5));
  for (const id of fresh) {
    store.unlock('c', id);
    steps.push({ type: 'chord-intro', chord: id });
    steps.push({ type: 'chord-build', chord: id, guided: true });
  }
  known = store.unlocked('c');
  if (!minimal) steps.push(...chordCards(known, fresh.length ? 5 : 4, fresh));
  return steps;
}

// Bloque de lectura en una clave. kind: 'n' clave de sol, 'b' clave de fa.
function staffBlock(kind, minimal, size) {
  const steps = [];
  let known = store.unlocked(kind);

  // Notas que quedaron sin presentar porque una sesión anterior se interrumpió.
  const unseen = known.filter((midi) => store.stat(kind, midi).seen === 0 && store.stat(kind, midi).box < 3);
  const fresh = minimal && known.length ? [] : store.nextNew(kind);
  if (known.length) steps.push(...noteCards(kind, known, minimal ? 3 : size.review));
  for (const midi of [...unseen, ...fresh]) {
    store.unlock(kind, midi);
    steps.push({ type: 'intro', kind, midi });
    steps.push({ type: 'card', kind, midi, guided: true });
  }
  known = store.unlocked(kind);
  const boost = [...unseen, ...fresh];
  if (!minimal || boost.length) steps.push(...noteCards(kind, known, boost.length ? size.withNew : size.plain, boost));
  if (known.length >= 2) {
    const n = minimal ? 1 : size.phrases;
    for (let i = 0; i < n; i++) steps.push(phrase(kind, known));
  }
  return steps;
}

// Devuelve la lista de pasos de la sesión.
export function buildSession({ minimal = false } = {}) {
  const steps = [];
  if (!minimal) steps.push(...theorySteps());
  steps.push({ type: 'section', title: 'Acordes', text: 'Lee el símbolo y arma el acorde.' });
  steps.push(...chordBlock(minimal));
  steps.push({ type: 'section', title: 'Mano derecha', text: 'Lee la nota en clave de sol y tócala.' });
  steps.push(...staffBlock('n', minimal, { review: 5, withNew: 6, plain: 4, phrases: 2 }));
  steps.push({ type: 'section', title: 'Mano izquierda', text: 'Lee la nota en clave de fa y tócala con la izquierda.' });
  steps.push(...staffBlock('b', minimal, { review: 4, withNew: 5, plain: 3, phrases: 2 }));
  return steps;
}

// Prueba de nivel: las 12 notas, una vez cada una, en orden mezclado.
export function buildPlacement(midis) {
  return [...midis].sort(() => Math.random() - 0.5).map((midi) => ({ type: 'card', kind: 'n', midi, placement: true }));
}
