// Entrada de micrófono: escucha el teclado y avisa cada vez que suena una nota.
import { PitchDetector, NoteTracker, NoiseFloor, ChordChecker, rms } from './pitch.js';

export class MicListener {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
    this.buffer = null;
    this.detector = null;
    this.tracker = null;
    this.timer = null;
    this.onNote = null; // (midi) => void
    this.expect = null; // (midi) => boolean: la nota que la app espera oír ahora
    this.chord = null; // clases de nota del acorde esperado, para reconocerlo tocado completo
    this.onChord = null; // () => void: sonó el acorde completo
    this.chordRun = 0;
    this.onLevel = null; // ({ level, midi }) => void
  }

  get running() {
    return !!this.stream;
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
  }

  // Debe llamarse desde un toque del usuario.
  async start() {
    if (this.running) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      video: false,
    });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stream = stream;
    const source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0;
    // Filtros: quitan el zumbido grave y el siseo agudo que confunden la detección.
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 90;
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2600;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
    // Segundo analizador, de más resolución, para ver varias notas a la vez.
    this.wide = this.ctx.createAnalyser();
    this.wide.fftSize = 8192;
    this.wide.smoothingTimeConstant = 0.2;
    lowpass.connect(this.wide);
    this.spectrum = new Float32Array(this.wide.frequencyBinCount);
    this.chords = new ChordChecker(this.ctx.sampleRate, this.wide.fftSize);
    this.detector = new PitchDetector(this.ctx.sampleRate);
    this.tracker = new NoteTracker();
    this.noise = new NoiseFloor();
    this.timer = setInterval(() => this.tick(), 33);
  }

  tick() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const level = rms(this.buffer);
    this.tracker.gate = this.noise.update(level);
    this.tracker.expected = this.expect;

    // Acorde completo: si suenan juntas todas sus notas durante un instante, cuenta.
    let together = 0;
    if (this.chord && level >= this.tracker.gate) {
      this.wide.getFloatFrequencyData(this.spectrum);
      const res = this.chords.check(this.spectrum, this.chord);
      together = res.present.size;
      this.chordRun = res.matched ? this.chordRun + 1 : 0;
      if (this.chordRun === 4 && this.onChord) this.onChord();
    } else {
      this.chordRun = 0;
    }

    const result = level >= this.tracker.gate ? this.detector.detect(this.buffer) : null;
    let midi = this.tracker.push(result, level, performance.now());
    // Con dos o más notas del acorde sonando juntas, la lectura de nota suelta no es fiable:
    // solo se aceptan notas del acorde, nunca un "error".
    if (midi !== null && together >= 2 && this.expect && !this.expect(midi)) midi = null;
    if (this.onLevel) this.onLevel({ level, gate: this.tracker.gate, midi: this.tracker.current });
    if (midi !== null && this.onNote) this.onNote(midi);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
  }
}

// Mantiene la pantalla encendida mientras practicas (si el navegador lo permite).
let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) {
    /* sin permiso: no pasa nada */
  }
}
