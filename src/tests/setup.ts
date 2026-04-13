import '@testing-library/jest-dom';

// Polyfill globals for Node test environment
if (typeof globalThis.window === 'undefined') {
  // @ts-ignore
  globalThis.window = globalThis;
}

// Mock window.selectorAPI for tests
Object.defineProperty(globalThis, 'selectorAPI', {
  value: undefined,
  writable: true,
  configurable: true,
});

// Mock navigator.getGamepads
if (typeof globalThis.navigator === 'undefined') {
  // @ts-ignore
  globalThis.navigator = {};
}

Object.defineProperty(globalThis.navigator, 'getGamepads', {
  value: () => [null, null, null, null],
  writable: true,
  configurable: true,
});

// Mock performance.now if needed
if (typeof globalThis.performance === 'undefined') {
  // @ts-ignore
  globalThis.performance = { now: () => Date.now() };
}
