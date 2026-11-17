// Detección de tono con el algoritmo YIN.
// Recibe un bloque de audio (Float32Array) y devuelve la frecuencia
// fundamental estimada, o null si no hay un tono claro.

export const NOTE_NAMES_ES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiName(midi) {
  return NOTE_NAMES_ES[((midi % 12) + 12) % 12];
}

export function rms(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

export class PitchDetector {
  constructor(sampleRate, { minFreq = 110, maxFreq = 1250, threshold = 0.15, looseThreshold = 0.4 } = {}) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
    this.looseThreshold = looseThreshold;
    this.tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
    this.tauMax = Math.ceil(sampleRate / minFreq);
    this.yin = new Float32Array(this.tauMax + 2);
  }

  // Devuelve { freq, clarity } o null.
  detect(buffer) {
    const tauMax = Math.min(this.tauMax, Math.floor(buffer.length / 2) - 1);
    const win = buffer.length - tauMax - 1;
    if (win < 256) return null;
    const yin = this.yin;

    // Función de diferencia.
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      let sum = 0;
      for (let i = 0; i < win; i++) {
        const d = buffer[i] - buffer[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }

    // Diferencia normalizada acumulada.
    yin[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      running += yin[tau];
      yin[tau] = running === 0 ? 1 : (yin[tau] * tau) / running;
    }

    // Primer mínimo por debajo del umbral.
    let tau = -1;
    for (let t = this.tauMin; t <= tauMax; t++) {
      if (yin[t] < this.threshold) {
        while (t + 1 <= tauMax && yin[t + 1] < yin[t]) t++;
        tau = t;
        break;
      }
    }

    // Si la señal es débil o ruidosa puede no bajar del umbral: se acepta el
    // primer mínimo local cercano al mínimo global, si es razonablemente claro.
    if (tau === -1) {
      let best = Infinity;
      for (let t = this.tauMin; t <= tauMax; t++) if (yin[t] < best) best = yin[t];
      if (best > this.looseThreshold) return null;
      for (let t = this.tauMin + 1; t < tauMax; t++) {
        if (yin[t] <= best + 0.05 && yin[t] <= yin[t - 1] && yin[t] <= yin[t + 1]) {
          tau = t;
          break;
        }
      }
      if (tau === -1) return null;
    }

    // Interpolación parabólica para afinar el resultado.
    const a = yin[tau - 1];
    const b = yin[tau];
    const c = yin[tau + 1];
    const denom = a + c - 2 * b;
    const shift = denom !== 0 ? (a - c) / (2 * denom) : 0;
    const refined = tau + (Math.abs(shift) < 1 ? shift : 0);

    return { freq: this.sampleRate / refined, clarity: 1 - b };
  }
}

// Convierte la secuencia de detecciones en eventos de "nota tocada".
//
// Cuando se toca una tecla mientras la anterior todavía suena, los dos sonidos
// se mezclan un instante y la lectura salta entre ambas notas (o da una tercera
// que no existe). Para que eso no genere notas falsas:
//  - cada nota aceptada necesita un ataque: una subida brusca de volumen;
//  - cada ataque sirve para una sola nota;
//  - la nota que la app espera se confirma rápido, y cualquier otra necesita
//    sostenerse más tiempo antes de contarse.
export class NoteTracker {
  constructor({ gate = 0.004, windowMs = 340, votes = 4, strictVotes = 7, strictSpanMs = 230, onsetRatio = 1.22, onsetLifeMs = 700 } = {}) {
    this.gate = gate;
    this.windowMs = windowMs;
    this.votes = votes;
    this.strictVotes = strictVotes;
    this.strictSpanMs = strictSpanMs;
    this.onsetRatio = onsetRatio;
    this.onsetLifeMs = onsetLifeMs;
    this.history = []; // { midi, t }
    this.levels = []; // volumen de los últimos cuadros
    this.quiet = 0;
    this.inAttack = false;
    this.prevLevel = 0;
    this.onsetAt = -Infinity; // momento del último ataque
    this.fired = new Set(); // notas ya aceptadas con este ataque
    this.carry = null; // nota que ya sonaba cuando llegó el ataque
    this.lastMidi = null;
    this.current = null; // nota que se oye ahora mismo
    this.expected = null; // (midi) => boolean: lo que la app espera oír, o null
  }

  // Devuelve un número MIDI cuando se confirma una nota nueva; si no, null.
  push(result, level, now) {
    // Ataque: el volumen sube con claridad respecto del mínimo reciente.
    // Cuenta una sola vez por tecla: mientras el volumen sigue subiendo es el mismo ataque.
    const floor = this.levels.length ? Math.min(...this.levels) : 0;
    if (this.inAttack) {
      if (level < this.prevLevel) {
        this.inAttack = false;
        this.levels = []; // desde el pico, el mínimo de referencia vuelve a empezar
      }
    } else if (level >= this.gate && level > Math.max(floor, this.gate * 0.5) * this.onsetRatio) {
      this.inAttack = true;
      this.onsetAt = now;
      this.fired.clear();
      this.carry = this.current;
      this.history.length = 0; // lo anterior al ataque no vota por la nota nueva
    }
    this.prevLevel = level;
    this.levels.push(level);
    if (this.levels.length > 5) this.levels.shift();

    if (level < this.gate) {
      this.quiet += 1;
      if (this.quiet >= 2) {
        this.history.length = 0;
        this.current = null;
      }
      return null;
    }
    this.quiet = 0;

    let midi = null;
    if (result) {
      const midiFloat = freqToMidi(result.freq);
      const rounded = Math.round(midiFloat);
      // Lo muy desafinado suele ser ruido, voz o dos notas mezcladas.
      if (Math.abs(midiFloat - rounded) <= 0.4) midi = rounded;
    }
    this.history.push({ midi, t: now });
    while (this.history.length && now - this.history[0].t > this.windowMs) this.history.shift();

    // Nota más votada en la ventana reciente.
    const counts = new Map();
    for (const h of this.history) {
      if (h.midi === null) continue;
      const c = counts.get(h.midi) || { n: 0, first: h.t, last: h.t };
      c.n += 1;
      c.last = h.t;
      counts.set(h.midi, c);
    }
    let winner = null;
    let top = { n: 0 };
    for (const [m, c] of counts) if (c.n > top.n) { top = c; winner = m; }
    if (top.n < this.votes) return null;
    this.current = winner;

    // Sin un ataque reciente no hay nota nueva: es la cola de la anterior.
    if (now - this.onsetAt > this.onsetLifeMs || this.fired.has(winner)) return null;

    // Una nota que la app no espera tiene que sostenerse más para contar, y nunca
    // cuenta si es la que ya venía sonando antes del ataque.
    if (this.expected && !this.expected(winner)) {
      if (winner === this.carry) return null;
      if (top.n < this.strictVotes || top.last - top.first < this.strictSpanMs) return null;
    }

    this.fired.add(winner); // cada ataque acepta una nota una sola vez
    this.lastMidi = winner;
    return winner;
  }
}

// Estima el ruido de fondo para fijar a partir de qué volumen se escucha.
export class NoiseFloor {
  constructor({ size = 150, min = 0.0008, max = 0.012, factor = 2.2 } = {}) {
    this.levels = [];
    this.size = size;
    this.min = min;
    this.max = max;
    this.factor = factor;
  }

  // Recibe el volumen actual y devuelve el umbral recomendado.
  update(level) {
    this.levels.push(level);
    if (this.levels.length > this.size) this.levels.shift();
    const sorted = [...this.levels].sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * 0.15)];
    return Math.min(this.max, Math.max(this.min, floor * this.factor));
  }
}
