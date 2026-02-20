import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  // Global ignores
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'apps-script/', '**/*.min.js'],
  },

  // Base recommended rules
  js.configs.recommended,

  // Disable formatting rules that conflict with Prettier
  prettier,

  // Browser source files
  {
    files: ['apps/*/src/**/*.js', 'common/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        DOMParser: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        location: 'readonly',
        history: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        ClipboardItem: 'readonly',
        Image: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        DragEvent: 'readonly',
        DataTransfer: 'readonly',
        queueMicrotask: 'readonly',
        structuredClone: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        caches: 'readonly',
        html2canvas: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Codebase uses window-global pattern: modules assign functions to window
      // and other modules call them directly. This makes no-undef unusable.
      'no-undef': 'off',
      // Switch cases commonly use inline declarations in this codebase
      'no-case-declarations': 'off',
      // Not critical for this project
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      // New in ESLint 10, not relevant for this codebase
      'preserve-caught-error': 'off',
    },
  },

  // Test files — add Vitest globals
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'readonly',
      },
    },
  },
];
