let audioCtx: AudioContext | null = null;
let flyingOsc: OscillatorNode | null = null;
let flyingGain: GainNode | null = null;

function getContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export const sound = {
    playBet: () => {
        try {
            const ctx = getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { console.error('Sound error', e); }
    },
    
    playFlying: () => {
        try {
            const ctx = getContext();
            sound.stopFlying();
            
            flyingOsc = ctx.createOscillator();
            flyingGain = ctx.createGain();
            
            flyingOsc.type = 'sawtooth';
            flyingOsc.frequency.setValueAtTime(50, ctx.currentTime);
            flyingOsc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 15);
            
            flyingGain.gain.setValueAtTime(0, ctx.currentTime);
            flyingGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 15);
            
            flyingOsc.connect(filter);
            filter.connect(flyingGain);
            flyingGain.connect(ctx.destination);
            
            flyingOsc.start();
        } catch (e) { console.error('Sound error', e); }
    },
    
    stopFlying: () => {
        if (flyingOsc && flyingGain) {
            try {
                const ctx = getContext();
                flyingGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                flyingOsc.stop(ctx.currentTime + 0.2);
            } catch (e) { }
            flyingOsc = null;
            flyingGain = null;
        }
    },
    
    playCrash: () => {
        try {
            const ctx = getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
            
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { console.error('Sound error', e); }
    }
};
