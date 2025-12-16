// Test setup file
import { expect, afterEach, vi } from 'vitest';

// runs a cleanup after each test case
afterEach(() => {
  vi.clearAllMocks();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn() as any,
  setItem: vi.fn() as any,
  removeItem: vi.fn() as any,
  clear: vi.fn() as any,
  length: 0,
  key: vi.fn() as any,
} as Storage;
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = vi.fn();

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  onloadend: null,
  onerror: null,
  result: null,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2,
})) as any;

// Mock process.env
global.process = {
  ...global.process,
  env: {
    HF_API_KEY: undefined,
    NEXT_PUBLIC_HF_API_KEY: undefined,
  },
};
