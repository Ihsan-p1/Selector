import '@testing-library/jest-dom';

// Mock window.selectorAPI for tests
Object.defineProperty(window, 'selectorAPI', {
  value: undefined,
  writable: true,
});

// Mock navigator.getGamepads
Object.defineProperty(navigator, 'getGamepads', {
  value: () => [null, null, null, null],
  writable: true,
});
