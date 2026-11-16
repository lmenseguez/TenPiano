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

// Cuántas notas se presentan en la primera sesión.
export const FIRST_SESSION_NOTES = 3;

// Días hasta el próximo repaso según el nivel de dominio (0 a 5).
export const INTERVALS = [0, 1, 2, 4, 7, 14];
export const MAX_BOX = 5;

// Una respuesta cuenta como fluida si llega antes de este tiempo.
export const FLUENT_MS = 4000;

// ---------- Plan de aprendizaje ----------

export const SESSION_PARTS = [
  { title: 'Teoría', time: '2 a 3 min', text: 'Una lección corta con un ejemplo y una pregunta para comprobar que quedó clara.' },
  { title: 'Repaso', time: '2 min', text: 'Las notas que ya conoces. Las que más te cuestan aparecen más seguido.' },
  { title: 'Nota nueva', time: '3 min', text: 'Una sola nota por sesión, y solo cuando las anteriores están firmes.' },
  { title: 'Frases', time: '2 a 3 min', text: 'Grupos de cuatro notas para leer de corrido, como en una partitura real.' },
];

export const STAGES = [
  {
    id: 1, ready: true,
    title: 'Las notas en clave de sol',
    goal: 'Ver una nota en el pentagrama y tocarla sin pensar, con la mano derecha.',
    topics: ['El pentagrama y la clave de sol', 'Las 12 notas, del Do central al Sol agudo', 'Pasos, saltos y octavas', 'Cómo se escriben los acordes que ya tocas'],
  },
  {
    id: 2, ready: false,
    title: 'El ritmo',
    goal: 'Tocar cada nota con su duración, llevando el pulso.',
    topics: ['Pulso y compás', 'Redondas, blancas y negras', 'Silencios', 'Contar en voz alta mientras tocas'],
  },
  {
    id: 3, ready: false,
    title: 'La clave de fa',
    goal: 'Leer las notas de la mano izquierda.',
    topics: ['La clave de fa', 'Las notas del Do central hacia abajo', 'El pentagrama doble del piano'],
  },
  {
    id: 4, ready: false,
    title: 'Melodías a primera vista',
    goal: 'Leer una melodía corta que nunca viste y tocarla sin detenerte.',
    topics: ['Notas y ritmo a la vez', 'Mirar un compás adelante', 'Melodías nuevas cada día'],
  },
  {
    id: 5, ready: false,
    title: 'Las dos manos',
    goal: 'Tocar una canción leyendo: melodía en la derecha y acordes en la izquierda.',
    topics: ['Manos separadas y luego juntas', 'Acordes escritos en el pentagrama', 'Canciones conocidas como meta'],
  },
  {
    id: 6, ready: false,
    title: 'Más recursos',
    goal: 'Ampliar lo que puedes leer y tocar.',
    topics: ['Corcheas', 'Sostenidos y bemoles', 'Inversiones de acordes', 'Arpegios'],
  },
];

// Lecciones de teoría de la etapa 1. Una por sesión, en este orden.
// staff: notas del ejemplo ({ key | keys, label, duration }).
export const LESSONS = [
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
    title: 'Las letras de los acordes',
    body: [
      'Los acordes suelen escribirse con letras: C, F, G, Am. Son las mismas notas con otro nombre.',
      'C es Do, D es Re, E es Mi, F es Fa, G es Sol, A es La y B es Si.',
      'Una letra sola indica un acorde mayor: C es Do mayor. Con una m minúscula es menor: Am es La menor.',
    ],
    quiz: {
      q: '¿Qué acorde es G?',
      options: ['Sol mayor', 'Mi mayor', 'La mayor'],
      answer: 0,
      why: 'La letra G corresponde a Sol.',
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
      'En las frases de la práctica ya aparecen negras. En la etapa siguiente vas a aprender a contar y a tocar con ritmo.',
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
