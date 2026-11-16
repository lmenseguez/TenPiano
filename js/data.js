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
