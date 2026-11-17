// Melodía de apertura: una frase corta y original de piano, generada en el momento
// con Web Audio (no usa archivos de sonido). Tonalidad de La menor, tranquila.

let ctx = null;
let master = null;

const A4 = 440;
const hz = (midi) => A4 * Math.pow(2, (midi - 69) / 12);

// Una nota con timbre parecido a un piano: varios armónicos que se apagan solos,
// los agudos más rápido que los graves.
function pianoNote(ac, dest, midi, when, velocity = 0.5, length = 2.4) {
  const f = hz(midi);
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(velocity, when + 0.008);
  out.gain.exponentialRampToValueAtTime(velocity * 0.45, when + 0.18);
  out.gain.exponentialRampToValueAtTime(0.0001, when + length);

  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(Math.min(6000, f * 7), when);
  tone.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2), when + length * 0.7);
  tone.connect(out);
  out.connect(dest);

  const partials = [[1, 1, 'sine'], [2, 0.42, 'sine'], [3, 0.18, 'sine'], [4, 0.08, 'sine'], [1.003, 0.35, 'triangle']];
  for (const [mult, level, type] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = f * mult;
    g.gain.value = level;
    osc.connect(g);
    g.connect(tone);
    osc.start(when);
    osc.stop(when + length + 0.05);
  }
}

// Sala: una reverberación suave hecha con ruido que se apaga.
function makeReverb(ac, seconds = 2.6) {
  const len = Math.floor(ac.sampleRate * seconds);
  const impulse = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
  }
  const conv = ac.createConvolver();
  conv.buffer = impulse;
  return conv;
}

// La frase: mano izquierda en arpegios (La menor, Fa, Do) y una melodía sencilla
// arriba, que termina en un acorde de Do con novena, abierto y suave.
// Cada entrada: [tiempo en pulsos, nota MIDI, intensidad, duración en segundos].
const BEAT = 0.42;
const PHRASE = [
  // La menor
  [0, 45, 0.5, 3.2], [0.5, 57, 0.3, 2.4], [1, 64, 0.3, 2.4], [1.5, 69, 0.32, 2.4],
  [0, 76, 0.55, 2.8], [2, 72, 0.4, 2.2], [3, 74, 0.42, 2.2],
  // Fa
  [4, 41, 0.5, 3.2], [4.5, 53, 0.28, 2.4], [5, 60, 0.3, 2.4], [5.5, 65, 0.3, 2.4],
  [4, 72, 0.5, 2.8], [6, 69, 0.4, 2.2], [7, 72, 0.42, 2.2],
  // Do
  [8, 48, 0.5, 3.4], [8.5, 55, 0.28, 2.6], [9, 64, 0.3, 2.6], [9.5, 67, 0.3, 2.6],
  [8, 76, 0.55, 3], [10, 79, 0.5, 2.6], [11, 76, 0.4, 2.4],
  // Cierre: Do con novena, de abajo hacia arriba
  [12, 36, 0.5, 5], [12.25, 55, 0.3, 4.6], [12.5, 64, 0.32, 4.6], [12.75, 67, 0.32, 4.6], [13, 74, 0.4, 4.6], [13.4, 76, 0.5, 4.8],
];

export const INTRO_SECONDS = 13.4 * BEAT + 4.8;

// Programa la frase en cualquier contexto de audio (el real o uno de prueba).
export function scheduleIntro(ac, dest, start) {
  const dry = ac.createGain();
  dry.gain.value = 0.8;
  const wet = ac.createGain();
  wet.gain.value = 0.3;
  const reverb = makeReverb(ac);
  dry.connect(dest);
  reverb.connect(wet);
  wet.connect(dest);
  const bus = ac.createGain();
  bus.connect(dry);
  bus.connect(reverb);
  for (const [beat, midi, vel, len] of PHRASE) pianoNote(ac, bus, midi, start + beat * BEAT, vel * 0.5, len);
}

// Intenta tocar la melodía. Devuelve true si empezó a sonar. Los teléfonos solo
// permiten sonido después de un toque, así que sin toque previo puede devolver false.
export async function playIntro() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!ctx) ctx = new Ctx();
    if (ctx.state !== 'running') {
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 250))]);
    }
    if (ctx.state !== 'running') return false;
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    scheduleIntro(ctx, master, ctx.currentTime + 0.08);
    return true;
  } catch (e) {
    return false;
  }
}

// Apaga la melodía con un fundido corto (por ejemplo, al empezar una sesión con micrófono).
export function stopIntro() {
  try {
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      const old = ctx;
      ctx = null;
      master = null;
      setTimeout(() => old.close().catch(() => {}), 500);
    }
  } catch (e) {
    /* nada que apagar */
  }
}
