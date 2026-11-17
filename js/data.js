// Plan de estudio: notas en clave de sol, mano derecha.
// El orden parte de los acordes que ya conoces (Do, Fa, Sol, La menor).

export const NOTES = [
  {
    midi: 60, key: 'c/4', name: 'Do', letter: 'C', label: 'Do central',
    where: 'Va en una línea corta propia, debajo del pentagrama.',
    link: 'Es la nota más grave de tu acorde de Do. En el teclado es el Do del centro.',
  },
  {
    midi: 64, key: 'e/4', name: 'Mi', letter: 'E', label: 'Mi',
    where: 'Va sobre la primera línea, la de más abajo.',
    link: 'Es la nota del medio de tu acorde de Do.',
  },
  {
    midi: 67, key: 'g/4', name: 'Sol', letter: 'G', label: 'Sol',
    where: 'Va sobre la segunda línea, la misma que rodea la espiral de la clave de sol.',
    link: 'Es la nota más aguda de tu acorde de Do.',
  },
  {
    midi: 72, key: 'c/5', name: 'Do', letter: 'C', label: 'Do agudo',
    where: 'Va en el tercer espacio, contando desde abajo.',
    link: 'Es el siguiente Do hacia la derecha: ocho teclas blancas después del Do central.',
  },
  {
    midi: 65, key: 'f/4', name: 'Fa', letter: 'F', label: 'Fa',
    where: 'Va en el primer espacio, entre la primera y la segunda línea.',
    link: 'Es la nota más grave de tu acorde de Fa.',
  },
  {
    midi: 69, key: 'a/4', name: 'La', letter: 'A', label: 'La',
    where: 'Va en el segundo espacio.',
    link: 'Es la nota del medio de tu acorde de Fa y la base de La menor.',
  },
  {
    midi: 71, key: 'b/4', name: 'Si', letter: 'B', label: 'Si',
    where: 'Va sobre la tercera línea, la del centro.',
    link: 'Es la nota del medio de tu acorde de Sol.',
  },
  {
    midi: 74, key: 'd/5', name: 'Re', letter: 'D', label: 'Re agudo',
    where: 'Va sobre la cuarta línea.',
    link: 'Es la nota más aguda de tu acorde de Sol.',
  },
  {
    midi: 62, key: 'd/4', name: 'Re', letter: 'D', label: 'Re',
    where: 'Va justo debajo de la primera línea, colgando de ella.',
    link: 'Es la tecla blanca que sigue al Do central.',
  },
  {
    midi: 76, key: 'e/5', name: 'Mi', letter: 'E', label: 'Mi agudo',
    where: 'Va en el cuarto espacio, el de más arriba.',
    link: 'Es la nota más aguda de tu acorde de La menor.',
  },
  {
    midi: 77, key: 'f/5', name: 'Fa', letter: 'F', label: 'Fa agudo',
    where: 'Va sobre la quinta línea, la de más arriba.',
    link: 'Es el Fa que sigue al Mi agudo.',
  },
  {
    midi: 79, key: 'g/5', name: 'Sol', letter: 'G', label: 'Sol agudo',
    where: 'Va justo encima de la quinta línea, apoyada sobre ella.',
    link: 'Es el Sol que está ocho teclas blancas después del primero.',
  },
];

export const NOTE_BY_MIDI = new Map(NOTES.map((n) => [n.midi, n]));

// Notas en clave de fa, para la mano izquierda. Van del Do grave al Do central.
export const BASS_NOTES = [
  {
    midi: 53, key: 'f/3', name: 'Fa', label: 'Fa grave',
    where: 'Va sobre la cuarta línea, la que queda entre los dos puntos de la clave de fa.',
    link: 'Es el Fa que está a la izquierda del Do central, cinco teclas blancas antes.',
  },
  {
    midi: 60, key: 'c/4', name: 'Do', label: 'Do central',
    where: 'En clave de fa va en una línea corta propia, por encima del pentagrama.',
    link: 'Es la misma tecla que el Do central de la clave de sol: ahí se encuentran las dos manos.',
  },
  {
    midi: 48, key: 'c/3', name: 'Do', label: 'Do grave',
    where: 'Va en el segundo espacio, contando desde abajo.',
    link: 'Es el Do que está ocho teclas blancas a la izquierda del Do central.',
  },
  {
    midi: 55, key: 'g/3', name: 'Sol', label: 'Sol grave',
    where: 'Va en el cuarto espacio, el de más arriba.',
    link: 'Es la tecla blanca que sigue al Fa grave.',
  },
  {
    midi: 57, key: 'a/3', name: 'La', label: 'La grave',
    where: 'Va sobre la quinta línea, la de más arriba.',
    link: 'Es la base de tu acorde de La menor cuando lo tocas con la izquierda.',
  },
  {
    midi: 52, key: 'e/3', name: 'Mi', label: 'Mi grave',
    where: 'Va en el tercer espacio.',
    link: 'Es la tecla blanca anterior al Fa grave.',
  },
  {
    midi: 50, key: 'd/3', name: 'Re', label: 'Re grave',
    where: 'Va sobre la tercera línea, la del centro.',
    link: 'Es la tecla blanca que sigue al Do grave.',
  },
  {
    midi: 59, key: 'b/3', name: 'Si', label: 'Si grave',
    where: 'Va justo encima de la quinta línea, apoyada sobre ella.',
    link: 'Es la tecla blanca anterior al Do central.',
  },
];
export const BASS_BY_MIDI = new Map(BASS_NOTES.map((n) => [n.midi, n]));

// Datos de una nota según la clave en que se lee: 'n' clave de sol, 'b' clave de fa.
export function noteInfo(kind, midi) {
  return (kind === 'b' ? BASS_BY_MIDI : NOTE_BY_MIDI).get(midi);
}
export const ALL_NOTES_COUNT = NOTES.length + BASS_NOTES.length;

// Cuántas notas se presentan en la primera sesión.
export const FIRST_SESSION_NOTES = 3;
// Cuántas notas o acordes nuevos puede traer una sesión.
export const NEW_PER_SESSION = 2;

// Días hasta el próximo repaso según el nivel de dominio (0 a 5).
export const INTERVALS = [0, 1, 2, 4, 7, 14];
export const MAX_BOX = 5;

// Una respuesta cuenta como fluida si llega antes de este tiempo.
export const FLUENT_MS = 4000;
export const FLUENT_CHORD_MS = 12000;

// ---------- Acordes ----------

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const LATIN = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const ACC_SHIFT = { '': 0, '#': 1, b: -1 };
const ACC_WORD = { '': '', '#': ' sostenido', b: ' bemol' };

export const QUALITIES = {
  '': { intervals: [0, 4, 7], word: 'mayor', formula: '4 + 3 semitonos' },
  m: { intervals: [0, 3, 7], word: 'menor', formula: '3 + 4 semitonos' },
  7: { intervals: [0, 4, 7, 10], word: 'séptima', formula: 'mayor (4 + 3) más 3 semitonos' },
  maj7: { intervals: [0, 4, 7, 11], word: 'séptima mayor', formula: 'mayor (4 + 3) más 4 semitonos' },
  m7: { intervals: [0, 3, 7, 10], word: 'menor séptima', formula: 'menor (3 + 4) más 3 semitonos' },
};

// Nombre de cualquier tecla por su clase de nota (0 = Do).
export const PC_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

function accSign(a) {
  return a.replace(/#/g, '♯').replace(/b/g, '♭');
}

// Construye un acorde a partir de su símbolo en cifrado americano (C, F#m, Bb, G7...).
export function parseChord(symbol) {
  const m = /^([A-G])([#b]?)(maj7|m7|m|7)?$/.exec(symbol.trim());
  if (!m) return null;
  const [, letter, acc, q = ''] = m;
  const li = LETTERS.indexOf(letter);
  const rootPc = (LETTER_PC[li] + ACC_SHIFT[acc] + 12) % 12;
  const quality = QUALITIES[q];
  const names = [];
  const pcs = [];
  quality.intervals.forEach((iv, i) => {
    const idx = (li + i * 2) % 7;
    const pc = (rootPc + iv) % 12;
    const diff = (pc - LETTER_PC[idx] + 12) % 12;
    const a = diff === 0 ? '' : diff === 1 ? '♯' : diff === 11 ? '♭' : diff === 2 ? '♯♯' : '♭♭';
    names.push(LATIN[idx] + a);
    pcs.push(pc);
  });
  // Posición fundamental empezando en la octava del Do central.
  const rootMidi = 60 + rootPc;
  const midis = quality.intervals.map((iv) => rootMidi + iv);
  return {
    id: symbol,
    quality: q,
    rootPc,
    pcs,
    midis,
    names,
    letters: letter + accSign(acc) + q,
    latin: LATIN[li] + accSign(acc) + q,
    full: `${LATIN[li]}${ACC_WORD[acc]} ${quality.word}`,
    formula: quality.formula,
  };
}

// Orden en que aparecen los acordes. Los del nivel 1 son los que ya tocas.
export const CHORD_LEVELS = [
  { title: 'Acordes básicos', ids: ['C', 'F', 'G', 'Am', 'Dm', 'Em'] },
  { title: 'Acordes con teclas negras', ids: ['D', 'A', 'E', 'F#m'] },
  { title: 'Más acordes con teclas negras', ids: ['Bm', 'Gm', 'Cm', 'Bb', 'Eb'] },
  { title: 'Séptimas', ids: ['G7', 'C7', 'D7', 'A7', 'E7'] },
  { title: 'Menor séptima y séptima mayor', ids: ['Am7', 'Dm7', 'Em7', 'Cmaj7', 'Fmaj7'] },
];

export const CHORDS = CHORD_LEVELS.flatMap((lv, i) => lv.ids.map((id) => ({ ...parseChord(id), level: i + 1 })));
export const CHORD_BY_ID = new Map(CHORDS.map((c) => [c.id, c]));
export const KNOWN_CHORDS = CHORD_LEVELS[0].ids;

// Cómo mostrar un acorde: con letras, con nombres o de las dos formas.
export function chordText(chord, notation) {
  if (notation === 'letters') return chord.letters;
  if (notation === 'names') return chord.latin;
  return `${chord.letters} · ${chord.latin}`;
}

// ---------- Plan de aprendizaje ----------

export const SESSION_PARTS = [
  { title: 'Teoría', time: '2 min', text: 'Una lección corta, alternando acordes y pentagrama, con una pregunta para comprobar que quedó clara.' },
  { title: 'Acordes', time: '4 min', text: 'Lees un símbolo (Dm, Sol7) y armas el acorde, o ves las teclas y dices qué acorde es.' },
  { title: 'Pentagrama', time: '4 min', text: 'Lees notas y frases en clave de sol con la mano derecha, y en clave de fa con la izquierda.' },
];

export const TRACKS = [
  {
    id: 'chords',
    title: 'Acordes y cifrado',
    goal: 'Leer cualquier símbolo de acorde, con letras o con nombres, y armarlo sin memorizarlo.',
    units: [
      { title: 'Leer el cifrado', ready: true, topics: ['Letras y nombres: C es Do, Am es Lam', 'Mayor y menor', 'Tus acordes básicos: C, F, G, Am, Dm, Em'] },
      { title: 'Armar acordes', ready: true, topics: ['Semitonos', 'Fórmula del mayor: 4 + 3', 'Fórmula del menor: 3 + 4'] },
      { title: 'Acordes con teclas negras', ready: true, topics: ['Sostenidos y bemoles: F#m, Bb', 'D, A, E, F#m', 'Bm, Gm, Cm, Bb, Eb'] },
      { title: 'Séptimas', ready: true, topics: ['G7, C7, D7, A7, E7', 'Am7, Dm7, Em7', 'Cmaj7, Fmaj7'] },
      { title: 'Progresiones y canciones en cifrado', ready: true, topics: ['Progresiones típicas con pulso', 'Tus propias canciones: cargas los acordes y tocas'] },
      { title: 'Inversiones y cambios rápidos', ready: false, topics: ['Ejercicios de inversiones', 'Cambiar de acorde moviendo poco la mano'] },
    ],
  },
  {
    id: 'staff',
    title: 'Pentagrama y partituras',
    goal: 'Leer una partitura sencilla y tocarla, con la melodía en la mano derecha y los acordes en la izquierda.',
    units: [
      { title: 'Notas en clave de sol', ready: true, topics: ['El pentagrama y la clave de sol', 'Las 12 notas, del Do central al Sol agudo', 'Pasos, saltos y octavas'] },
      { title: 'Canciones en partitura', ready: true, topics: ['Melodías conocidas de dominio público', 'Acordes escritos sobre la melodía', 'Negras, blancas y corcheas'] },
      { title: 'El ritmo', ready: false, topics: ['Pulso y compás: 4/4 y 3/4', 'Corcheas y semicorcheas', 'Contar mientras tocas'] },
      { title: 'La clave de fa', ready: true, topics: ['Las 8 notas de la mano izquierda, del Do grave al Do central', 'El pentagrama doble del piano'] },
      { title: 'Patrones de mano izquierda', ready: false, topics: ['Arpegios', 'Patrón de vals'] },
      { title: 'Sostenidos y bemoles en el pentagrama', ready: false, topics: ['Alteraciones', 'Armaduras: tres sostenidos, tonalidades menores'] },
      { title: 'Notas fuera del pentagrama', ready: false, topics: ['Líneas adicionales por arriba', 'Cambios de octava'] },
      { title: 'Las dos manos leyendo', ready: false, topics: ['Manos separadas y luego juntas', 'Tus piezas meta, por secciones'] },
    ],
  },
];

// Las piezas que quieres llegar a leer y tocar, y lo que exige cada una.
export const GOALS = [
  {
    title: 'River Flows in You', by: 'Yiruma', chords: ['F#m', 'D', 'A', 'E'],
    needs: [
      { text: 'Acordes F#m, D, A y E, su progresión principal', track: 'chords', ready: true },
      { text: 'Leer las notas en clave de sol', track: 'staff', ready: true },
      { text: 'Leer las notas en clave de fa', track: 'staff', ready: true },
      { text: 'Mano izquierda en arpegios', track: 'staff', ready: false },
      { text: 'Armadura de tres sostenidos', track: 'staff', ready: false },
      { text: 'Corcheas y semicorcheas', track: 'staff', ready: false },
      { text: 'Notas agudas por encima del pentagrama', track: 'staff', ready: false },
    ],
  },
  {
    title: 'Once Upon a December', by: 'de la película Anastasia',
    needs: [
      { text: 'Acordes menores y séptimas', track: 'chords', ready: true },
      { text: 'Leer las notas en clave de sol', track: 'staff', ready: true },
      { text: 'Compás de 3/4 y ritmo de vals', track: 'staff', ready: false },
      { text: 'Leer las notas en clave de fa', track: 'staff', ready: true },
      { text: 'Mano izquierda con patrón de vals', track: 'staff', ready: false },
      { text: 'Tonalidad menor con alteraciones', track: 'staff', ready: false },
    ],
  },
];

// ---------- Teoría del camino de acordes ----------
// chord: acorde que se muestra en el teclado. key: una tecla suelta.

const CHORD_LESSONS = [
  {
    title: 'El cifrado: letras y nombres',
    body: [
      'Los acordes se escriben de dos formas. Con nombres: Do, Re, Mi. Con letras, el llamado cifrado americano: C, D, E.',
      'La equivalencia es fija: C es Do, D es Re, E es Mi, F es Fa, G es Sol, A es La y B es Si.',
      'Un truco para recordarlo: el abecedario empieza en La (A). Si cuentas A, B, C, llegas a Do en la C.',
    ],
    quiz: { q: '¿Qué nota es la letra F?', options: ['Fa', 'Sol', 'Mi'], answer: 0, why: 'C, D, E, F es Do, Re, Mi, Fa.' },
  },
  {
    title: 'Mayor y menor',
    body: [
      'Una letra o un nombre solo indica un acorde mayor: C es Do mayor y G es Sol mayor.',
      'Una m minúscula indica menor: Am es La menor y Dm es Re menor. Con nombres se escribe igual: Lam, Rem.',
      'El mayor suena abierto y luminoso; el menor, más oscuro. Toca C y después Am para comparar.',
    ],
    chord: 'Am',
    quiz: { q: '¿Qué acorde es Em?', options: ['Mi mayor', 'Mi menor', 'Re menor'], answer: 1, why: 'E es Mi, y la m minúscula indica menor.' },
  },
  {
    title: 'Los semitonos',
    body: [
      'Un semitono es la distancia entre una tecla y la que le sigue inmediatamente, sea blanca o negra.',
      'De Do a Re hay dos semitonos, porque en el medio hay una tecla negra. De Mi a Fa hay uno solo, porque no hay negra entre ellas. Lo mismo pasa entre Si y Do.',
      'Contar semitonos es la herramienta para armar cualquier acorde.',
    ],
    quiz: { q: '¿Cuántos semitonos hay de Mi a Fa?', options: ['Uno', 'Dos', 'Tres'], answer: 0, why: 'Entre Mi y Fa no hay tecla negra: son teclas vecinas.' },
  },
  {
    title: 'Cómo se arma un acorde mayor',
    body: [
      'Un acorde mayor tiene tres notas: la fundamental, que le da el nombre, la tercera y la quinta.',
      'La fórmula: desde la fundamental cuenta 4 semitonos para llegar a la tercera, y desde ahí 3 más para la quinta. Es decir, 4 + 3.',
      'Ejemplo con C: desde Do, cuatro semitonos llegan a Mi, y tres más llegan a Sol. Do, Mi, Sol.',
    ],
    chord: 'C',
    quiz: { q: 'Con la fórmula 4 + 3 desde Fa, ¿qué notas forman F?', options: ['Fa, La, Do', 'Fa, Sol, Do', 'Fa, La, Re'], answer: 0, why: 'Cuatro semitonos desde Fa llegan a La, y tres más llegan a Do.' },
  },
  {
    title: 'Cómo se arma un acorde menor',
    body: [
      'El menor invierte la fórmula: primero 3 semitonos y después 4. Es decir, 3 + 4.',
      'En la práctica solo cambia la nota del medio, que baja un semitono. C es Do, Mi, Sol; Cm es Do, Mi bemol, Sol.',
      'Por eso de cualquier acorde mayor puedes sacar su menor, y al revés.',
    ],
    chord: 'Cm',
    quiz: { q: '¿Qué nota cambia entre un acorde mayor y su menor?', options: ['La de abajo', 'La del medio', 'La de arriba'], answer: 1, why: 'La tercera, la nota del medio, baja un semitono.' },
  },
  {
    title: 'Sostenidos y bemoles',
    body: [
      'Las teclas negras no tienen nombre propio: toman el de una vecina. El sostenido (♯, escrito #) sube un semitono; el bemol (♭, escrito b) baja un semitono.',
      'La negra entre Fa y Sol puede llamarse Fa sostenido (F#) o Sol bemol (Gb). Es la misma tecla.',
      'En el cifrado, el símbolo va pegado a la letra, antes de todo lo demás: F#m es Fa sostenido menor y Bb es Si bemol mayor.',
    ],
    key: 66,
    quiz: { q: '¿Cómo se escribe Re sostenido menor?', options: ['Dm#', 'D#m', '#Dm'], answer: 1, why: 'Primero la letra, después el sostenido y al final la m de menor.' },
  },
  {
    title: 'Acordes con teclas negras',
    body: [
      'Al aplicar la fórmula aparecen teclas negras en acordes muy comunes. D es Re, Fa sostenido, La. A es La, Do sostenido, Mi. E es Mi, Sol sostenido, Si.',
      'No hace falta memorizarlos: cuenta 4 + 3 desde la fundamental y la tecla negra aparece sola.',
    ],
    chord: 'D',
    quiz: { q: '¿Qué notas forman A, La mayor?', options: ['La, Do, Mi', 'La, Do sostenido, Mi', 'La, Re, Mi'], answer: 1, why: 'Cuatro semitonos desde La llegan a Do sostenido. La, Do, Mi sería La menor.' },
  },
  {
    title: 'La séptima',
    body: [
      'Un 7 después del acorde agrega una cuarta nota: G7 es Sol, Si, Re y Fa.',
      'Esa nota está 3 semitonos por encima de la quinta. Dicho de otro modo, dos semitonos por debajo de la fundamental siguiente.',
      'El acorde con séptima suena inestable y pide resolver: G7 lleva naturalmente a C.',
    ],
    chord: 'G7',
    quiz: { q: '¿Qué nota se agrega a C (Do, Mi, Sol) para formar C7?', options: ['Si', 'Si bemol', 'La'], answer: 1, why: 'Tres semitonos por encima de Sol está Si bemol.' },
  },
  {
    title: 'Otras séptimas: maj7 y m7',
    body: [
      'Cmaj7 agrega la séptima mayor, que está un semitono por debajo de la fundamental siguiente: Do, Mi, Sol, Si. Suena suave y se usa mucho en baladas.',
      'Am7 es un acorde menor con séptima: La, Do, Mi, Sol.',
      'C7 y Cmaj7 no son lo mismo: C7 lleva Si bemol y Cmaj7 lleva Si.',
    ],
    chord: 'Cmaj7',
    quiz: { q: '¿Qué notas forman Am7?', options: ['La, Do, Mi, Sol', 'La, Do sostenido, Mi, Sol', 'La, Do, Mi, Sol sostenido'], answer: 0, why: 'La menor (La, Do, Mi) más la nota que está tres semitonos sobre Mi: Sol.' },
  },
  {
    title: 'Inversiones',
    body: [
      'Las notas de un acorde se pueden ordenar de otra forma sin que cambie el acorde. C puede tocarse Do-Mi-Sol, Mi-Sol-Do o Sol-Do-Mi.',
      'Sirven para cambiar de acorde moviendo poco la mano: después de C (Do-Mi-Sol), es más cómodo tocar F como Do-Fa-La que saltar hasta Fa-La-Do.',
      'En la práctica de la app puedes tocar las notas en cualquier orden y altura: lo que cuenta es que sean las correctas.',
    ],
    quiz: { q: 'Mi-Sol-Do, ¿qué acorde es?', options: ['C', 'Em', 'G'], answer: 0, why: 'Son las notas de Do mayor en otro orden.' },
  },
  {
    title: 'Progresiones',
    body: [
      'Las canciones repiten secuencias de acordes llamadas progresiones. Muchísimas canciones pop usan los mismos cuatro: C, G, Am y F.',
      'En la sección Canciones puedes practicar progresiones con un pulso que marca los cambios, y cargar los acordes de tus propias canciones.',
      'Al principio toca un acorde por compás y cambia justo en el primer pulso, aunque sea despacio.',
    ],
    quiz: { q: '¿Qué es una progresión?', options: ['Una secuencia de acordes que se repite', 'Un acorde de cuatro notas', 'Una forma de tocar más fuerte'], answer: 0, why: 'Es el orden en que se suceden los acordes de una canción.' },
  },
];

// Lecciones de teoría del camino de pentagrama, en este orden.
// staff: notas del ejemplo ({ key | keys, label, duration }).
const STAFF_LESSONS = [
  {
    title: 'El pentagrama',
    body: [
      'La música se escribe sobre cinco líneas paralelas llamadas pentagrama. Entre ellas quedan cuatro espacios.',
      'Las líneas y los espacios se cuentan siempre de abajo hacia arriba: la primera línea es la de más abajo.',
      'Cuanto más arriba está una nota en el pentagrama, más aguda suena y más a la derecha está su tecla.',
    ],
    staff: [{ key: 'e/4', label: '1.ª línea' }, { key: 'b/4', label: '3.ª línea' }, { key: 'f/5', label: '5.ª línea' }],
    quiz: {
      q: '¿Cuál es la primera línea del pentagrama?',
      options: ['La de más arriba', 'La del centro', 'La de más abajo'],
      answer: 2,
      why: 'Las líneas se cuentan de abajo hacia arriba.',
    },
  },
  {
    title: 'La clave de sol',
    body: [
      'El símbolo que abre el pentagrama es la clave. Indica qué nota corresponde a cada línea.',
      'La clave de sol enrosca su espiral alrededor de la segunda línea: esa línea es Sol. Desde ahí se deducen todas las demás.',
      'Se usa para las notas del centro del teclado hacia la derecha, las que normalmente toca la mano derecha.',
    ],
    staff: [{ key: 'g/4', label: 'Sol' }],
    quiz: {
      q: '¿Qué línea señala la clave de sol?',
      options: ['La primera línea', 'La segunda línea', 'La tercera línea'],
      answer: 1,
      why: 'La espiral de la clave rodea la segunda línea, que es Sol.',
    },
  },
  {
    title: 'El Do central',
    body: [
      'El Do central es el Do más cercano al centro del teclado. En un teclado de 61 teclas como el tuyo es el tercer Do contando desde la izquierda.',
      'Es más grave que la primera línea, así que no cabe en el pentagrama. Por eso se escribe con una línea corta propia, llamada línea adicional.',
      'Es tu punto de referencia: desde el Do central puedes ubicar cualquier otra nota.',
    ],
    staff: [{ key: 'c/4', label: 'Do central' }],
    keyboard: 60,
    quiz: {
      q: '¿Por qué el Do central lleva una línea corta propia?',
      options: ['Porque dura más que las otras notas', 'Porque queda por debajo de las cinco líneas', 'Porque se toca con la mano izquierda'],
      answer: 1,
      why: 'Es más grave que la primera línea, y la línea adicional extiende el pentagrama hacia abajo.',
    },
  },
  {
    title: 'La clave de fa',
    body: [
      'El piano usa dos claves. La clave de sol es para la mano derecha; la clave de fa, para la izquierda, con las notas graves.',
      'La clave de fa tiene dos puntos que encierran la cuarta línea: esa línea es Fa. Desde ahí se deducen las demás, igual que con el Sol en la otra clave.',
      'Atención: las mismas líneas y espacios nombran notas distintas en cada clave. Por eso se practican por separado.',
    ],
    clef: 'bass',
    staff: [{ key: 'f/3', label: 'Fa' }],
    quiz: {
      q: '¿Qué línea señalan los dos puntos de la clave de fa?',
      options: ['La segunda línea', 'La cuarta línea', 'La quinta línea'],
      answer: 1,
      why: 'Los dos puntos encierran la cuarta línea, que es Fa.',
    },
  },
  {
    title: 'Dónde se encuentran las dos manos',
    body: [
      'En una partitura de piano hay dos pentagramas unidos: arriba el de clave de sol y abajo el de clave de fa.',
      'El Do central queda justo en el medio. En clave de sol se escribe con una línea adicional por debajo; en clave de fa, con una línea adicional por encima. Es la misma tecla.',
      'Desde el Do central, la clave de fa baja: Si, La, Sol, Fa, hacia la izquierda del teclado.',
    ],
    clef: 'bass',
    staff: [{ key: 'c/4', label: 'Do central' }, { key: 'b/3', label: 'Si' }, { key: 'a/3', label: 'La' }, { key: 'g/3', label: 'Sol' }, { key: 'f/3', label: 'Fa' }],
    quiz: {
      q: 'El Do central escrito en clave de fa, ¿dónde va?',
      options: ['En una línea adicional por encima del pentagrama', 'En la primera línea', 'En el segundo espacio'],
      answer: 0,
      why: 'Es más agudo que la quinta línea de la clave de fa, así que lleva una línea adicional arriba.',
    },
  },
  {
    title: 'El orden de las notas',
    body: [
      'Las notas tienen siete nombres que se repiten: Do, Re, Mi, Fa, Sol, La, Si, y después otra vez Do.',
      'En el teclado son las teclas blancas, de izquierda a derecha. En el pentagrama, cada nota sube de una línea al espacio siguiente, o de un espacio a la línea siguiente.',
      'Por eso, si conoces una nota, puedes contar hasta cualquier otra: línea, espacio, línea, espacio.',
    ],
    staff: [{ key: 'c/4', label: 'Do' }, { key: 'd/4', label: 'Re' }, { key: 'e/4', label: 'Mi' }, { key: 'f/4', label: 'Fa' }, { key: 'g/4', label: 'Sol' }],
    quiz: {
      q: 'Si Mi está en la primera línea, ¿dónde va Fa?',
      options: ['En la segunda línea', 'En el primer espacio', 'Debajo de la primera línea'],
      answer: 1,
      why: 'Fa es la nota siguiente a Mi, así que ocupa el espacio que sigue a la primera línea.',
    },
  },
  {
    title: 'Las notas de las líneas',
    body: [
      'Las cinco líneas, de abajo hacia arriba, son Mi, Sol, Si, Re y Fa.',
      'Van saltando una nota: entre Mi y Sol queda Fa, que va en el espacio.',
      'No hace falta memorizar la lista de golpe. La práctica diaria las va fijando una por una.',
    ],
    staff: [{ key: 'e/4', label: 'Mi' }, { key: 'g/4', label: 'Sol' }, { key: 'b/4', label: 'Si' }, { key: 'd/5', label: 'Re' }, { key: 'f/5', label: 'Fa' }],
    quiz: {
      q: '¿Qué nota va en la tercera línea, la del centro?',
      options: ['Sol', 'Si', 'La'],
      answer: 1,
      why: 'Las líneas son Mi, Sol, Si, Re, Fa: la tercera es Si.',
    },
  },
  {
    title: 'Las notas de los espacios',
    body: [
      'Los cuatro espacios, de abajo hacia arriba, son Fa, La, Do y Mi.',
      'Junto con las líneas forman una escalera completa: Mi en línea, Fa en espacio, Sol en línea, La en espacio, y así hasta arriba.',
    ],
    staff: [{ key: 'f/4', label: 'Fa' }, { key: 'a/4', label: 'La' }, { key: 'c/5', label: 'Do' }, { key: 'e/5', label: 'Mi' }],
    quiz: {
      q: '¿Qué nota va en el segundo espacio?',
      options: ['La', 'Fa', 'Do'],
      answer: 0,
      why: 'Los espacios son Fa, La, Do, Mi: el segundo es La.',
    },
  },
  {
    title: 'Tus acordes en el pentagrama',
    body: [
      'Un acorde son varias notas que suenan a la vez. En el pentagrama se escriben una encima de otra.',
      'El acorde de Do tiene Do, Mi y Sol. Entre ellas siempre se salta una nota, así que quedan apiladas en tres líneas seguidas.',
      'El acorde de Fa tiene Fa, La y Do, y queda en tres espacios seguidos. Esa forma apilada es la de los acordes que ya tocas.',
    ],
    staff: [{ keys: ['c/4', 'e/4', 'g/4'], label: 'Do' }, { keys: ['f/4', 'a/4', 'c/5'], label: 'Fa' }],
    quiz: {
      q: '¿Cómo se ven en el pentagrama las tres notas del acorde de Fa?',
      options: ['En tres espacios seguidos', 'En tres líneas seguidas', 'Dos en líneas y una en un espacio'],
      answer: 0,
      why: 'Fa, La y Do ocupan el primer, segundo y tercer espacio.',
    },
  },
  {
    title: 'Pasos y saltos',
    body: [
      'Entre dos notas seguidas puede haber un paso o un salto.',
      'Paso: de una línea al espacio vecino, o al revés. En el teclado es la tecla blanca de al lado.',
      'Salto: de una línea a la línea siguiente, o de un espacio al espacio siguiente. En el teclado te saltas una tecla blanca.',
      'Leer así es más rápido que nombrar cada nota: ves la forma del movimiento y la mano la sigue.',
    ],
    staff: [{ key: 'e/4' }, { key: 'f/4', label: 'paso' }, { key: 'e/4' }, { key: 'g/4', label: 'salto' }],
    quiz: {
      q: 'De Mi (primera línea) a Sol (segunda línea) hay…',
      options: ['Un paso', 'Un salto', 'Ninguna diferencia'],
      answer: 1,
      why: 'De línea a línea se salta una nota: Fa queda en el medio.',
    },
  },
  {
    title: 'Las octavas',
    body: [
      'Como los nombres se repiten cada siete notas, hay varios Do, varios Re y así. La distancia entre un Do y el siguiente se llama octava.',
      'Suenan parecido, uno más agudo que el otro, y se escriben en lugares distintos: el Do central va en su línea adicional y el Do agudo, en el tercer espacio.',
      'En la práctica la app te pide la altura exacta, para que asocies cada lugar del pentagrama con una sola tecla.',
    ],
    staff: [{ key: 'c/4', label: 'Do central' }, { key: 'c/5', label: 'Do agudo' }],
    quiz: {
      q: '¿Dónde se escribe el Do que está una octava arriba del Do central?',
      options: ['En la tercera línea', 'En el tercer espacio', 'En el primer espacio'],
      answer: 1,
      why: 'Los espacios son Fa, La, Do, Mi: el Do agudo va en el tercero.',
    },
  },
  {
    title: 'Las notas guía',
    body: [
      'Quien lee con soltura no cuenta líneas en cada nota. Reconoce al instante unas pocas notas guía y mide desde ahí.',
      'Tres guías útiles: el Do central (línea adicional abajo), el Sol de la clave (segunda línea) y el Do agudo (tercer espacio).',
      'Cuando veas una nota que no reconoces, busca la guía más cercana y cuenta uno o dos pasos.',
    ],
    staff: [{ key: 'c/4', label: 'Do' }, { key: 'g/4', label: 'Sol' }, { key: 'c/5', label: 'Do' }],
    quiz: {
      q: 'Ves una nota un paso arriba del Sol de la segunda línea. ¿Cuál es?',
      options: ['Fa', 'La', 'Si'],
      answer: 1,
      why: 'Después de Sol viene La, en el segundo espacio.',
    },
  },
  {
    title: 'Lo que sigue: la duración',
    body: [
      'Hasta ahora viste dónde va cada nota, es decir, su altura. La otra mitad de la lectura es cuánto dura cada una.',
      'La forma de la nota indica su duración: la redonda (hueca, sin palo) dura cuatro pulsos; la blanca (hueca, con palo), dos; la negra (rellena, con palo), uno.',
      'En las frases de la práctica ya aparecen negras. En la sección Canciones ya puedes leer melodías con negras, blancas y corcheas.',
    ],
    staff: [{ key: 'b/4', duration: 'w', label: 'redonda' }, { key: 'b/4', duration: 'h', label: 'blanca' }, { key: 'b/4', duration: 'q', label: 'negra' }],
    quiz: {
      q: '¿Cuántos pulsos dura una blanca?',
      options: ['Uno', 'Dos', 'Cuatro'],
      answer: 1,
      why: 'La redonda dura cuatro, la blanca dos y la negra uno.',
    },
  },
];

export const LESSONS = { chords: CHORD_LESSONS, staff: STAFF_LESSONS };
export const TOTAL_LESSONS = CHORD_LESSONS.length + STAFF_LESSONS.length;

// ---------- Canciones ----------

// Progresiones para tocar con pulso. Cada acorde dura un compás de 4 tiempos.
export const PROGRESSIONS = [
  { id: 'p1', title: 'Los cuatro acordes del pop', chords: ['C', 'G', 'Am', 'F'], note: 'La secuencia más usada en el pop y el rock.' },
  { id: 'p2', title: 'La balada', chords: ['Am', 'F', 'C', 'G'], note: 'Los mismos cuatro acordes empezando por el menor: suena más melancólica.' },
  { id: 'p3', title: 'Los años 50', chords: ['C', 'Am', 'F', 'G'], note: 'Típica de las baladas clásicas.' },
  { id: 'p4', title: 'Tres acordes', chords: ['C', 'F', 'G', 'C'], note: 'Con solo tres acordes mayores se tocan cientos de canciones.' },
  { id: 'p5', title: 'Menor con séptima', chords: ['Dm', 'G7', 'C', 'Am'], note: 'G7 pide resolver en C: escúchalo.' },
  { id: 'p6', title: 'La progresión de River Flows in You', chords: ['F#m', 'D', 'A', 'E'], note: 'Los cuatro acordes sobre los que está construida tu primera pieza meta.' },
  { id: 'p8', title: 'Vals en menor', chords: ['Am', 'Dm', 'E7', 'Am'], beats: 3, note: 'En 3/4: un bajo y dos acordes por compás, como en un vals.' },
  { id: 'p9', title: 'Con teclas negras', chords: ['D', 'A', 'Bm', 'G'], note: 'Los cuatro acordes del pop, un tono más arriba.' },
  { id: 'p7', title: 'Ocho compases', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], note: 'Una secuencia larga, muy usada en música clásica y en baladas.' },
];

// Melodías de dominio público. n: nota (letra + octava), d: duración
// (w redonda, h blanca, hd blanca con puntillo, q negra, qd negra con puntillo, 8 corchea).
// c: acorde que empieza en esa nota. '|' separa compases.
function melody(text) {
  const bars = text.trim().split('|').map((bar) => bar.trim().split(/\s+/).filter(Boolean).map((tok) => {
    const [n, d, c] = tok.split(':');
    const pc = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[n[0]];
    const octave = Number(n[1]);
    return { key: `${n[0]}/${octave}`, midi: 12 * (octave + 1) + pc, dur: d, chord: c || null };
  }));
  return bars;
}

export const SONGS = [
  {
    id: 's1', title: 'Claro de luna (Au clair de la lune)', by: 'Tradicional francesa', time: '4/4',
    bars: melody('c4:q:C c4:q c4:q d4:q | e4:h d4:h:G | c4:q:C e4:q d4:q:G d4:q | c4:w:C'),
  },
  {
    id: 's2', title: 'Oda a la alegría', by: 'Ludwig van Beethoven', time: '4/4',
    bars: melody(`e4:q:C e4:q f4:q g4:q | g4:q:G f4:q e4:q d4:q | c4:q:C c4:q d4:q e4:q | e4:qd:G d4:8 d4:h |
      e4:q:C e4:q f4:q g4:q | g4:q:G f4:q e4:q d4:q | c4:q:C c4:q d4:q e4:q | d4:qd:G c4:8 c4:h:C`),
  },
  {
    id: 's3', title: 'Estrellita, ¿dónde estás?', by: 'Tradicional', time: '4/4',
    bars: melody(`c4:q:C c4:q g4:q g4:q | a4:q:F a4:q g4:h:C | f4:q:F f4:q e4:q:C e4:q | d4:q:G d4:q c4:h:C |
      g4:q:C g4:q f4:q:F f4:q | e4:q:C e4:q d4:h:G | g4:q:C g4:q f4:q:F f4:q | e4:q:C e4:q d4:h:G |
      c4:q:C c4:q g4:q g4:q | a4:q:F a4:q g4:h:C | f4:q:F f4:q e4:q:C e4:q | d4:q:G d4:q c4:h:C`),
  },
  {
    id: 's4', title: 'Jingle Bells (estribillo)', by: 'James Lord Pierpont', time: '4/4',
    bars: melody(`e4:q:C e4:q e4:h | e4:q e4:q e4:h | e4:q g4:q c4:qd d4:8 | e4:w |
      f4:q:F f4:q f4:qd f4:8 | f4:q:C e4:q e4:q e4:8 e4:8 | e4:q:G d4:q d4:q e4:q | d4:h g4:h`),
  },
  {
    id: 's5', title: 'Cumpleaños feliz', by: 'Tradicional', time: '3/4',
    bars: melody(`g4:8 g4:8 | a4:q:C g4:q c5:q | b4:h:G g4:8 g4:8 | a4:q g4:q d5:q | c5:h:C g4:8 g4:8 |
      g5:q e5:q c5:q | b4:q:F a4:q f5:8 f5:8 | e5:q:C c5:q d5:q:G | c5:hd:C`),
  },
];

// ---------- Logros ----------
// Cada logro se cumple cuando un contador (key) llega a su meta (target).
export const ACHIEVEMENTS = [
  { id: 'first', icon: 'star', title: 'Primera clase', text: 'Completar tu primera sesión.', key: 'sessions', target: 1, unit: ['sesión', 'sesiones'] },
  { id: 's3', icon: 'flame', title: 'Tres seguidos', text: 'Practicar 3 días seguidos.', key: 'streak', target: 3, unit: ['día', 'días'] },
  { id: 's7', icon: 'flame', title: 'Una semana entera', text: 'Practicar 7 días seguidos.', key: 'streak', target: 7, unit: ['día', 'días'] },
  { id: 's14', icon: 'flame', title: 'Dos semanas', text: 'Practicar 14 días seguidos.', key: 'streak', target: 14, unit: ['día', 'días'] },
  { id: 's30', icon: 'flame', title: 'Un mes de piano', text: 'Practicar 30 días seguidos.', key: 'streak', target: 30, unit: ['día', 'días'] },
  { id: 'perfect', icon: 'check', title: 'Clase perfecta', text: 'Una sesión completa con todo al primer intento.', key: 'perfect', target: 1, unit: ['sesión perfecta', 'sesiones perfectas'] },
  { id: 'known', icon: 'keys', title: 'Básicos firmes', text: 'Tus seis acordes básicos, firmes.', key: 'knownFirm', target: 6, unit: ['acorde', 'acordes'] },
  { id: 'river', icon: 'target', title: 'Los acordes de River', text: 'F#m, D, A y E firmes: la progresión de River Flows in You.', key: 'riverFirm', target: 4, unit: ['acorde', 'acordes'] },
  { id: 'chords15', icon: 'keys', title: 'Quince acordes', text: 'Quince acordes firmes.', key: 'chordsFirm', target: 15, unit: ['acorde', 'acordes'] },
  { id: 'treble6', icon: 'staff', title: 'Media clave de sol', text: 'Seis notas firmes en clave de sol.', key: 'trebleFirm', target: 6, unit: ['nota', 'notas'] },
  { id: 'treble12', icon: 'staff', title: 'Clave de sol completa', text: 'Las doce notas de la mano derecha, firmes.', key: 'trebleFirm', target: 12, unit: ['nota', 'notas'] },
  { id: 'bass4', icon: 'staff', title: 'Mano izquierda despierta', text: 'Cuatro notas firmes en clave de fa.', key: 'bassFirm', target: 4, unit: ['nota', 'notas'] },
  { id: 'bass8', icon: 'staff', title: 'Clave de fa completa', text: 'Las ocho notas de la mano izquierda, firmes.', key: 'bassFirm', target: 8, unit: ['nota', 'notas'] },
  { id: 'theory10', icon: 'book', title: 'Teoría al día', text: 'Diez lecciones de teoría completadas.', key: 'lessons', target: 10, unit: ['lección', 'lecciones'] },
  { id: 'theoryAll', icon: 'book', title: 'Toda la teoría', text: 'Todas las lecciones completadas.', key: 'lessons', target: TOTAL_LESSONS, unit: ['lección', 'lecciones'] },
  { id: 'song1', icon: 'songs', title: 'Primera canción limpia', text: 'Tocar una melodía completa sin errores.', key: 'cleanSongs', target: 1, unit: ['canción', 'canciones'] },
  { id: 'song5', icon: 'songs', title: 'Repertorio', text: 'Las cinco melodías sin errores.', key: 'cleanSongs', target: 5, unit: ['canción', 'canciones'] },
  { id: 'hour', icon: 'bolt', title: 'Una hora de piano', text: 'Sumar 60 minutos de práctica.', key: 'minutes', target: 60, unit: ['minuto', 'minutos'] },
];
