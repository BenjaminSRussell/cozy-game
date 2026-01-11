export class SeasonalAudioSystem {
    private currentSeason: string = '';
    private audioContext: AudioContext | null = null;
    private ambientSource: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;

    constructor() {
        // Lazy init on first user interaction or explicitly
    }

    private init(): void {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.5;
        this.gainNode.connect(this.audioContext.destination);
    }

    public updateSeason(season: string): void {
        if (this.currentSeason === season) return;
        this.currentSeason = season;
        this.playAmbient(season);
    }

    private async playAmbient(season: string): Promise<void> {
        this.init();
        if (!this.audioContext || !this.gainNode) return;

        if (this.ambientSource) {
            this.ambientSource.stop();
        }

        // Heuristic sound generation or loading
        // In a real game, we'd load .mp3 / .ogg
        // For this polish, we can generate simple procedural "Wind" or "Birds"

        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds loop
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // White noise for wind/rain
            let sample = (Math.random() * 2 - 1);

            if (season === 'winter') { // Cold whistling wind (Filtered noise)
                sample *= 0.1;
            } else if (season === 'summer') { // Crickets (High pitch blips) - simple approximation
                if (Math.sin(i * 0.1) > 0.99) sample = Math.sin(i * 0.5);
                else sample = 0;
            } else if (season === 'spring') { // Birds / Gentle breeze
                sample *= 0.05;
            } else if (season === 'autumn') { // Rustling leaves / Wind
                sample *= 0.08;
            }

            data[i] = sample;
        }

        this.ambientSource = this.audioContext.createBufferSource();
        this.ambientSource.buffer = buffer;
        this.ambientSource.loop = true;
        this.ambientSource.connect(this.gainNode);
        this.ambientSource.start();
    }
}
