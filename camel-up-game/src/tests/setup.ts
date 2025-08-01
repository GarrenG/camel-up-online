import { beforeEach } from 'vitest';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  },
  writable: true,
});

// Mock Math.random for consistent test results
let mockRandomValue = 0.5;
const originalRandom = Math.random;

// Simple mock function
Math.random = () => mockRandomValue;

// Helper functions
(global as any).setMockRandom = (value: number) => {
  mockRandomValue = value;
};

(global as any).restoreRandom = () => {
  Math.random = originalRandom;
};