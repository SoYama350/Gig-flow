"use client";

/**
 * Uses BroadcastChannel to synchronize auth state across multiple browser tabs.
 * If a user logs out in one tab, all other tabs receive the signal and log out immediately.
 */

type AuthEvent = 'SESSION_ENDED' | 'SESSION_STARTED';

let channel: BroadcastChannel | null = null;

export const authEventBus = {
  /**
   * Initializes the broadcast channel and attaches the listener.
   */
  init(onSessionEnded: () => void, onSessionStarted: () => void): void {
    if (typeof BroadcastChannel === 'undefined') return;

    if (!channel) {
      channel = new BroadcastChannel('gigflow_auth_channel');
    }

    channel.onmessage = (event: MessageEvent<AuthEvent>) => {
      if (event.data === 'SESSION_ENDED') {
        onSessionEnded();
      } else if (event.data === 'SESSION_STARTED') {
        onSessionStarted();
      }
    };
  },

  /**
   * Broadcasts an event to all other tabs.
   */
  broadcast(event: AuthEvent): void {
    if (channel) {
      channel.postMessage(event);
    }
  },

  /**
   * Cleans up the channel listener.
   */
  cleanup(): void {
    if (channel) {
      channel.close();
      channel = null;
    }
  },
};
