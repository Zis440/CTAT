class GlobalAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;

  play(src: string) {

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    this.currentAudio = new Audio(src);
    this.currentAudio.play().catch(err => {
      console.debug("Audio playback prevented by browser policy:", err);
    });
  }

  stop() {

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

export const globalAudioPlayer = new GlobalAudioPlayer();
