// Partituras propias: carga archivos MusicXML, los guarda en el dispositivo y los practica nota por nota.
import * as store from './store.js';
import { app, mic, show, $, $$, esc, icon, backHeader, heardLabel, meterPct, startMic, stopMic, celebrate, ring } from './ui.js';

const EXAMPLE = { id: 'ejemplo', title: 'Oda a la alegría', sub: 'Ejemplo a dos manos', url: new URL('../scores/oda-a-la-alegria.musicxml', import.meta.url).href };
const OSMD_URL = new URL('../vendor/osmd.min.js', import.meta.url).href;
const CSS_URL = new URL('../css/scores.css', import.meta.url).href;
const MAX_BYTES = 20 * 1024 * 1024;
const NOT_MUSICXML = 'Ese archivo no es una partitura en formato MusicXML.';
const TRASH = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>';

// ---------- estilos y biblioteca, solo cuando hacen falta ----------

function ensureCss() {
  if (document.querySelector('link[href*="scores.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  document.head.appendChild(link);
}

let osmdReady = null;
function loadOsmd() {
  if (window.opensheetmusicdisplay) return Promise.resolve(window.opensheetmusicdisplay);
  if (!osmdReady) {
    osmdReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = OSMD_URL;
      s.onload = () => (window.opensheetmusicdisplay ? resolve(window.opensheetmusicdisplay) : reject(new Error('osmd')));
      s.onerror = () => {
        s.remove();
        osmdReady = null;
        reject(new Error('osmd'));
      };
      document.head.appendChild(s);
    });
  }
  return osmdReady;
}

// ---------- almacenamiento en el dispositivo (IndexedDB) ----------

const DB_NAME = 'tenpiano';
const DB_STORE = 'scores';
const memory = new Map(); // respaldo si el navegador no deja guardar
let dbBroken = false;

function openDb(version) {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('sin IndexedDB'));
    let req;
    try {
      req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
    } catch (e) {
      return reject(e);
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
  });
}

async function withStore(mode, fn) {
  let db = await openDb();
  // Si la base ya existía sin este almacén, se agrega subiendo la versión.
  if (!db.objectStoreNames.contains(DB_STORE)) {
    const next = db.version + 1;
    db.close();
    db = await openDb(next);
  }
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const req = fn(tx.objectStore(DB_STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB'));
    });
  } finally {
    db.close();
  }
}

async function dbAll() {
  if (!dbBroken) {
    try {
      const all = await withStore('readonly', (s) => s.getAll());
      return all || [];
    } catch (e) {
      dbBroken = true;
    }
  }
  return [...memory.values()];
}

async function dbGet(id) {
  if (!dbBroken) {
    try {
      return (await withStore('readonly', (s) => s.get(id))) || null;
    } catch (e) {
      dbBroken = true;
    }
  }
  return memory.get(id) || null;
}

// Devuelve true si quedó guardada en el dispositivo; false si solo queda en memoria.
async function dbPut(rec) {
  if (!dbBroken) {
    try {
      await withStore('readwrite', (s) => s.put(rec));
      return true;
    } catch (e) {
      if (e && e.name === 'QuotaExceededError') throw e;
      dbBroken = true;
    }
  }
  memory.set(rec.id, rec);
  return false;
}

async function dbDelete(id) {
  memory.delete(id);
  if (dbBroken) return;
  try {
    await withStore('readwrite', (s) => s.delete(id));
  } catch (e) {
    dbBroken = true;
  }
}

// ---------- lectura de archivos ----------

function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  return new TextDecoder('utf-8').decode(bytes);
}

function toBinaryString(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return out;
}

function fromBinaryString(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff;
  return bytes;
}

const isZip = (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b;

// Convierte texto MusicXML en un documento, o devuelve el motivo por el que no sirve.
function parseXml(text) {
  const head = text.slice(0, 4000);
  if (!/<score-(partwise|timewise)[\s>]/.test(text) || !head.trimStart().startsWith('<')) return { error: NOT_MUSICXML };
  const doc = new DOMParser().parseFromString(text.trimStart(), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return { error: 'El archivo parece MusicXML, pero está dañado y no se puede leer.' };
  const root = doc.documentElement ? doc.documentElement.nodeName : '';
  if (root === 'score-timewise') return { error: 'Esa partitura usa una variante de MusicXML (score-timewise) que la app no lee. Expórtala de nuevo como MusicXML normal.' };
  if (root !== 'score-partwise') return { error: NOT_MUSICXML };
  return { doc };
}

// Lector mínimo de .mxl (un zip): devuelve el texto de la partitura que contiene.
async function unzipScore(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('zip');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('zip');
    const nameLen = view.getUint16(at + 28, true);
    entries.push({
      method: view.getUint16(at + 10, true),
      size: view.getUint32(at + 20, true),
      local: view.getUint32(at + 42, true),
      name: new TextDecoder('utf-8').decode(bytes.subarray(at + 46, at + 46 + nameLen)),
    });
    at += 46 + nameLen + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  const read = async (entry) => {
    const start = entry.local + 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true);
    const raw = bytes.subarray(start, start + entry.size);
    if (entry.method === 0) return raw;
    if (entry.method !== 8) throw new Error('zip');
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };
  let target = null;
  const container = entries.find((e) => e.name.toLowerCase() === 'meta-inf/container.xml');
  if (container) {
    const doc = new DOMParser().parseFromString(decodeText(await read(container)), 'application/xml');
    const rootfile = doc.getElementsByTagName('rootfile')[0];
    const path = rootfile && rootfile.getAttribute('full-path');
    target = entries.find((e) => e.name === path) || null;
  }
  if (!target) target = entries.find((e) => !/^meta-inf\//i.test(e.name) && /\.(musicxml|xml)$/i.test(e.name));
  if (!target) throw new Error('sin partitura');
  return decodeText(await read(target));
}

// Deja la partitura lista para OSMD: siempre que se puede, como documento ya leído
// (así la biblioteca nunca interpreta el contenido como una dirección web).
async function scoreSource(kind, data) {
  if (kind === 'mxl') {
    if (typeof DecompressionStream === 'undefined') return { source: data };
    let text;
    try {
      text = await unzipScore(fromBinaryString(data));
    } catch (e) {
      return { error: NOT_MUSICXML };
    }
    const parsed = parseXml(text);
    return parsed.error ? parsed : { source: parsed.doc };
  }
  const parsed = parseXml(data);
  return parsed.error ? parsed : { source: parsed.doc };
}

function newOsmd(container) {
  const osmd = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
    autoResize: false,
    backend: 'svg',
    drawTitle: false,
    drawSubtitle: false,
    drawPartNames: false,
    drawComposer: false,
    drawLyricist: false,
    drawCredits: false,
    followCursor: false,
    cursorsOptions: [{ type: 0, color: '#00b89b', alpha: 0.55, follow: false }],
  });
  // Márgenes chicos: en el teléfono cada milímetro de ancho cuenta.
  const rules = osmd.EngravingRules;
  if (rules) {
    rules.PageLeftMargin = 2;
    rules.PageRightMargin = 2;
    rules.PageTopMargin = 2;
    rules.PageBottomMargin = 2;
  }
  return osmd;
}

// Lee el archivo elegido y lo valida cargándolo de verdad. Devuelve { rec } o { error }.
async function readScoreFile(file) {
  if (file.size > MAX_BYTES) return { error: 'Ese archivo es demasiado grande (más de 20 MB).' };
  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (e) {
    return { error: 'No se pudo leer el archivo.' };
  }
  if (!bytes.length) return { error: NOT_MUSICXML };
  const kind = isZip(bytes) ? 'mxl' : 'xml';
  const data = kind === 'mxl' ? toBinaryString(bytes) : decodeText(bytes);
  const src = await scoreSource(kind, data);
  if (src.error) return { error: src.error };

  let title = '';
  let lib = null;
  try {
    lib = await loadOsmd();
  } catch (e) {
    lib = null; // sin la biblioteca (por ejemplo, sin conexión la primera vez): alcanza con la revisión anterior
  }
  if (lib) {
    const box = document.createElement('div');
    box.className = 'sc-offscreen';
    document.body.appendChild(box);
    try {
      const osmd = newOsmd(box);
      await osmd.load(src.source);
      if (!osmd.Sheet || !osmd.Sheet.SourceMeasures || !osmd.Sheet.SourceMeasures.length) return { error: 'Esa partitura no tiene compases para practicar.' };
      title = (osmd.Sheet.TitleString || '').trim();
    } catch (e) {
      return { error: NOT_MUSICXML };
    } finally {
      box.remove();
    }
  }
  const base = file.name.replace(/\.(musicxml|xml|mxl)$/i, '').trim();
  if (!title || /^untitled( score)?$/i.test(title)) title = base || 'Partitura';
  return {
    rec: {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: title.slice(0, 120),
      fileName: file.name,
      kind,
      data,
      added: new Date().toISOString(),
    },
  };
}

// ---------- bloque para la pantalla Canciones ----------

let flash = null; // { text, cls }: aviso que se muestra una vez después de volver a dibujar

export async function scoresSectionHtml() {
  ensureCss();
  const mine = (await dbAll()).sort((a, b) => String(b.added).localeCompare(String(a.added)));
  const note = flash;
  flash = null;
  const row = (id, title, sub, tone) => `<button class="list-row" data-score="${esc(id)}">
      <span class="tile-ico ${tone}">${icon('staff')}</span>
      <span class="grow"><strong>${esc(title)}</strong><br><span class="small muted">${esc(sub)}</span></span>${icon('chevron')}</button>`;
  return `
    <section class="stack sc-section">
      <p class="eyebrow">En partitura · Tus partituras</p>
      <ul class="list">
        <li>${row(EXAMPLE.id, EXAMPLE.title, EXAMPLE.sub, 'violet')}</li>
        ${mine.map((s) => `<li class="sc-item" data-item="${esc(s.id)}">
          ${row(s.id, s.title, s.fileName || 'Partitura cargada', 'warm')}
          <button class="icon-btn sc-del" data-del="${esc(s.id)}" aria-label="Eliminar ${esc(s.title)}">${TRASH}</button>
          <div class="sc-confirm" hidden>
            <span class="grow">¿Eliminar <strong>${esc(s.title)}</strong>?</span>
            <button class="sc-mini sc-mini-bad" data-yes="${esc(s.id)}">Eliminar</button>
            <button class="sc-mini" data-no>Cancelar</button>
          </div>
        </li>`).join('')}
      </ul>
      ${dbBroken ? '<p class="small sc-warn">Este navegador no permite guardar partituras en el dispositivo: las que cargues se perderán al cerrar la app.</p>' : ''}
      <label class="btn sc-import" id="sc-import">${icon('plus')} <span id="sc-import-text">Cargar una partitura</span>
        <input type="file" id="sc-file" accept=".musicxml,.xml,.mxl">
      </label>
      <p class="sc-msg ${note ? note.cls : ''}" id="sc-msg" role="status">${note ? esc(note.text) : ''}</p>
      <p class="small muted">Formatos: MusicXML (.musicxml, .xml, .mxl). Muchas tiendas de partituras y programas de notación permiten descargar o exportar en este formato. El archivo queda solo en este dispositivo.</p>
    </section>`;
}

export function bindScoresSection(refresh) {
  const again = typeof refresh === 'function' ? refresh : () => {};
  const open = (id) => renderScore(id, again);
  const msg = (text, cls) => {
    const el = $('#sc-msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'sc-msg ' + (cls || '');
  };

  $$('[data-score]').forEach((b) => {
    b.onclick = () => open(b.dataset.score);
  });

  // Eliminar, en dos pasos y sin salir de la página.
  $$('.sc-item').forEach((li) => {
    const confirm = li.querySelector('.sc-confirm');
    const rowBtn = li.querySelector('.list-row');
    const del = li.querySelector('.sc-del');
    const ask = (on) => {
      confirm.hidden = !on;
      rowBtn.hidden = on;
      del.hidden = on;
      if (on) confirm.querySelector('[data-no]').focus();
    };
    del.onclick = () => {
      $$('.sc-item').forEach((other) => {
        if (other !== li && !other.querySelector('.sc-confirm').hidden) other.querySelector('[data-no]').click();
      });
      ask(true);
    };
    confirm.querySelector('[data-no]').onclick = () => {
      ask(false);
      del.focus();
    };
    confirm.querySelector('[data-yes]').onclick = async () => {
      await dbDelete(li.dataset.item);
      flash = { text: 'Partitura eliminada.', cls: 'feedback-hint' };
      again();
    };
  });

  const file = $('#sc-file');
  if (!file) return;
  let busy = false;
  file.onchange = async () => {
    const f = file.files && file.files[0];
    if (!f || busy) return;
    busy = true;
    const label = $('#sc-import');
    const text = $('#sc-import-text');
    if (label) label.classList.add('sc-busy');
    if (text) text.textContent = 'Revisando el archivo…';
    msg('', '');
    let result;
    try {
      result = await readScoreFile(f);
      if (result.rec) {
        const saved = await dbPut(result.rec);
        flash = saved
          ? { text: `Se agregó «${result.rec.title}».`, cls: 'feedback-good' }
          : { text: `Se agregó «${result.rec.title}», pero este navegador no permite guardarla: se perderá al cerrar la app.`, cls: 'feedback-hint' };
      }
    } catch (e) {
      result = { error: e && e.name === 'QuotaExceededError' ? 'No queda espacio en el dispositivo para guardar esa partitura.' : 'No se pudo cargar esa partitura.' };
    }
    busy = false;
    file.value = '';
    if (result.rec) return again();
    if (label) label.classList.remove('sc-busy');
    if (text) text.textContent = 'Cargar una partitura';
    msg(result.error, 'feedback-bad');
  };
}

// ---------- práctica ----------

let session = 0; // cambia al salir: corta lo que haya quedado a medias
let cleanup = null;

export function leaveScore() {
  session += 1;
  if (cleanup) {
    try {
      cleanup();
    } catch (e) {
      /* nada que limpiar */
    }
  }
  cleanup = null;
  stopMic();
}

const pc = (midi) => ((midi % 12) + 12) % 12;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Qué pentagramas son la mano derecha y la izquierda.
function findHands(sheet) {
  const instruments = sheet.Instruments || [];
  const staves = sheet.Staves || [];
  for (const inst of instruments) {
    if (inst.Staves && inst.Staves.length === 2) return { right: inst.Staves[0].idInMusicSheet, left: inst.Staves[1].idInMusicSheet };
  }
  if (staves.length === 2) return { right: staves[0].idInMusicSheet, left: staves[1].idInMusicSheet };
  return null;
}

function failScreen(title, text, onBack) {
  show(`
    ${backHeader(esc(title))}
    <section class="card stack">
      <p>${esc(text)}</p>
    </section>
    <div class="spacer"></div>
    <button class="btn" id="sc-back2">Volver</button>
  `);
  $('#back').onclick = onBack;
  $('#sc-back2').onclick = onBack;
}

export async function renderScore(id, onBack, keep = null) {
  leaveScore();
  ensureCss();
  const my = session;
  const alive = () => my === session;
  const back = () => {
    leaveScore();
    if (typeof onBack === 'function') onBack();
  };
  const settings = store.getState().settings;

  // El micrófono se pide primero, mientras todavía cuenta el toque del usuario.
  let input = settings.input === 'mic' ? 'mic' : 'manual';
  let micNote = '';
  if (input === 'mic') {
    micNote = await startMic();
    if (!alive()) return;
    if (micNote) {
      input = 'manual';
      micNote = micNote.replace(/\s*(Por ahora usa|Usa) el teclado en pantalla\./, '') + ' Avanza con el botón Siguiente.';
    }
  }

  let title = id === EXAMPLE.id ? EXAMPLE.title : 'Partitura';
  show(`
    ${backHeader(esc(title))}
    <section class="card stack center sc-wait" role="status">
      <span class="sc-spin" aria-hidden="true"></span>
      <p><strong>Preparando la partitura…</strong></p>
      <p class="small muted">Las partituras largas pueden tardar unos segundos.</p>
    </section>
  `);
  $('#back').onclick = back;

  // 1. Datos de la partitura.
  let kind = 'xml';
  let data = '';
  try {
    if (id === EXAMPLE.id) {
      const res = await fetch(EXAMPLE.url);
      if (!res.ok) throw new Error('ejemplo');
      data = await res.text();
    } else {
      const rec = await dbGet(id);
      if (!alive()) return;
      if (!rec) {
        stopMic();
        return failScreen(title, 'Esa partitura ya no está guardada en este dispositivo.', back);
      }
      title = rec.title || title;
      kind = rec.kind === 'mxl' ? 'mxl' : 'xml';
      data = rec.data;
      const h = $('header h2');
      if (h) h.textContent = title;
    }
  } catch (e) {
    if (!alive()) return;
    stopMic();
    return failScreen(title, 'No se pudo abrir la partitura. Revisa tu conexión y vuelve a intentarlo.', back);
  }
  if (!alive()) return;

  // 2. Biblioteca de notación (se descarga la primera vez que abres una partitura).
  try {
    await loadOsmd();
  } catch (e) {
    if (!alive()) return;
    stopMic();
    return failScreen(title, 'No se pudo cargar el lector de partituras. Revisa tu conexión y vuelve a intentarlo.', back);
  }
  if (!alive()) return;

  const src = await scoreSource(kind, data);
  if (!alive()) return;
  if (src.error) {
    stopMic();
    return failScreen(title, src.error, back);
  }

  // 3. Pantalla de práctica.
  const phone = Math.min(window.innerWidth, 560) < 520;
  const p = {
    hand: (keep && keep.hand) || 'right',
    from: 1,
    to: 1,
    total: 1,
    zoom: (keep && keep.zoom) || (phone ? 0.6 : 0.8),
    ticks: 0, // pasos del cursor desde el comienzo del tramo
    step: null, // { notes: [midi], measure }
    prev: null, // paso anterior, si tenía varias notas: { notes, at }
    errors: 0,
    played: 0,
    skipped: 0,
    started: 0,
    done: false,
    chordHint: false,
    busy: true,
  };

  show(`
    ${backHeader(esc(title))}
    <section class="sc-controls">
      <div class="seg" id="sc-hand" role="group" aria-label="Mano que practicas" hidden>
        <button data-hand="right" aria-pressed="false">Derecha</button>
        <button data-hand="left" aria-pressed="false">Izquierda</button>
        <button data-hand="both" aria-pressed="false">Las dos</button>
      </div>
      <div class="sc-range">
        <label for="sc-from">Compases del</label>
        <input type="number" id="sc-from" inputmode="numeric" min="1" value="1" aria-label="Primer compás">
        <label for="sc-to">al</label>
        <input type="number" id="sc-to" inputmode="numeric" min="1" value="1" aria-label="Último compás">
        <button class="sc-mini" id="sc-apply">Aplicar</button>
      </div>
    </section>
    <div class="sc-status">
      <p class="small muted grow"><span id="sc-where">Preparando la partitura…</span><br><span id="sc-errors"></span></p>
      <button class="icon-btn" id="sc-zoom-out" aria-label="Reducir el tamaño de la partitura">−</button>
      <button class="icon-btn" id="sc-zoom-in" aria-label="Aumentar el tamaño de la partitura">+</button>
    </div>
    <div class="paper sc-paper" id="sc-paper"><div id="sc-osmd"></div></div>
    <p class="small muted" id="sc-note" hidden></p>
    <div class="sc-bar">
      <p class="feedback sc-feedback" id="sc-feedback" role="status"></p>
      ${input === 'mic' ? '<div class="listen">' + icon('mic') + '<span>Escuchando tu teclado</span><div class="meter" aria-hidden="true"><div id="sc-meter"></div></div></div>' : ''}
      ${micNote ? `<p class="small muted center">${esc(micNote)}</p>` : ''}
      <div class="sc-actions">
        <button class="link" id="sc-restart">Reiniciar</button>
        <button class="btn btn-primary" id="sc-next">Siguiente</button>
      </div>
    </div>
  `, { animate: false });
  $('#back').onclick = back;

  const fb = $('#sc-feedback');
  const setFb = (text, cls) => {
    if (!fb) return;
    fb.textContent = text;
    fb.className = 'feedback sc-feedback ' + (cls || '');
  };
  const busy = (on) => {
    p.busy = on;
    const paper = $('#sc-paper');
    if (paper) paper.classList.toggle('sc-working', on);
    ['#sc-next', '#sc-restart', '#sc-apply', '#sc-zoom-in', '#sc-zoom-out'].forEach((sel) => {
      const el = $(sel);
      if (el) el.disabled = on;
    });
  };
  busy(true);
  await nextFrame();
  if (!alive()) return;

  let osmd;
  let hands = null;
  let staffCount = 1;
  try {
    osmd = newOsmd($('#sc-osmd'));
    await osmd.load(src.source);
    if (!alive()) return;
    p.total = osmd.Sheet.SourceMeasures.length;
    if (!p.total) throw new Error('vacía');
    hands = findHands(osmd.Sheet);
    staffCount = (osmd.Sheet.Staves || []).length || 1;
    p.from = keep && keep.from ? Math.min(keep.from, p.total) : 1;
    p.to = keep && keep.to ? Math.min(Math.max(keep.to, p.from), p.total) : p.total;
    osmd.setOptions({ drawFromMeasureNumber: p.from, drawUpToMeasureNumber: p.to });
    osmd.zoom = p.zoom;
    await nextFrame();
    if (!alive()) return;
    osmd.render();
  } catch (e) {
    if (!alive()) return;
    stopMic();
    return failScreen(title, 'No se pudo mostrar esa partitura. Puede que el archivo esté dañado o use algo que la app todavía no lee.', back);
  }

  let cur = osmd.cursor; // OSMD puede crear un cursor nuevo en cada dibujo
  if (!hands) p.hand = 'both';
  const allowed = () => {
    if (!hands) return staffCount > 1 ? [0] : null; // null: todos los pentagramas
    if (p.hand === 'right') return [hands.right];
    if (p.hand === 'left') return [hands.left];
    return [hands.right, hands.left];
  };

  // Notas que hay que tocar donde está el cursor: sin silencios ni continuaciones de ligadura.
  const collect = () => {
    let under = [];
    try {
      under = cur.NotesUnderCursor() || [];
    } catch (e) {
      under = [];
    }
    const staves = allowed();
    const out = [];
    for (const n of under) {
      if (!n || n.isRest()) continue;
      if (n.NoteTie && n.NoteTie.StartNote !== n) continue;
      if (n.IsGraceNote || n.IsCueNote || n.PrintObject === false) continue;
      const staff = n.ParentStaffEntry && n.ParentStaffEntry.ParentStaff ? n.ParentStaffEntry.ParentStaff.idInMusicSheet : 0;
      if (staves && !staves.includes(staff)) continue;
      const midi = n.halfTone + 12;
      if (Number.isFinite(midi) && !out.includes(midi)) out.push(midi);
    }
    return out.sort((a, b) => a - b);
  };
  const ended = () => !cur.Iterator || cur.Iterator.EndReached;
  const measureIndex = () => cur.Iterator.CurrentMeasureIndex;
  const stepOnce = () => {
    cur.next();
    p.ticks += 1;
  };

  const paintStatus = () => {
    const where = $('#sc-where');
    const errors = $('#sc-errors');
    if (where) where.textContent = `Compás ${p.step ? p.step.measure : p.to} de ${p.total}`;
    if (errors) errors.textContent = `Errores: ${p.errors}`;
  };

  let lastLine = null; // renglón donde estaba el cursor
  const follow = (smooth) => {
    const el = cur.cursorElement;
    if (!el || p.done) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = el.getBoundingClientRect();
    const barEl = $('.sc-bar');
    const bottom = window.innerHeight - (barEl ? barEl.offsetHeight : 0) - 12;
    const line = Math.round(r.top + window.scrollY);
    const sameLine = lastLine !== null && Math.abs(line - lastLine) < 4;
    lastLine = line;
    if (sameLine && r.top >= 70 && r.bottom <= bottom) return; // mismo renglón y ya se ve
    el.scrollIntoView({ block: 'center', behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };

  const setExpect = () => {
    if (input !== 'mic') return;
    const notes = p.step ? p.step.notes : [];
    if (notes.length >= 2) {
      mic.chord = [...new Set(notes.map(pc))].sort((a, b) => a - b);
      mic.onChord = () => advance('played');
    } else {
      mic.chord = null;
      mic.onChord = null;
    }
  };

  // Desde donde está el cursor, busca el próximo paso con notas para la mano elegida.
  const seek = () => {
    for (;;) {
      if (ended()) return finish();
      const m = measureIndex();
      if (m > p.to - 1) return finish();
      if (m >= p.from - 1) {
        const notes = collect();
        if (notes.length) {
          p.step = { notes, measure: m + 1 };
          break;
        }
      }
      stepOnce();
    }
    setExpect();
    paintStatus();
    if (p.step.notes.length >= 2 && !p.chordHint) {
      p.chordHint = true;
      const note = $('#sc-note');
      if (note) {
        note.textContent = 'Cuando hay varias notas juntas, alcanza con que suene una de ellas.';
        note.hidden = false;
      }
    }
  };

  const begin = () => {
    p.ticks = 0;
    p.step = null;
    p.prev = null;
    p.errors = 0;
    p.played = 0;
    p.skipped = 0;
    p.done = false;
    p.started = Date.now();
    cur.reset();
    cur.show();
    setFb('', '');
    seek();
    if (!p.done) follow(false);
  };

  function advance(how) {
    if (p.busy || p.done || !p.step) return;
    if (how === 'played') p.played += 1;
    else p.skipped += 1;
    p.prev = p.step.notes.length >= 2 ? { notes: p.step.notes, at: performance.now() } : null;
    setFb('', '');
    stepOnce();
    seek();
    if (!p.done) follow(true);
  }

  const matches = (midi, notes) => notes.some((t) => t === midi || (!settings.strictOctave && pc(t) === pc(midi)));

  function answer(midi) {
    if (p.busy || p.done || !p.step) return;
    if (matches(midi, p.step.notes)) return advance('played');
    // Resto del acorde anterior que sigue sonando: no es un error.
    if (p.prev && performance.now() - p.prev.at < 900 && matches(midi, p.prev.notes)) return;
    p.errors += 1;
    paintStatus();
    setFb(`Tocaste ${heardLabel(midi)}.`, 'feedback-bad');
  }

  function finish() {
    p.done = true;
    p.step = null;
    const seconds = Math.round((Date.now() - p.started) / 1000);
    const steps = p.played + p.skipped;
    const options = { hand: p.hand, from: p.from, to: p.to, zoom: p.zoom };
    leaveScore();
    if (!steps) {
      // No hay nada que tocar con esta mano en este tramo.
      show(`
        ${backHeader(esc(title))}
        <section class="card stack">
          <h2>No hay notas para practicar</h2>
          <p class="muted">En los compases ${options.from} a ${options.to} no hay notas para la mano que elegiste. Prueba con otra mano u otros compases.</p>
        </section>
        <div class="spacer"></div>
        <button class="btn btn-primary" id="sc-again">Elegir otra cosa</button>
        <button class="btn" id="sc-list">Volver</button>
      `);
      $('#sc-again').onclick = () => renderScore(id, onBack, { zoom: options.zoom });
    } else {
      const pct = p.played ? Math.round((Math.max(0, p.played - p.errors) / steps) * 100) : 0;
      const whole = options.from === 1 && options.to === p.total;
      const tip = p.skipped === steps
        ? 'Avanzaste con el botón Siguiente, así que no se comprobaron las notas.'
        : p.errors === 0 && !p.skipped
          ? 'Sin errores. Prueba ahora con la otra mano o con las dos.'
          : 'Repítela hasta que salga sin errores. Si un tramo se te resiste, practica solo esos compases.';
      show(`
        ${backHeader(esc(title))}
        <section class="card stack center">
          ${p.played ? ring(pct, `${pct}%`, { big: true }) : ring(100, '✓', { big: true })}
          <h2>${whole ? 'Partitura completa' : `Compases ${options.from} a ${options.to} completos`}</h2>
          <div class="stats">
            <div><div class="stat-num">${p.played || steps}</div><div class="small muted">${p.played ? 'notas tocadas' : 'pasos'}</div></div>
            <div><div class="stat-num">${p.errors}</div><div class="small muted">errores</div></div>
            <div><div class="stat-num">${clock(seconds)}</div><div class="small muted">tiempo</div></div>
          </div>
          ${p.skipped && p.skipped !== steps ? `<p class="small muted">Pasaste ${p.skipped} ${p.skipped === 1 ? 'paso' : 'pasos'} con el botón Siguiente.</p>` : ''}
          <p class="muted">${tip}</p>
        </section>
        <div class="spacer"></div>
        <button class="btn btn-primary" id="sc-again">Otra vez</button>
        <button class="btn" id="sc-list">Volver</button>
      `);
      celebrate();
      $('#sc-again').onclick = () => renderScore(id, onBack, options);
    }
    const goBack = () => {
      if (typeof onBack === 'function') onBack();
    };
    $('#back').onclick = goBack;
    $('#sc-list').onclick = goBack;
  }

  // Vuelve a dibujar (otro tamaño o ancho de pantalla) y deja el cursor donde estaba.
  const redraw = async () => {
    if (p.done) return;
    busy(true);
    await nextFrame();
    if (!alive()) return;
    const ticks = p.ticks;
    try {
      osmd.zoom = p.zoom;
      osmd.render();
      cur = osmd.cursor;
      cur.reset();
      for (let i = 0; i < ticks && !ended(); i++) cur.next();
      cur.show();
    } catch (e) {
      /* se conserva el dibujo anterior */
    }
    busy(false);
    follow(false);
  };

  // Otro tramo de compases: se dibuja solo ese tramo y la práctica empieza de nuevo.
  const applyRange = async () => {
    const clamp = (v, lo, hi, def) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) && String(v).trim() !== '' ? Math.min(hi, Math.max(lo, n)) : def;
    };
    let a = clamp($('#sc-from').value, 1, p.total, 1);
    let b = clamp($('#sc-to').value, 1, p.total, p.total);
    if (b < a) [a, b] = [b, a];
    $('#sc-from').value = a;
    $('#sc-to').value = b;
    if (a === p.from && b === p.to) return;
    busy(true);
    await nextFrame();
    if (!alive()) return;
    p.from = a;
    p.to = b;
    try {
      osmd.setOptions({ drawFromMeasureNumber: a, drawUpToMeasureNumber: b });
      osmd.render();
      cur = osmd.cursor;
    } catch (e) {
      /* se conserva el dibujo anterior */
    }
    busy(false);
    begin();
  };

  // Controles.
  const handBox = $('#sc-hand');
  if (hands) {
    handBox.hidden = false;
    const paintHand = () => $$('[data-hand]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hand === p.hand)));
    paintHand();
    $$('[data-hand]').forEach((b) => {
      b.onclick = () => {
        if (p.busy || p.done || b.dataset.hand === p.hand) return;
        p.hand = b.dataset.hand;
        paintHand();
        p.prev = null;
        setFb('', '');
        seek(); // sigue desde donde está el cursor
        if (!p.done) follow(true);
      };
    });
  } else if (staffCount > 1) {
    const note = $('#sc-note');
    note.textContent = 'Esta partitura tiene varios instrumentos: se practica el pentagrama de arriba.';
    note.hidden = false;
    p.chordHint = true; // no se pisa este aviso
  }
  $('#sc-from').max = p.total;
  $('#sc-to').max = p.total;
  $('#sc-from').value = p.from;
  $('#sc-to').value = p.to;
  $('#sc-apply').onclick = applyRange;
  ['#sc-from', '#sc-to'].forEach((sel) => {
    $(sel).onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
        applyRange();
      }
    };
  });
  const zoomBy = (delta) => {
    if (p.busy) return;
    const z = Math.min(1.4, Math.max(0.4, Math.round((p.zoom + delta) * 10) / 10));
    if (z === p.zoom) return;
    p.zoom = z;
    redraw();
  };
  $('#sc-zoom-out').onclick = () => zoomBy(-0.1);
  $('#sc-zoom-in').onclick = () => zoomBy(0.1);
  $('#sc-next').onclick = () => advance('skipped');
  $('#sc-restart').onclick = () => {
    if (!p.busy) begin();
  };

  // Si cambia el ancho (por ejemplo, al girar el teléfono), se acomoda la partitura.
  let lastWidth = $('#sc-paper').clientWidth;
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const paper = $('#sc-paper');
      if (!paper || !alive() || p.done || p.busy) return;
      if (Math.abs(paper.clientWidth - lastWidth) < 8) return;
      lastWidth = paper.clientWidth;
      redraw();
    }, 250);
  };
  window.addEventListener('resize', onResize);
  cleanup = () => {
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    try {
      osmd.clear();
    } catch (e) {
      /* ya no hay nada dibujado */
    }
  };

  if (input === 'mic') {
    mic.onNote = answer;
    mic.expect = (midi) => !!p.step && matches(midi, p.step.notes);
    mic.onLevel = ({ level }) => {
      const meter = $('#sc-meter');
      if (meter) meter.style.width = meterPct(level) + '%';
    };
  }

  busy(false);
  begin();
}
