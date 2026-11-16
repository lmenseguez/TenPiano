// Dibujo del pentagrama (con VexFlow) y del teclado en pantalla.
import { NOTE_BY_MIDI } from './data.js';

const VF = window.Vex.Flow;

const INK = '#1c1917';
const ACCENT = '#b4541a';
const DONE = '#2f7d4f';
const FAINT = '#8a8178';

// Dibuja una o varias notas en clave de sol.
// states: por nota, 'current' | 'done' | 'todo'
export function drawStaff(container, midis, states = []) {
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
  stave.addClef('treble');
  if (!many) stave.setNoteStartX(stave.getNoteStartX() + 48);
  stave.setContext(ctx).draw();

  const notes = midis.map((midi, i) => {
    const info = NOTE_BY_MIDI.get(midi);
    const note = new VF.StaveNote({ keys: [info.key], duration: many ? 'q' : 'w', auto_stem: true });
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
  svg.setAttribute('aria-label', many ? 'Frase en el pentagrama' : 'Nota en el pentagrama');
}

// Teclado de Do central a Sol agudo.
const WHITE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
const BLACK = [
  [61, 0], [63, 1], [66, 3], [68, 4], [70, 5], [73, 7], [75, 8], [78, 10],
];

export function drawKeyboard(container, { highlight = null, onPress = null, labels = false } = {}) {
  const kw = 30;
  const kh = 110;
  const w = WHITE.length * kw;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${kh + 18}`);
  svg.setAttribute('class', 'keys' + (onPress ? ' keys-live' : ''));
  svg.setAttribute('role', onPress ? 'group' : 'img');
  svg.setAttribute('aria-label', 'Teclado desde el Do central');

  const make = (midi, x, y, width, height, cls) => {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', width);
    r.setAttribute('height', height);
    r.setAttribute('rx', 3);
    r.setAttribute('class', cls + (midi === highlight ? ' key-hi' : ''));
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
  const mark = document.createElementNS(ns, 'text');
  mark.setAttribute('x', kw / 2);
  mark.setAttribute('y', kh + 14);
  mark.setAttribute('text-anchor', 'middle');
  mark.setAttribute('class', 'key-label');
  mark.textContent = 'Do central';
  mark.setAttribute('x', 2);
  mark.setAttribute('text-anchor', 'start');
  svg.appendChild(mark);

  if (labels && highlight !== null) {
    const i = WHITE.indexOf(highlight);
    if (i > 0) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', i * kw + kw / 2);
      t.setAttribute('y', kh + 14);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'key-label key-label-hi');
      t.textContent = NOTE_BY_MIDI.get(highlight).name;
      svg.appendChild(t);
    }
  }

  container.innerHTML = '';
  container.appendChild(svg);
}
