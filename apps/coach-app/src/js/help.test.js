import { test, expect, vi, describe, beforeEach, afterEach } from 'vitest';
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

// ========================================
// Collapsible accordion tests
// ========================================

describe('help accordion sections', () => {
  let modalBody;

  beforeEach(() => {
    // Set up a modal container so openModal can inject HTML
    modalBody = null;
    window.openModal = vi.fn((title, bodyHtml) => {
      const container = document.createElement('div');
      container.id = 'help-test-container';
      container.innerHTML = bodyHtml;
      document.body.appendChild(container);
      modalBody = container;
    });
    window.closeModal = vi.fn();

    // Open the help view so sections render
    help.openHelpView();
  });

  afterEach(() => {
    if (modalBody && modalBody.parentNode) {
      modalBody.parentNode.removeChild(modalBody);
    }
  });

  test('renders all 7 help sections', () => {
    const sections = modalBody.querySelectorAll('.help-section');
    expect(sections.length).toBe(7);
  });

  test('all sections start closed (no open class)', () => {
    const openSections = modalBody.querySelectorAll('.help-section.open');
    expect(openSections.length).toBe(0);
  });

  test('clicking a section header opens that section', () => {
    const firstHeader = modalBody.querySelector('.help-section-header');
    const firstSection = firstHeader.closest('.help-section');

    window.toggleHelpSection(firstHeader);

    expect(firstSection.classList.contains('open')).toBe(true);
  });

  test('clicking an open section header closes it', () => {
    const firstHeader = modalBody.querySelector('.help-section-header');
    const firstSection = firstHeader.closest('.help-section');

    // Open it
    window.toggleHelpSection(firstHeader);
    expect(firstSection.classList.contains('open')).toBe(true);

    // Close it
    window.toggleHelpSection(firstHeader);
    expect(firstSection.classList.contains('open')).toBe(false);
  });

  test('opening a second section closes the first (accordion behavior)', () => {
    const headers = modalBody.querySelectorAll('.help-section-header');
    const firstSection = headers[0].closest('.help-section');
    const secondSection = headers[1].closest('.help-section');

    // Open first
    window.toggleHelpSection(headers[0]);
    expect(firstSection.classList.contains('open')).toBe(true);

    // Open second — first should close
    window.toggleHelpSection(headers[1]);
    expect(firstSection.classList.contains('open')).toBe(false);
    expect(secondSection.classList.contains('open')).toBe(true);
  });

  test('only one section can be open at a time', () => {
    const headers = modalBody.querySelectorAll('.help-section-header');

    // Open each section in turn
    for (const header of headers) {
      window.toggleHelpSection(header);
      const openSections = modalBody.querySelectorAll('.help-section.open');
      expect(openSections.length).toBe(1);
    }
  });

  test('each section has a chevron icon', () => {
    const chevrons = modalBody.querySelectorAll('.help-chevron');
    expect(chevrons.length).toBe(7);
  });

  test('each section has content with body text', () => {
    const contents = modalBody.querySelectorAll('.help-section-content');
    expect(contents.length).toBe(7);
    for (const content of contents) {
      expect(content.innerHTML.trim().length).toBeGreaterThan(0);
    }
  });

  test('help footer has replay walkthrough button', () => {
    const footer = modalBody.querySelector('.help-footer');
    expect(footer).not.toBeNull();
    const btn = footer.querySelector('button');
    expect(btn.textContent).toContain('Replay Welcome Tour');
  });
});

// ========================================
// Context help tests
// ========================================

describe('context help', () => {
  beforeEach(() => {
    window.openModal = vi.fn();
  });

  test('showContextHelp opens modal for valid topics', () => {
    const topics = ['scoring', 'planner', 'security', 'stats', 'training', 'sharing', 'games'];
    for (const topic of topics) {
      window.openModal.mockClear();
      help.showContextHelp(topic);
      expect(window.openModal).toHaveBeenCalledTimes(1);
    }
  });

  test('showContextHelp does nothing for unknown topic', () => {
    help.showContextHelp('nonexistent');
    expect(window.openModal).not.toHaveBeenCalled();
  });

  test('context help body has context-help-body wrapper', () => {
    help.showContextHelp('scoring');
    const bodyHtml = window.openModal.mock.calls[0][1];
    expect(bodyHtml).toContain('context-help-body');
  });
});

// ========================================
// Walkthrough tests
// ========================================

describe('walkthrough', () => {
  beforeEach(() => {
    window.openModal = vi.fn();
    window.closeModal = vi.fn();
    localStorage.removeItem('hgnc.helpWalkthroughSeen');
  });

  test('shows walkthrough on first visit', () => {
    help.showWalkthrough();
    expect(window.openModal).toHaveBeenCalled();
    const title = window.openModal.mock.calls[0][0];
    expect(title).toContain('Welcome');
  });

  test('does not show walkthrough if already seen', () => {
    localStorage.setItem('hgnc.helpWalkthroughSeen', '1');
    help.showWalkthrough();
    expect(window.openModal).not.toHaveBeenCalled();
  });

  test('forceShow overrides seen state', () => {
    localStorage.setItem('hgnc.helpWalkthroughSeen', '1');
    help.showWalkthrough(true);
    expect(window.openModal).toHaveBeenCalled();
  });

  test('walkthrough navigation advances slides', () => {
    help.showWalkthrough(true);
    const firstTitle = window.openModal.mock.calls[0][0];

    window.walkthroughNext();
    const secondTitle = window.openModal.mock.calls[1][0];

    expect(firstTitle).not.toBe(secondTitle);
  });

  test('walkthrough back goes to previous slide', () => {
    help.showWalkthrough(true);
    const firstTitle = window.openModal.mock.calls[0][0];

    window.walkthroughNext();
    window.walkthroughBack();
    const backTitle = window.openModal.mock.calls[2][0];

    expect(backTitle).toBe(firstTitle);
  });

  test('dismissWalkthrough sets localStorage and closes modal', () => {
    help.showWalkthrough(true);
    window.dismissWalkthrough();

    expect(localStorage.getItem('hgnc.helpWalkthroughSeen')).toBe('1');
    expect(window.closeModal).toHaveBeenCalled();
  });

  test('walkthrough body includes dots for slide indicators', () => {
    help.showWalkthrough(true);
    const bodyHtml = window.openModal.mock.calls[0][1];
    expect(bodyHtml).toContain('walkthrough-dot');
    expect(bodyHtml).toContain('walkthrough-dot active');
  });

  test('walkthrough footer has navigation buttons', () => {
    help.showWalkthrough(true);
    const footerHtml = window.openModal.mock.calls[0][2];
    expect(footerHtml).toContain('walkthrough-nav');
    // First slide: Skip + Next
    expect(footerHtml).toContain('Skip');
    expect(footerHtml).toContain('Next');
  });
});

// ========================================
// HTML generator tests
// ========================================

describe('help button HTML generators', () => {
  test('helpButtonHtml returns button with help-btn class', () => {
    const html = help.helpButtonHtml();
    expect(html).toContain('help-btn');
    expect(html).toContain('openHelpView()');
  });

  test('contextHelpIcon returns button with topic', () => {
    const html = help.contextHelpIcon('scoring');
    expect(html).toContain('context-help-btn');
    expect(html).toContain("showContextHelp('scoring')");
  });
});
