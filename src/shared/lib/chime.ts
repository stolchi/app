let context: AudioContext | null = null;

/** Browsers keep audio silent until the first tap or click on the page. */
export function unlockSound(): void {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  void context.resume();
}

export const isSoundUnlocked = () => context?.state === 'running';

/** A short two-note chime, generated so that no audio file has to be loaded. */
export function playChime(): void {
  if (!context || context.state !== 'running') return;
  const start = context.currentTime;
  [880, 1175].forEach((frequency, index) => {
    const at = start + index * 0.16;
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.32);
  });
}
