// Dibujo del pentagrama (con VexFlow) y del teclado en pantalla.
import { PC_NAMES } from './data.js';

const VF = window.Vex.Flow;

const INK = '#04193a';
const ACCENT = '#00a88d';
const DONE = '#a9b3c2';
const FAINT = '#04193a';

const KEY_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
function midiToKey(midi) {
  return `${KEY_NAMES[midi % 12]}/${Math.floor(midi / 12) - 1}`;
}

// Dibuja una o varias notas. clef: 'treble' (clave de sol) o 'bass' (clave de fa).
// states: por nota, 'current' | 'done' | 'todo'
export function drawStaff(container, midis, states = [], clef = 'treble') {
  container.innerHTML = '';
  const many = midis.length > 1;
  const width = many ? 360 : 240;
  const height = 150;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const stave = new VF.Stave(8, 22, width - 16);
  stave.addClef(clef);
  if (!many) stave.setNoteStartX(stave.getNoteStartX() + 48);
  stave.setContext(ctx).draw();

  const notes = midis.map((midi, i) => {
    const note = new VF.StaveNote({ keys: [midiToKey(midi)], duration: many ? 'q' : 'w', auto_stem: true, clef });
    const st = states[i] || 'current';
    const color = st === 'done' ? DONE : st === 'todo' ? FAINT : many ? ACCENT : INK;
    note.setStyle({ fillStyle: color, strokeStyle: color });
    note.setLedgerLineStyle({ fillStyle: color, strokeStyle: color });
    return note;
  });

  const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(notes);
  new VF.Formatter().joinVoices([voice]).format([voice], many ? width - 90 : 60);
  voice.draw(ctx, stave);

  const svg = container.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${many ? 'Frase' : 'Nota'} en clave de ${clef === 'bass' ? 'fa' : 'sol'}`);
}

// Ejemplo para las lecciones: notas o acordes con una etiqueta debajo.
// items: [{ key | keys, label, duration }]
export function drawExample(container, items, clef = 'treble') {
  container.innerHTML = '';
  const width = Math.max(240, 110 + items.length * 62);
  const height = 172;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const stave = new VF.Stave(8, 18, width - 16);
  stave.addClef(clef);
  stave.setContext(ctx).draw();

  const notes = items.map((item) => {
    const note = new VF.StaveNote({ keys: item.keys || [item.key], duration: item.duration || 'w', auto_stem: true, clef });
    if (item.label) {
      const ann = new VF.Annotation(item.label);
      ann.setFont('Arial', 10, 'bold');
      ann.setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
      note.addModifier(ann, 0);
      note.setStyle({ fillStyle: INK, strokeStyle: INK });
    }
    return note;
  });

  const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(notes);
  new VF.Formatter().joinVoices([voice]).format([voice], width - 110);
  voice.draw(ctx, stave);

  const svg = container.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.maxWidth = `${width * 1.5}px`;
  svg.style.height = 'auto';
  svg.style.display = 'block';
  svg.style.margin = '0 auto';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Ejemplo en el pentagrama: ' + items.map((i) => i.label).filter(Boolean).join(', '));
}

// Renglón de una canción: compases con notas, duraciones y acordes escritos arriba.
// bars: [[{ key, dur, chord, index }]], stateOf(index) -> 'done' | 'current' | 'todo'
export function drawMelodyLine(container, bars, { time = null, stateOf = () => 'todo', chordLabel = (c) => c } = {}) {
  container.innerHTML = '';
  const count = bars.reduce((a, b) => a + b.length, 0);
  const width = 360;
  const height = 150;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const stave = new VF.Stave(6, 34, width - 12);
  stave.addClef('treble');
  if (time) stave.addTimeSignature(time);
  stave.setContext(ctx).draw();

  const tickables = [];
  const beams = [];
  bars.forEach((bar, bi) => {
    const notes = bar.map((n) => {
      const note = new VF.StaveNote({ keys: [n.key], duration: n.dur, auto_stem: true });
      if (n.dur.endsWith('d')) VF.Dot.buildAndAttach([note], { all: true });
      const st = stateOf(n.index);
      const color = st === 'done' ? DONE : st === 'current' ? ACCENT : INK;
      note.setStyle({ fillStyle: color, strokeStyle: color });
      note.setLedgerLineStyle({ fillStyle: color, strokeStyle: color });
      if (n.chord) {
        const ann = new VF.Annotation(chordLabel(n.chord));
        ann.setFont('Arial', 11, 'bold');
        ann.setVerticalJustification(VF.Annotation.VerticalJustify.TOP);
        note.addModifier(ann, 0);
      }
      return note;
    });
    beams.push(...VF.Beam.generateBeams(notes.filter((n) => n.getDuration() === '8')));
    tickables.push(...notes);
    if (bi < bars.length - 1) tickables.push(new VF.BarNote());
  });

  const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
  voice.addTickables(tickables);
  const room = width - (time ? 96 : 70);
  new VF.Formatter().joinVoices([voice]).format([voice], Math.min(room, 40 + count * 34));
  voice.draw(ctx, stave);
  beams.forEach((b) => b.setContext(ctx).draw());

  const svg = container.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  svg.style.display = 'block';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Renglón de la partitura');
}

// Teclado en pantalla: doce teclas blancas desde un Do. base 60 empieza en el
// Do central (mano derecha); base 48, una octava antes (mano izquierda).
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
const BLACK_STEPS = [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5], [13, 7], [15, 8], [18, 10]];

// Lleva cualquier nota al rango del teclado en pantalla, conservando su nombre.
export function foldToKeyboard(midi) {
  let m = midi;
  while (m < 60) m += 12;
  while (m > 79) m -= 12;
  return m;
}

// highlight: tecla o teclas resaltadas. selected: teclas marcadas por ti.
export function drawKeyboard(container, { highlight = null, selected = [], onPress = null, labels = false, base = 60 } = {}) {
  const WHITE = WHITE_STEPS.map((st) => base + st);
  const BLACK = BLACK_STEPS.map(([st, i]) => [base + st, i]);
  const hi = new Set(highlight === null ? [] : Array.isArray(highlight) ? highlight : [highlight]);
  const sel = new Set(selected);
  const kw = 30;
  const kh = 110;
  const w = WHITE.length * kw;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${kh + 18}`);
  svg.setAttribute('class', 'keys' + (onPress ? ' keys-live' : ''));
  svg.setAttribute('role', onPress ? 'group' : 'img');
  svg.setAttribute('aria-label', base === 60 ? 'Teclado desde el Do central' : 'Teclado desde el Do grave');

  const make = (midi, x, y, width, height, cls) => {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', width);
    r.setAttribute('height', height);
    r.setAttribute('rx', 3);
    r.setAttribute('class', cls + (hi.has(midi) ? ' key-hi' : '') + (sel.has(midi) ? ' key-sel' : ''));
    r.dataset.midi = midi;
    if (onPress) {
      r.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        r.classList.add('key-down');
        setTimeout(() => r.classList.remove('key-down'), 160);
        onPress(midi);
      });
    }
    svg.appendChild(r);
  };

  WHITE.forEach((midi, i) => make(midi, i * kw + 0.5, 0.5, kw - 1, kh, 'key-white'));
  BLACK.forEach(([midi, i]) => make(midi, (i + 1) * kw - 9, 0.5, 18, kh * 0.62, 'key-black'));

  // Marca del Do central, siempre visible como referencia.
  const central = WHITE.indexOf(60);
  const mark = document.createElementNS(ns, 'text');
  mark.setAttribute('x', central * kw + 2);
  mark.setAttribute('y', kh + 14);
  mark.setAttribute('text-anchor', 'start');
  mark.setAttribute('class', 'key-label');
  mark.textContent = 'Do central';
  svg.appendChild(mark);

  if (labels && hi.size === 1) {
    const only = [...hi][0];
    const i = WHITE.indexOf(only);
    if (i >= 0 && only !== 60) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', i * kw + kw / 2);
      t.setAttribute('y', kh + 14);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'key-label key-label-hi');
      t.textContent = PC_NAMES[only % 12];
      svg.appendChild(t);
    }
  }

  container.innerHTML = '';
  container.appendChild(svg);
}
