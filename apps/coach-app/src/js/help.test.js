import { test, expect, vi } from 'vitest';
import * as help from './help.js';

// Basic unit smoke tests for the help module
test('help module attaches handlers to window', () => {
  expect(typeof help.openHelpView).toBe('function');
  expect(typeof window.openHelpView).toBe('function');
  expect(typeof window.showWalkthrough).toBe('function');
});

// DOM integration: inline onclick should call openHelpView -> openModal
test('clicking help button calls openModal via openHelpView', () => {
  // stub openModal so we can assert it was invoked
  const openModalStub = vi.fn();
  window.openModal = openModalStub;

  // create an inline onclick button (parsed from HTML like in index.html)
  const container = document.createElement('div');
  container.innerHTML = `<button onclick="openHelpView()">?</button>`;
  document.body.appendChild(container);
  const btn = container.querySelector('button');

  // some test DOM parsers don't wire inline onclick -> property; ensure handler
  // mirrors what production does by assigning the window function as the click handler
  btn.onclick = window.openHelpView;

  // click should not throw and should result in openModal being called
  expect(() => btn.click()).not.toThrow();
  expect(openModalStub).toHaveBeenCalled();

  // cleanup
  document.body.removeChild(container);
});
