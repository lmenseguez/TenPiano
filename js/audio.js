// Entrada de micrófono: escucha el teclado y avisa cada vez que suena una nota.
import { PitchDetector, NoteTracker, rms } from './pitch.js';

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
    source.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.detector = new PitchDetector(this.ctx.sampleRate);
    this.tracker = new NoteTracker();
    this.timer = setInterval(() => this.tick(), 33);
  }

  tick() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const level = rms(this.buffer);
    const result = level >= this.tracker.gate ? this.detector.detect(this.buffer) : null;
    const midi = this.tracker.push(result, level, performance.now());
    if (this.onLevel) this.onLevel({ level, midi: this.tracker.current });
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
