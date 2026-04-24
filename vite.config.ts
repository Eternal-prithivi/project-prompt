import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.VITE_DEEPSEEK_API_KEY': JSON.stringify(env.VITE_DEEPSEEK_API_KEY),
      'process.env.VITE_CHATGPT_API_KEY': JSON.stringify(env.VITE_CHATGPT_API_KEY),
      'process.env.VITE_CLAUDE_API_KEY': JSON.stringify(env.VITE_CLAUDE_API_KEY),
      'process.env.VITE_GROK_API_KEY': JSON.stringify(env.VITE_GROK_API_KEY),
      'process.env.VITE_OLLAMA_URL': JSON.stringify(env.VITE_OLLAMA_URL || 'http://localhost:11434'),
      'process.env.VITE_OLLAMA_MODEL': JSON.stringify(env.VITE_OLLAMA_MODEL || 'deepseek-r1'),
      'process.env.VITE_APP_URL': JSON.stringify(env.VITE_APP_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
