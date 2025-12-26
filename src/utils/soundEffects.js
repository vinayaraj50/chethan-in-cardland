
let audioContext = null;

const getContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

const isSoundsEnabled = () => {
    return localStorage.getItem('soundsEnabled') !== 'false';
};

const createOscillator = (type, freq, startTime, duration, vol = 0.1) => {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const playTada = () => {
    if (!isSoundsEnabled()) return;
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // A nice ascending major arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        createOscillator('sine', freq, now + (i * 0.1), 0.6, 0.1);
    });
};

export const playSwoosh = () => {
    if (!isSoundsEnabled()) return;
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const duration = 0.5;

    // Create noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.1, now + (duration / 2));
    gain.gain.linearRampToValueAtTime(0, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
};

export const playTing = () => {
    if (!isSoundsEnabled()) return;
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // High pitched ting (B6)
    createOscillator('sine', 1975.53, now, 0.8, 0.15);
    // Add a slight overtone
    createOscillator('sine', 3951.07, now, 0.4, 0.05);
};

export const playCompletion = () => {
    if (!isSoundsEnabled()) return;
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Majestic chord (C Major)
    // Short Happy Trumpet Fanfare
    const notes = [
        { freq: 392.00, time: 0, dur: 0.15 },    // G4
        { freq: 523.25, time: 0.15, dur: 0.15 }, // C5
        { freq: 659.25, time: 0.3, dur: 0.15 },  // E5
        { freq: 783.99, time: 0.45, dur: 0.4 }   // G5 (Longer)
    ];

    notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth'; // Brass-like waveform
        osc.frequency.value = freq;

        // Brass filter characteristics
        filter.type = 'lowpass';
        filter.Q.value = 2; // Resonance for brassy 'honk'

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        const start = now + time;
        const end = start + dur;

        // Filter Envelope - Wah effect typical of brass attack
        filter.frequency.setValueAtTime(500, start);
        filter.frequency.linearRampToValueAtTime(3000, start + 0.05);
        filter.frequency.exponentialRampToValueAtTime(500, end);

        // Amplitude Envelope
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02); // Fast attack
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05); // Sustain level
        gain.gain.exponentialRampToValueAtTime(0.001, end); // Release

        osc.start(start);
        osc.stop(end + 0.1);
    });
};

