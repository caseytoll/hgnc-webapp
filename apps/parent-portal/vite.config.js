import { defineConfig } from 'vite';
import { createViteConfig } from '../../common/build/vite.config.shared.js';

export default defineConfig(createViteConfig({ port: 3001 }));
