class GlobalAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;

  play(src: string) {
    // Stop any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Stop currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    
    // Play new audio
    this.currentAudio = new Audio(src);
    this.currentAudio.play().catch(err => {
      console.debug("Audio playback prevented by browser policy:", err);
    });
  }

  stop() {
    // Stop any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

// Export a singleton instance
export const globalAudioPlayer = new GlobalAudioPlayer();
