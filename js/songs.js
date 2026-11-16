// Sección Canciones: progresiones y canciones propias en cifrado, y melodías en partitura.
import { PROGRESSIONS, SONGS, NOTE_BY_MIDI, parseChord, chordText } from './data.js';
import * as store from './store.js';
import { drawKeyboard, drawMelodyLine, foldToKeyboard } from './staff.js';
import { mic, show, $, $$, esc, heardLabel, meterPct, stopMic, startMic, backHeader, icon, ring, celebrate } from './ui.js';
import { keepAwake } from './audio.js';

let goHome = () => {};
let stopPlayer = null;

function leave() {
  if (stopPlayer) stopPlayer();
  stopPlayer = null;
  stopMic();
}

// ---------- lectura de acordes escritos por ti ----------

const LATIN_TO_LETTER = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };

// Acepta C, F#m, Bb7, Cmaj7 y también Do, Fa#m, Sib7, Domaj7.
export function parseAnyChord(token) {
  let t = token.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  t = t.split('/')[0]; // ignora el bajo: C/E se toca como C
  const american = parseChord(t.charAt(0).toUpperCase() + t.slice(1));
  if (american) return american;
  const m = /^(do|re|mi|fa|sol|la|si)([#b]?)(maj7|m7|m|7)?$/i.exec(t);
  if (m) return parseChord(LATIN_TO_LETTER[m[1].toLowerCase()] + m[2] + (m[3] || ''));
  return null;
}

// Convierte el texto en compases: un acorde por compás.
export function parseChart(text) {
  return text
    .split(/[\s|,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, chord: parseAnyChord(raw) }));
}

// ---------- lista ----------

export function renderSongs(home) {
  if (home) goHome = home;
  leave();
  const mine = store.getState().mySongs;
  const notation = store.getState().settings.notation;
  const pills = (ids) => `<span class="chord-pills">${ids.map((id) => `<span>${chordText(parseChord(id), notation === 'names' ? 'names' : 'letters')}</span>`).join('')}</span>`;

  show(`
    <header><h1 class="title">Canciones</h1></header>

    <section class="stack">
      <p class="eyebrow">En cifrado · Tus canciones</p>
      ${mine.length
        ? `<ul class="list">${mine.map((s) => `<li><button class="list-row" data-mine="${esc(s.id)}"><span class="tile-ico warm">${icon('star')}</span><span class="grow"><strong>${esc(s.title)}</strong></span>${icon('chevron')}</button></li>`).join('')}</ul>`
        : '<p class="small muted">Carga los acordes de cualquier canción y tócala con un pulso que marca los cambios.</p>'}
      <button class="btn" id="add">${icon('plus')} Agregar una canción</button>
    </section>

    <section class="stack">
      <p class="eyebrow">En cifrado · Progresiones</p>
      <ul class="list">
        ${PROGRESSIONS.map((p) => `<li><button class="list-row" data-prog="${p.id}">
          <span class="tile-ico">${icon('keys')}</span>
          <span class="grow"><strong>${p.title}</strong>${pills(p.chords)}</span>${icon('chevron')}</button></li>`).join('')}
      </ul>
    </section>

    <section class="stack">
      <p class="eyebrow">En partitura · Melodías con acordes</p>
      <ul class="list">
        ${SONGS.map((s) => `<li><button class="list-row" data-song="${s.id}">
          <span class="tile-ico violet">${icon('staff')}</span>
          <span class="grow"><strong>${s.title}</strong><br><span class="small muted">${s.by}</span></span>${icon('chevron')}</button></li>`).join('')}
      </ul>
      <p class="small muted">Lees la melodía y la app comprueba cada nota; los acordes van escritos arriba. Son obras de dominio público: las canciones con derechos de autor no pueden incluirse en partitura.</p>
    </section>
  `, { tab: 'songs' });
  $('#add').onclick = () => renderEditor(null);
  $$('[data-prog]').forEach((b) => {
    b.onclick = () => {
      const p = PROGRESSIONS.find((x) => x.id === b.dataset.prog);
      renderChart({ title: p.title, note: p.note, bars: p.chords.map((id) => ({ raw: id, chord: parseChord(id) })), beats: p.beats || 4 });
    };
  });
  $$('[data-mine]').forEach((b) => {
    b.onclick = () => {
      const s = store.getState().mySongs.find((x) => x.id === b.dataset.mine);
      renderChart({ title: s.title, bars: parseChart(s.text), beats: s.beats || 4, mine: s });
    };
  });
  $$('[data-song]').forEach((b) => {
    b.onclick = () => renderMelody(SONGS.find((x) => x.id === b.dataset.song));
  });
}

// ---------- editor de canciones propias ----------

function renderEditor(song) {
  leave();
  const s = song || { id: 'm' + Date.now(), title: '', text: '', beats: 4 };
  show(`
    ${backHeader(song ? 'Editar canción' : 'Nueva canción')}
    <section class="card stack">
      <label class="field"><span>Título</span>
        <input type="text" id="title" value="${esc(s.title)}" maxlength="60" autocomplete="off" placeholder="Nombre de la canción">
      </label>
      <label class="field"><span>Acordes, uno por compás</span>
        <textarea id="text" rows="6" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="F#m D A E">${esc(s.text)}</textarea>
      </label>
      <p class="small muted">Sepáralos con espacios. Puedes escribirlos con letras (C, F#m, Bb, G7) o con nombres (Do, Fa#m, Sib, Sol7). Si un acorde dura dos compases, escríbelo dos veces.</p>
      <div class="field"><span>Compás</span>
        <div class="seg" role="group" aria-label="Compás">
          <button data-beats="4" aria-pressed="${s.beats !== 3}">4/4</button>
          <button data-beats="3" aria-pressed="${s.beats === 3}">3/4 (vals)</button>
        </div>
      </div>
      <p class="feedback left" id="check" role="status"></p>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="save">Guardar</button>
    ${song ? '<button class="btn" id="delete">Eliminar esta canción</button>' : ''}
  `);
  let beats = s.beats === 3 ? 3 : 4;
  const check = () => {
    const bars = parseChart($('#text').value);
    const bad = bars.filter((b) => !b.chord).map((b) => b.raw);
    const el = $('#check');
    if (!bars.length) el.textContent = '';
    else if (bad.length) {
      el.textContent = `No reconozco: ${bad.slice(0, 5).join(', ')}. Se mostrarán tal cual, sin teclas.`;
      el.className = 'feedback left feedback-hint';
    } else {
      el.textContent = `${bars.length} compases reconocidos.`;
      el.className = 'feedback left feedback-good';
    }
    return bars;
  };
  check();
  $('#text').oninput = check;
  $$('[data-beats]').forEach((b) => {
    b.onclick = () => {
      beats = Number(b.dataset.beats);
      $$('[data-beats]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    };
  });
  $('#back').onclick = () => renderSongs();
  $('#save').onclick = () => {
    const title = $('#title').value.trim();
    const text = $('#text').value.trim();
    const el = $('#check');
    if (!title || !parseChart(text).length) {
      el.textContent = 'Falta el título o los acordes.';
      el.className = 'feedback left feedback-bad';
      return;
    }
    store.saveSong({ id: s.id, title, text, beats });
    renderSongs();
  };
  if (song) {
    $('#delete').onclick = () => {
      store.deleteSong(s.id);
      renderSongs();
    };
  }
}

// ---------- reproductor de cifrado ----------

function renderChart({ title, note = '', bars, beats, mine = null }) {
  leave();
  const settings = store.getState().settings;
  const names = settings.notation === 'names';
  let tempo = settings.tempo || 70;
  let click = settings.click !== false;
  let playing = false;
  let timer = null;
  let ctx = null;
  let bar = 0;
  let beat = -1;

  const cell = (b, i) => {
    const main = b.chord ? (names ? b.chord.latin : b.chord.letters) : esc(b.raw);
    const sub = b.chord && settings.notation === 'both' ? b.chord.latin : '';
    return `<div class="chart-cell" data-bar="${i}"><span class="chart-main">${main}</span>${sub ? `<span class="chart-sub">${sub}</span>` : ''}</div>`;
  };

  show(`
    ${backHeader(esc(title))}
    ${note ? `<p class="muted">${note}</p>` : ''}
    <section class="card stack">
      <div class="chart">${bars.map(cell).join('')}</div>
      <div class="beats" id="beats" aria-hidden="true">${Array.from({ length: beats }, () => '<span class="beat"></span>').join('')}</div>
    </section>
    <section class="card stack">
      <p class="center"><strong id="now-name"></strong></p>
      <p class="small muted center" id="now-notes"></p>
      <div id="keys"></div>
    </section>
    <section class="card stack">
      <div class="row-between">
        <button class="icon-btn" id="slower" aria-label="Más lento">−</button>
        <div class="center"><div class="stat-num" id="tempo">${tempo}</div><div class="small muted">pulsos por minuto</div></div>
        <button class="icon-btn" id="faster" aria-label="Más rápido">+</button>
      </div>
      <label class="setting"><span><strong>Sonido del pulso</strong></span><input type="checkbox" id="click" ${click ? 'checked' : ''}></label>
    </section>
    <div class="spacer"></div>
    <button class="btn btn-primary" id="play">Empezar</button>
    ${mine ? '<button class="btn" id="edit">Editar los acordes</button>' : ''}
  `);

  const paint = () => {
    $$('.chart-cell').forEach((el) => el.classList.toggle('chart-now', Number(el.dataset.bar) === bar));
    $$('.beat').forEach((el, i) => el.classList.toggle('beat-on', i === beat));
    const b = bars[bar];
    if (b.chord) {
      $('#now-name').textContent = `${b.chord.letters} · ${b.chord.latin} · ${b.chord.full}`;
      $('#now-notes').textContent = b.chord.names.join(', ');
      drawKeyboard($('#keys'), { highlight: b.chord.midis.map(foldToKeyboard) });
    } else {
      $('#now-name').textContent = b.raw;
      $('#now-notes').textContent = 'Acorde no reconocido: tócalo como lo conoces.';
      $('#keys').innerHTML = '';
    }
    const now = $('.chart-now');
    if (now && playing) now.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const tick = () => {
    beat += 1;
    if (beat >= beats) {
      beat = 0;
      bar = (bar + 1) % bars.length;
    }
    paint();
    if (click && ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = beat === 0 ? 1320 : 880;
      gain.gain.setValueAtTime(beat === 0 ? 0.35 : 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    }
  };

  const stop = () => {
    playing = false;
    clearInterval(timer);
    timer = null;
    keepAwake(false);
    if ($('#play')) $('#play').textContent = 'Empezar';
  };
  const start = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!ctx && Ctx) ctx = new Ctx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    playing = true;
    bar = 0;
    beat = -1;
    keepAwake(true);
    $('#play').textContent = 'Detener';
    tick();
    timer = setInterval(tick, 60000 / tempo);
  };
  stopPlayer = () => {
    stop();
    if (ctx) ctx.close().catch(() => {});
    ctx = null;
  };

  const setTempo = (value) => {
    tempo = Math.max(40, Math.min(160, value));
    $('#tempo').textContent = tempo;
    store.setSetting('tempo', tempo);
    if (playing) {
      clearInterval(timer);
      timer = setInterval(tick, 60000 / tempo);
    }
  };

  paint();
  $('#play').onclick = () => (playing ? stop() : start());
  $('#slower').onclick = () => setTempo(tempo - 5);
  $('#faster').onclick = () => setTempo(tempo + 5);
  $('#click').onchange = (e) => {
    click = e.target.checked;
    store.setSetting('click', click);
  };
  $$('.chart-cell').forEach((el) => {
    el.onclick = () => {
      if (playing) return;
      bar = Number(el.dataset.bar);
      beat = -1;
      paint();
    };
  });
  $('#back').onclick = () => renderSongs();
  if (mine) $('#edit').onclick = () => renderEditor(mine);
}

// ---------- melodía en partitura ----------

async function renderMelody(song) {
  leave();
  const settings = store.getState().settings;
  let input = settings.input;
  let micNote = '';
  if (input === 'mic') {
    micNote = await startMic();
    if (micNote) input = 'screen';
  }

  // Numera las notas y agrupa los compases de a dos por renglón.
  let index = 0;
  const bars = song.bars.map((bar) => bar.map((n) => ({ ...n, index: index++ })));
  const notes = bars.flat();
  const lines = [];
  for (let i = 0; i < bars.length; i += 2) lines.push(bars.slice(i, i + 2));
  const lineOf = (pos) => lines.findIndex((ln) => ln.some((bar) => bar.some((n) => n.index === pos)));

  const state = { pos: 0, errors: 0, started: Date.now(), showKeys: input === 'screen', hint: false };
  const chordLabel = (id) => {
    const c = parseChord(id);
    return settings.notation === 'names' ? c.latin : c.letters;
  };

  show(`
    ${backHeader(esc(song.title))}
    <p class="small muted" id="where"></p>
    <div class="paper" id="line-a" data-keep-mic></div>
    <div class="paper paper-next" id="line-b"></div>
    <p class="feedback" id="feedback" role="status"></p>
    ${input === 'mic' ? '<div class="listen">' + icon('mic') + '<span>Escuchando tu teclado</span><div class="meter" aria-hidden="true"><div id="meter"></div></div></div>' : ''}
    ${micNote ? `<p class="small muted center">${micNote}</p>` : ''}
    <div class="keys-box" id="keys" ${state.showKeys ? '' : 'hidden'}></div>
    <p class="small muted">Mano derecha: la melodía. Cuando te salga, agrega con la izquierda el acorde escrito arriba, una vez por compás.</p>
    <div class="spacer"></div>
    <div class="row-between">
      ${input === 'mic' ? '<button class="link" id="toggle-keys">Tocar en pantalla</button>' : '<span></span>'}
      <button class="link" id="hint">¿Qué nota es?</button>
    </div>
  `);

  const fb = $('#feedback');
  const setFb = (text, cls) => {
    fb.textContent = text;
    fb.className = 'feedback ' + (cls || '');
  };
  const stateOf = (i) => (i < state.pos ? 'done' : i === state.pos ? 'current' : 'todo');

  const paint = () => {
    const li = lineOf(state.pos);
    $('#where').textContent = `${song.by} · renglón ${li + 1} de ${lines.length}`;
    drawMelodyLine($('#line-a'), lines[li], { time: li === 0 ? song.time : null, stateOf, chordLabel });
    const b = $('#line-b');
    if (lines[li + 1]) {
      b.hidden = false;
      drawMelodyLine(b, lines[li + 1], { stateOf, chordLabel });
    } else {
      b.hidden = true;
    }
    drawKeyboard($('#keys'), {
      highlight: state.hint ? notes[state.pos].midi : null,
      labels: state.hint,
      onPress: (midi) => answer(midi),
    });
  };

  function finish() {
    stopMic();
    const seconds = Math.round((Date.now() - state.started) / 1000);
    show(`
      ${backHeader(esc(song.title))}
      <section class="card stack center">
        ${ring(Math.round((Math.max(0, notes.length - state.errors) / notes.length) * 100), icon('check'), { big: true })}
        <h2>Canción completa</h2>
        <div class="stats">
          <div><div class="stat-num">${notes.length}</div><div class="small muted">notas</div></div>
          <div><div class="stat-num">${state.errors}</div><div class="small muted">errores</div></div>
          <div><div class="stat-num">${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</div><div class="small muted">tiempo</div></div>
        </div>
        <p class="muted">${state.errors === 0 ? 'Sin errores. Prueba ahora sumando los acordes con la mano izquierda.' : 'Repítela hasta que salga sin errores, y después suma los acordes con la mano izquierda.'}</p>
      </section>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="again">Tocarla otra vez</button>
      <button class="btn" id="list">Volver a Canciones</button>
    `);
    celebrate();
    $('#back').onclick = () => renderSongs();
    $('#list').onclick = () => renderSongs();
    $('#again').onclick = () => renderMelody(song);
  }

  function answer(midi) {
    if (state.pos >= notes.length) return;
    const target = notes[state.pos].midi;
    const sameClass = ((midi - target) % 12 + 12) % 12 === 0;
    if (midi === target || (!settings.strictOctave && sameClass)) {
      state.pos += 1;
      state.hint = false;
      setFb('', '');
      if (state.pos >= notes.length) return finish();
      paint();
      return;
    }
    state.errors += 1;
    if (sameClass) setFb(`Es ${NOTE_BY_MIDI.get(target).name}, pero en otra altura.`, 'feedback-bad');
    else setFb(`Tocaste ${heardLabel(midi)}. La nota está más ${midi > target ? 'abajo' : 'arriba'}.`, 'feedback-bad');
  }

  paint();
  $('#back').onclick = () => renderSongs();
  $('#hint').onclick = () => {
    state.hint = true;
    state.errors += 1;
    $('#keys').hidden = false;
    setFb(`Es ${NOTE_BY_MIDI.get(notes[state.pos].midi).label}.`, 'feedback-hint');
    paint();
  };
  if ($('#toggle-keys')) {
    $('#toggle-keys').onclick = () => {
      state.showKeys = !state.showKeys;
      $('#keys').hidden = !state.showKeys && !state.hint;
      $('#toggle-keys').textContent = state.showKeys ? 'Ocultar teclado' : 'Tocar en pantalla';
    };
  }
  if (input === 'mic') {
    mic.onNote = answer;
    mic.onLevel = ({ level }) => {
      const meter = $('#meter');
      if (meter) meter.style.width = meterPct(level) + '%';
    };
  }
}
