/**
 * Audio notification utilities for chat system
 */

class AudioNotificationManager {
  private audioContext: AudioContext | null = null;
  private isEnabled = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
      return;
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Generate and play a notification tone
   */
  private async playTone(frequency: number, duration: number, volume: number = 0.1) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      await this.ensureAudioContext();

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play notification tone:', error);
    }
  }

  /**
   * Play notification for incoming visitor message
   */
  async playVisitorMessage() {
    // Pleasant two-tone notification for visitor messages
    await this.playTone(800, 0.15, 0.08);
    setTimeout(() => this.playTone(1000, 0.15, 0.08), 100);
  }

  /**
   * Play notification for incoming agent message
   */
  async playAgentMessage() {
    // Single tone for agent messages
    await this.playTone(600, 0.25, 0.06);
  }

  /**
   * Play notification for new chat session
   */
  async playNewSession() {
    // Rising three-tone for new sessions
    await this.playTone(500, 0.12, 0.08);
    setTimeout(() => this.playTone(650, 0.12, 0.08), 120);
    setTimeout(() => this.playTone(800, 0.18, 0.08), 240);
  }

  /**
   * Play subtle typing sound
   */
  async playTyping() {
    await this.playTone(1200, 0.05, 0.03);
  }

  /**
   * Enable/disable audio notifications
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if audio notifications are enabled
   */
  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Initialize audio context on user interaction (required for browsers)
   */
  async initialize() {
    await this.ensureAudioContext();
  }
}

// Singleton instance
export const audioNotifications = new AudioNotificationManager();

/**
 * Hook for managing audio notifications in React components
 */
export const useAudioNotifications = () => {
  const enableAudio = () => audioNotifications.setEnabled(true);
  const disableAudio = () => audioNotifications.setEnabled(false);
  const isEnabled = () => audioNotifications.isAudioEnabled();
  const initialize = () => audioNotifications.initialize();

  return {
    enableAudio,
    disableAudio,
    isEnabled,
    initialize,
    playVisitorMessage: () => audioNotifications.playVisitorMessage(),
    playAgentMessage: () => audioNotifications.playAgentMessage(),
    playNewSession: () => audioNotifications.playNewSession(),
    playTyping: () => audioNotifications.playTyping(),
  };
};