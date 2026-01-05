export const playCoinSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Coin sound parameters: High pitch, quick decay
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export const playCelebrationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Play a quick arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        let time = ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

            osc.start(time);
            osc.stop(time + 0.5);

            time += 0.1;
        });

    } catch (e) {
        console.error("Celebration audio failed", e);
    }
};
