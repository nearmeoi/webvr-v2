/**
 * AudioManager
 * Handles background ambience (looping) and voiceover narration (one-shot).
 * Supports cross-fading between zones.
 */
export class AudioManager {
    constructor() {
        this.ambienceTrack = new Audio();
        this.ambienceTrack.loop = true;
        this.ambienceTrack.volume = 0; // Start silent for fade-in

        this.narrationTrack = new Audio();
        this.narrationTrack.loop = false;
        this.narrationTrack.volume = 1.0;

        this.currentAmbienceSrc = null;
        this.fadeInterval = null;
    }

    /**
     * Play audio for a specific zone
     * @param {Object} audioConfig - { ambience, narration }
     */
    playZoneAudio(audioConfig) {
        if (!audioConfig) {
            this.fadeOutAmbience();
            this.narrationTrack.pause();
            return;
        }

        // 1. Handle Narration
        this.narrationTrack.pause();
        if (audioConfig.narration) {
            this.narrationTrack.src = audioConfig.narration;
            this.narrationTrack.play().catch(e => console.log('Narration play blocked:', e));
        }

        // 2. Handle Ambience (Cross-fade if different)
        if (audioConfig.ambience) {
            if (this.currentAmbienceSrc !== audioConfig.ambience) {
                // New track: Cross-fade
                this.crossFadeAmbience(audioConfig.ambience);
            } else {
                // Same track: Ensure playing
                if (this.ambienceTrack.paused) {
                    this.ambienceTrack.play().catch(e => console.log('Ambience play blocked:', e));
                    this.fadeInAmbience();
                }
            }
        } else {
            // No ambience for this zone: Fade out existing
            this.fadeOutAmbience();
        }
    }

    crossFadeAmbience(newSrc) {
        // Fade out current
        this.fadeOutAmbience(() => {
            // On complete, switch and fade in
            this.currentAmbienceSrc = newSrc;
            this.ambienceTrack.src = newSrc;
            this.ambienceTrack.play().then(() => {
                this.fadeInAmbience();
            }).catch(e => console.log('Ambience usage blocked:', e));
        });
    }

    fadeInAmbience() {
        clearInterval(this.fadeInterval);
        this.ambienceTrack.volume = 0;
        this.fadeInterval = setInterval(() => {
            if (this.ambienceTrack.volume < 0.45) { // Max volume 0.5
                this.ambienceTrack.volume = Math.min(0.5, this.ambienceTrack.volume + 0.05);
            } else {
                clearInterval(this.fadeInterval);
            }
        }, 100); // 1s fade in
    }

    fadeOutAmbience(onComplete) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = setInterval(() => {
            if (this.ambienceTrack.volume > 0.05) {
                this.ambienceTrack.volume = Math.max(0, this.ambienceTrack.volume - 0.05);
            } else {
                this.ambienceTrack.volume = 0;
                this.ambienceTrack.pause();
                clearInterval(this.fadeInterval);
                if (onComplete) onComplete();
            }
        }, 100); // 1s fade out
    }

    stopAll() {
        this.fadeOutAmbience();
        this.narrationTrack.pause();
    }

    dispose() {
        this.stopAll();
        this.ambienceTrack = null;
        this.narrationTrack = null;
    }
}
