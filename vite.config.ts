import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function isPackage(id: string, packageName: string): boolean {
  return id.includes(`/node_modules/${packageName}/`) || id.includes(`\\node_modules\\${packageName}\\`);
}

export function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('@google/genai')) {
    return 'vendor-google-genai';
  }

  if (id.includes('@anthropic-ai/sdk')) {
    return 'vendor-anthropic';
  }

  if (id.includes('/openai/') || id.includes('\\openai\\')) {
    return 'vendor-openai';
  }

  if (isPackage(id, 'react') || isPackage(id, 'react-dom')) {
    return 'vendor-react';
  }

  if (isPackage(id, 'motion')) {
    return 'vendor-motion';
  }

  if (isPackage(id, 'lucide-react')) {
    return 'vendor-icons';
  }

  if (isPackage(id, 'crypto-js')) {
    return 'vendor-crypto';
  }

  return undefined;
}

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
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
