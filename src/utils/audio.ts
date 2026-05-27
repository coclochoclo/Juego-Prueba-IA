// Basic 8-bit retro synthesizer for game sound effects
let audioCtx: AudioContext | null = null;
let soundVolume = 0.5; // default volume

function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  } catch (e) {
    console.warn("Web Audio API is not supported in this browser", e);
  }
}

export function setVolume(vol: number) {
  soundVolume = Math.max(0, Math.min(1, vol));
}

export function playSound(type: "jump" | "hurt" | "hit" | "coin" | "bossHit" | "win" | "lose" | "shoot") {
  initAudio();
  if (!audioCtx) return;

  // Resume context if suspended (browser security policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(soundVolume, now);
  masterGain.connect(audioCtx.destination);

  switch (type) {
    case "jump": {
      // Short upward pitch sweep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.16);
      break;
    }
    case "shoot": {
      // Fast downward white-noise-like or square wave sweep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.13);
      break;
    }
    case "hurt": {
      // Low downward pitched crunch (hurt sound)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.3);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case "hit": {
      // Quick slap noise
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.08);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.09);
      break;
    }
    case "bossHit": {
      // Deep metallic punch
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }
    case "coin": {
      // Classic double chime / ding
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.linearRampToValueAtTime(0.01, now + 0.08);
      
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.1);
      
      // Delay second pitch
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.01, now + 0.25);
      
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
      break;
    }
    case "win": {
      // An elegant triumphant melody
      const scale = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C, E, G, C, E, G, C
      scale.forEach((freq, idx) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.15, now + idx * 0.08);
        g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
        o.connect(g);
        g.connect(masterGain);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.35);
      });
      break;
    }
    case "lose": {
      // Downward melancholic sweep
      const scale = [392.00, 349.23, 311.13, 261.63, 220.00, 146.83];
      scale.forEach((freq, idx) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(freq, now + idx * 0.12);
        g.gain.setValueAtTime(0.12, now + idx * 0.12);
        g.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.2);
        o.connect(g);
        g.connect(masterGain);
        o.start(now + idx * 0.12);
        o.stop(now + idx * 0.12 + 0.25);
      });
      break;
    }
  }
}
