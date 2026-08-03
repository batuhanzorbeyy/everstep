import type { AmbientSound } from './types';

const recordedSounds: Partial<Record<AmbientSound, string>> = {
  rain: 'rain.mp3',
  cafe: 'cafe.mp3',
  thunderstorm: 'thunderstorm.mp3',
  windLeaves: 'wind-leaves.mp3',
  ocean: 'ocean.mp3',
  forest: 'forest.mp3',
  fire: 'fire.mp3'
};

class AudioEngine {
  private context: AudioContext | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientElement: HTMLAudioElement | null = null;
  private currentVolume = 0.55;
  private retryPlayback: (() => void) | null = null;

  private ensureContext(): AudioContext {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  playChime(volume = 0.5, success = true): void {
    const context = this.ensureContext();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * 0.25), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    gain.connect(context.destination);
    [success ? 659.25 : 440, success ? 783.99 : 523.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + 0.7);
    });
  }

  startAmbient(type: AmbientSound, volume: number): void {
    this.stopAmbient();
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (type === 'none') return;

    const filename = recordedSounds[type];
    if (filename) {
      this.startRecordedSound(filename);
      return;
    }

    this.startGeneratedNoise(type);
  }

  private startRecordedSound(filename: string): void {
    const source = new URL(`./audio/${filename}`, window.location.href).toString();
    const audio = new Audio(source);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = this.currentVolume * 0.72;
    this.ambientElement = audio;

    const attempt = () => {
      if (this.ambientElement !== audio) return;
      void audio.play().then(() => this.clearPlaybackRetry()).catch(() => {
        if (this.retryPlayback) return;
        const retry = () => {
          this.retryPlayback = null;
          attempt();
        };
        this.retryPlayback = retry;
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
    };
    attempt();
  }

  private startGeneratedNoise(type: AmbientSound): void {
    const context = this.ensureContext();
    const duration = 6;
    const frameCount = context.sampleRate * duration;
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let brown = 0;
    let pinkA = 0;
    let pinkB = 0;

    for (let i = 0; i < frameCount; i += 1) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') channel[i] = white * 0.42;
      else if (type === 'brown') {
        brown = (brown + 0.02 * white) / 1.02;
        channel[i] = brown * 3.2;
      } else {
        pinkA = 0.99765 * pinkA + white * 0.099046;
        pinkB = 0.963 * pinkB + white * 0.2965164;
        channel[i] = (pinkA + pinkB + white * 0.1848) * 0.16;
      }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = this.currentVolume * 0.4;
    source.connect(gain).connect(context.destination);
    source.start();
    this.ambientSource = source;
    this.ambientGain = gain;
  }

  setAmbientVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGain) this.ambientGain.gain.value = this.currentVolume * 0.4;
    if (this.ambientElement) this.ambientElement.volume = this.currentVolume * 0.72;
  }

  stopAmbient(): void {
    this.clearPlaybackRetry();
    try { this.ambientSource?.stop(); } catch { /* already stopped */ }
    this.ambientSource = null;
    this.ambientGain = null;

    if (this.ambientElement) {
      this.ambientElement.pause();
      this.ambientElement.removeAttribute('src');
      this.ambientElement.load();
    }
    this.ambientElement = null;
  }

  private clearPlaybackRetry(): void {
    if (!this.retryPlayback) return;
    window.removeEventListener('pointerdown', this.retryPlayback);
    window.removeEventListener('keydown', this.retryPlayback);
    this.retryPlayback = null;
  }
}

export const audioEngine = new AudioEngine();
