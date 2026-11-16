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
// Vota entre las últimas lecturas (tolera lecturas sueltas fallidas) y exige
// un ataque nuevo antes de aceptar otra vez la misma nota.
export class NoteTracker {
  constructor({ gate = 0.004, windowMs = 260, votes = 4 } = {}) {
    this.gate = gate;
    this.windowMs = windowMs;
    this.votes = votes;
    this.history = []; // { midi, t }
    this.quiet = 0;
    this.armed = true;
    this.lastMidi = null;
    this.levelAtFire = 0;
    this.minSinceFire = 0;
    this.current = null; // nota que se oye ahora mismo
  }

  // Devuelve un número MIDI cuando se confirma una nota nueva; si no, null.
  push(result, level, now) {
    if (level < this.gate) {
      this.quiet += 1;
      if (this.quiet >= 2) {
        this.armed = true;
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
      // Lo muy desafinado suele ser ruido o voz.
      if (Math.abs(midiFloat - rounded) <= 0.4) midi = rounded;
    }
    this.history.push({ midi, t: now });
    while (this.history.length && now - this.history[0].t > this.windowMs) this.history.shift();

    // Nota más votada en la ventana reciente.
    const counts = new Map();
    for (const h of this.history) if (h.midi !== null) counts.set(h.midi, (counts.get(h.midi) || 0) + 1);
    let winner = null;
    let top = 0;
    for (const [m, c] of counts) if (c > top) { top = c; winner = m; }
    if (top < this.votes) return null;
    this.current = winner;

    if (!this.armed) {
      this.minSinceFire = Math.min(this.minSinceFire, level);
      if (winner !== this.lastMidi) {
        this.armed = true;
      } else if (this.minSinceFire < this.levelAtFire * 0.5 && level > this.minSinceFire * 1.6) {
        this.armed = true; // misma tecla, tocada otra vez
      }
    }

    if (this.armed) {
      this.armed = false;
      this.lastMidi = winner;
      this.levelAtFire = level;
      this.minSinceFire = level;
      return winner;
    }
    return null;
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
