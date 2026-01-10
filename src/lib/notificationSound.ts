/**
 * Plays a notification sound when new notifications arrive
 */
class NotificationSound {
  private audio: HTMLAudioElement | null = null;
  private isMuted = false;

  constructor() {
    // Create audio element with a simple notification sound
    // Using a data URL for a simple beep sound
    this.audio = new Audio();
    
    // Simple notification sound (short beep)
    // You can replace this with a custom sound file
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    // Load mute preference from localStorage
    this.isMuted = localStorage.getItem("notificationSoundMuted") === "true";
  }

  /**
   * Play the notification sound
   */
  play(): void {
    if (this.isMuted) {
      return;
    }

    try {
      // Use Web Audio API for a simple beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
    }
  }

  /**
   * Play a custom sound file
   * @param soundUrl URL to the sound file
   */
  playCustomSound(soundUrl: string): void {
    if (this.isMuted) {
      return;
    }

    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch((error) => {
      });
    } catch (error) {
    }
  }

  /**
   * Mute notification sounds
   */
  mute(): void {
    this.isMuted = true;
    localStorage.setItem("notificationSoundMuted", "true");
  }

  /**
   * Unmute notification sounds
   */
  unmute(): void {
    this.isMuted = false;
    localStorage.setItem("notificationSoundMuted", "false");
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Check if sound is muted
   */
  isSoundMuted(): boolean {
    return this.isMuted;
  }
}

export const notificationSound = new NotificationSound();
