import { defineConfig } from 'vite';

// Suppress Node.js DEP0205 warning emitted by @tailwindcss/node on Node 22+/26+
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning: unknown, ...args: unknown[]) {
  if (
    (typeof warning === 'string' &&
      (warning.includes('DEP0205') || warning.includes('module.register()'))) ||
    (typeof warning === 'object' &&
      warning !== null &&
      'code' in warning &&
      warning.code === 'DEP0205')
  ) {
    return;
  }
  return Reflect.apply(originalEmitWarning, process, [warning, ...args]);
};

export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  return {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
