import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig, loadEnv } from 'vite'

// Секреты (BETTER_AUTH_*, OAuth-креды) лежат в общем .env в корне монорепы.
// Vite сам по себе в process.env ничего не кладёт и видит только VITE_-префикс,
// а better-auth читает голый process.env на сервере — поэтому подгружаем все
// переменные из корня (префикс '') в process.env dev-сервера вручную.
const monorepoRoot = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, monorepoRoot, ''))
  return {
    server: { port: 3000, host: true },
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart(),
      // React Compiler автоматически мемоизирует рендеры; workspace-пакеты
      // (@jalyk/studio, @jalyk/ui) экспортируют сырой src и резолвятся в
      // реальные пути вне node_modules, поэтому Babel этого плагина покрывает
      // и их.
      viteReact({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
    ],
  }
})
