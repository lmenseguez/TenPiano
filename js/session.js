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

const noteCards = (ids, count, boost) => pickMany('n', ids, count, boost).map((midi) => ({ type: 'card', midi }));

function phrase(ids, length = 4) {
  return { type: 'phrase', midis: pickMany('n', ids, length) };
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

function staffBlock(minimal) {
  const steps = [];
  let known = store.unlocked('n');

  // Notas que quedaron sin presentar porque una sesión anterior se interrumpió.
  const unseen = known.filter((midi) => store.stat('n', midi).seen === 0 && store.stat('n', midi).box < 3);
  const fresh = minimal && known.length ? [] : store.nextNew('n');
  if (known.length) steps.push(...noteCards(known, minimal ? 5 : 6));
  for (const midi of [...unseen, ...fresh]) {
    store.unlock('n', midi);
    steps.push({ type: 'intro', midi });
    steps.push({ type: 'card', midi, guided: true });
  }
  known = store.unlocked('n');
  const boost = [...unseen, ...fresh];
  if (!minimal || boost.length) steps.push(...noteCards(known, boost.length ? 8 : 6, boost));
  if (known.length >= 2) {
    const n = minimal ? 1 : 3;
    for (let i = 0; i < n; i++) steps.push(phrase(known));
  }
  return steps;
}

// Devuelve la lista de pasos de la sesión.
export function buildSession({ minimal = false } = {}) {
  const steps = [];
  if (!minimal) steps.push(...theorySteps());
  steps.push({ type: 'section', title: 'Acordes', text: 'Lee el símbolo y arma el acorde.' });
  steps.push(...chordBlock(minimal));
  steps.push({ type: 'section', title: 'Pentagrama', text: 'Lee la nota y tócala.' });
  steps.push(...staffBlock(minimal));
  return steps;
}

// Prueba de nivel: las 12 notas, una vez cada una, en orden mezclado.
export function buildPlacement(midis) {
  return [...midis].sort(() => Math.random() - 0.5).map((midi) => ({ type: 'card', midi, placement: true }));
}
