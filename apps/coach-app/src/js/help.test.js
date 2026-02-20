import { test, expect } from 'vitest';
import * as help from './help.js';

test('help module attaches handlers to window', () => {
  expect(typeof help.openHelpView).toBe('function');
  expect(typeof window.openHelpView).toBe('function');
  expect(typeof window.showWalkthrough).toBe('function');
});
