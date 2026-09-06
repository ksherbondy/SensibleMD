import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'scenario',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/test/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
