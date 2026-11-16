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
  constructor(sampleRate, { minFreq = 110, maxFreq = 1250, threshold = 0.15 } = {}) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
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
    if (tau === -1) return null;

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
// Exige que la misma nota se mantenga unos instantes y que haya un
// ataque nuevo antes de aceptar la siguiente.
export class NoteTracker {
  constructor({ holdMs = 110, gate = 0.008 } = {}) {
    this.holdMs = holdMs;
    this.gate = gate;
    this.candidate = null;
    this.candidateSince = 0;
    this.armed = true;
    this.lastMidi = null;
    this.levelAtFire = 0;
    this.current = null; // nota que se oye ahora mismo (para la pantalla de prueba)
  }

  // Devuelve un número MIDI cuando se confirma una nota nueva; si no, null.
  push(result, level, now) {
    if (level < this.gate || !result) {
      this.candidate = null;
      if (level < this.gate) {
        this.armed = true;
        this.current = null;
      }
      return null;
    }

    const midiFloat = freqToMidi(result.freq);
    const midi = Math.round(midiFloat);
    // Descarta lo que esté muy desafinado: suele ser ruido o voz.
    if (Math.abs(midiFloat - midi) > 0.4) {
      this.candidate = null;
      return null;
    }
    this.current = midi;

    // Rearma si cambia la nota o si el volumen cayó y volvió a subir (misma tecla otra vez).
    if (!this.armed) {
      this.minSinceFire = Math.min(this.minSinceFire, level);
      if (midi !== this.lastMidi) {
        this.armed = true;
      } else if (this.minSinceFire < this.levelAtFire * 0.5 && level > this.minSinceFire * 1.6) {
        this.armed = true;
      }
    }

    if (midi !== this.candidate) {
      this.candidate = midi;
      this.candidateSince = now;
      return null;
    }

    if (this.armed && now - this.candidateSince >= this.holdMs) {
      this.armed = false;
      this.lastMidi = midi;
      this.levelAtFire = level;
      this.minSinceFire = level;
      return midi;
    }
    return null;
  }
}
