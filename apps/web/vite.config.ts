import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 3000, host: true },
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
})
