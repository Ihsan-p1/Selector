import { useEffect, useRef, useState } from 'react';
import { useShortcutStore } from '../stores/shortcut.store';
import { executeAction } from './useKeyboardShortcuts';

const DEADZONE = 0.15;
const BUTTON_COOLDOWN = 200; // ms
const AXIS_COOLDOWN = 300; // ms

/**
 * Xbox Controller support via W3C Gamepad API.
 * Polls at 60fps, debounces button presses.
 */
export function useGamepad() {
  const resolveButton = useShortcutStore(s => s.resolveGamepadButton);
  const lastButtonPress = useRef<Map<number, number>>(new Map());
  const lastAxisAction = useRef<Map<string, number>>(new Map());
  const prevButtonState = useRef<Map<number, boolean>>(new Map());
  const rafId = useRef<number>(0);
  const isConnected = useRef(false);

  useEffect(() => {
    const handleConnect = () => { isConnected.current = true; };
    const handleDisconnect = () => { isConnected.current = false; };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    const poll = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];

      if (gp && gp.connected) {
        isConnected.current = true;
        const now = performance.now();

        // ── Buttons ──
        for (let i = 0; i < gp.buttons.length; i++) {
          const pressed = gp.buttons[i].pressed;
          const wasPressed = prevButtonState.current.get(i) ?? false;

          // Detect rising edge (was released → now pressed)
          if (pressed && !wasPressed) {
            const lastPress = lastButtonPress.current.get(i) ?? 0;
            if (now - lastPress > BUTTON_COOLDOWN) {
              lastButtonPress.current.set(i, now);
              const actionId = resolveButton(i);
              if (actionId) {
                executeAction(actionId);
              }
            }
          }

          prevButtonState.current.set(i, pressed);
        }

        // ── Axes (for navigation — left stick) ──
        // axes[0] = left stick X, axes[1] = left stick Y
        processAxis(gp.axes[0], 'lx', now);
        processAxis(gp.axes[1], 'ly', now);
      }

      rafId.current = requestAnimationFrame(poll);
    };

    const processAxis = (value: number, id: string, now: number) => {
      if (Math.abs(value) < DEADZONE) return;

      const lastAction = lastAxisAction.current.get(id) ?? 0;
      if (now - lastAction < AXIS_COOLDOWN) return;

      lastAxisAction.current.set(id, now);

      // Left stick X → nav
      if (id === 'lx') {
        if (value > DEADZONE) executeAction('nav.next');
        else if (value < -DEADZONE) executeAction('nav.prev');
      }
    };

    rafId.current = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [resolveButton]);
}

/**
 * Simple hook to track gamepad connection state.
 */
export function useGamepadConnected(): boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    // Check if already connected
    const gamepads = navigator.getGamepads();
    if (gamepads[0]?.connected) setConnected(true);

    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  return connected;
}
