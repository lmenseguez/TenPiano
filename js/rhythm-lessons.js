// Lecciones de teoría sobre el ritmo. Misma forma que las demás lecciones de la app:
// staff es el ejemplo que se dibuja (un compás sobre la tercera línea) y label,
// la sílaba con la que se cuenta cada nota.
export const RHYTHM_LESSONS = [
  {
    title: 'El pulso y el compás',
    body: [
      'Toda música tiene un pulso: un latido regular, como el tictac de un reloj. Es lo que marcas cuando sigues una canción con el pie.',
      'Los pulsos se agrupan en compases. En la partitura, cada compás queda separado del siguiente por una línea vertical llamada barra de compás.',
      'Los dos números del comienzo indican el compás. En 4/4 hay cuatro pulsos por compás: se cuentan 1, 2, 3, 4 y se vuelve a empezar.',
    ],
    staff: [
      { key: 'b/4', duration: 'q', label: '1' },
      { key: 'b/4', duration: 'q', label: '2' },
      { key: 'b/4', duration: 'q', label: '3' },
      { key: 'b/4', duration: 'q', label: '4' },
    ],
    quiz: {
      q: '¿Cuántos pulsos tiene un compás de 4/4?',
      options: ['Dos', 'Tres', 'Cuatro'],
      answer: 2,
      why: 'En 4/4 cada compás tiene cuatro pulsos: 1, 2, 3, 4.',
    },
  },
  {
    title: 'Contar negras, blancas y redondas',
    body: [
      'La forma de cada nota indica cuánto dura. La negra dura un pulso, la blanca dura dos y la redonda dura cuatro: un compás entero de 4/4.',
      'Para no perderte, cuenta en voz alta «1, 2, 3, 4» sin detenerte. La cuenta sigue igual aunque la nota sea larga.',
      'En el ejemplo, la blanca se toca en el 1 y se mantiene durante el 2. Después vienen dos negras, en el 3 y en el 4.',
    ],
    staff: [
      { key: 'b/4', duration: 'h', label: '1' },
      { key: 'b/4', duration: 'q', label: '3' },
      { key: 'b/4', duration: 'q', label: '4' },
    ],
    quiz: {
      q: '¿Cuántos pulsos dura una blanca?',
      options: ['Dos pulsos', 'Un pulso', 'Cuatro pulsos'],
      answer: 0,
      why: 'La blanca dura dos pulsos: el doble que una negra y la mitad que una redonda.',
    },
  },
  {
    title: 'Las corcheas',
    body: [
      'La corchea dura medio pulso: en el tiempo de una negra caben dos corcheas.',
      'Para contarlas se agrega una «y» entre los números: «1 y 2 y 3 y 4 y». Los números caen sobre el pulso y cada «y», justo en la mitad.',
      'Una corchea sola lleva un corchete, una pequeña cola en la plica. Cuando van seguidas, suelen unirse con una barra para que se lean más fácil.',
    ],
    staff: [
      { key: 'b/4', duration: '8', label: '1' },
      { key: 'b/4', duration: '8', label: 'y' },
      { key: 'b/4', duration: '8', label: '2' },
      { key: 'b/4', duration: '8', label: 'y' },
      { key: 'b/4', duration: 'q', label: '3' },
      { key: 'b/4', duration: 'q', label: '4' },
    ],
    quiz: {
      q: '¿Cuántas corcheas caben en un pulso?',
      options: ['Una', 'Dos', 'Cuatro'],
      answer: 1,
      why: 'Cada corchea dura medio pulso, así que caben dos: una en el número y otra en la «y».',
    },
  },
  {
    title: 'El compás de 3/4',
    body: [
      'En el compás de 3/4 hay tres pulsos por compás: se cuenta «1, 2, 3» y se vuelve a empezar.',
      'El primer pulso es el más fuerte y los otros dos son suaves: fuerte, suave, suave. Es el balanceo típico del vals.',
      'Una redonda no cabe en este compás. Para llenarlo con una sola nota se usa la blanca con puntillo, que dura tres pulsos.',
    ],
    staff: [
      { key: 'b/4', duration: 'q', label: '1' },
      { key: 'b/4', duration: 'q', label: '2' },
      { key: 'b/4', duration: 'q', label: '3' },
    ],
    quiz: {
      q: '¿Qué nota llena sola un compás de 3/4?',
      options: ['La redonda', 'La blanca', 'La blanca con puntillo'],
      answer: 2,
      why: 'La blanca con puntillo dura tres pulsos, justo lo que mide un compás de 3/4.',
    },
  },
  {
    title: 'El puntillo',
    body: [
      'El puntillo es un punto pequeño a la derecha de la nota. Le suma la mitad de lo que dura.',
      'Una negra dura un pulso; con puntillo dura un pulso y medio. Una blanca dura dos pulsos; con puntillo dura tres.',
      'Después de una negra con puntillo casi siempre viene una corchea, que completa los dos pulsos. Se cuenta «1, (2), y»: la corchea cae en la «y» del segundo pulso.',
    ],
    staff: [
      { key: 'b/4', duration: 'qd', label: '1' },
      { key: 'b/4', duration: '8', label: 'y' },
      { key: 'b/4', duration: 'q', label: '3' },
      { key: 'b/4', duration: 'q', label: '4' },
    ],
    quiz: {
      q: '¿Cuánto dura una negra con puntillo?',
      options: ['Un pulso y medio', 'Dos pulsos', 'Medio pulso'],
      answer: 0,
      why: 'El puntillo suma la mitad: un pulso de la negra más medio pulso.',
    },
  },
  {
    title: 'Las semicorcheas',
    body: [
      'La semicorchea dura un cuarto de pulso: en el tiempo de una negra caben cuatro.',
      'Se cuentan «1 e y a, 2 e y a». El número cae sobre el pulso, la «y» en la mitad, y la «e» y la «a» en los espacios que quedan.',
      'Se reconocen porque llevan dos corchetes o, cuando van agrupadas, dos barras. Empieza lento: lo importante es que las cuatro suenen parejas.',
    ],
    staff: [
      { key: 'b/4', duration: '16', label: '1' },
      { key: 'b/4', duration: '16', label: 'e' },
      { key: 'b/4', duration: '16', label: 'y' },
      { key: 'b/4', duration: '16', label: 'a' },
      { key: 'b/4', duration: 'q', label: '2' },
      { key: 'b/4', duration: 'q', label: '3' },
      { key: 'b/4', duration: 'q', label: '4' },
    ],
    quiz: {
      q: '¿Cuántas semicorcheas caben en un pulso?',
      options: ['Dos', 'Cuatro', 'Ocho'],
      answer: 1,
      why: 'Cada semicorchea dura un cuarto de pulso, así que caben cuatro: «1 e y a».',
    },
  },
];
