let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

export async function unlockSupportNotificationSound() {
  const context = getAudioContext();
  if (context?.state === 'suspended') await context.resume().catch(() => undefined);
}

/** A short two-note chime synthesized locally; no tracking or remote audio asset. */
export function playSupportNotificationSound() {
  const context = getAudioContext();
  if (!context || context.state !== 'running') return;

  const startedAt = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, startedAt);
  master.gain.exponentialRampToValueAtTime(0.13, startedAt + 0.018);
  master.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.42);
  master.connect(context.destination);

  const notes = [
    { frequency: 659.25, offset: 0, duration: 0.18 },
    { frequency: 987.77, offset: 0.14, duration: 0.27 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const noteStart = startedAt + note.offset;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note.frequency, noteStart);
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(0.82, noteStart + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + note.duration + 0.02);
  }
}
