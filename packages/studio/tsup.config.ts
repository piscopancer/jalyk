import { defineConfig } from 'tsup'

// Сборка нужна только для публикации в npm: в монорепо пакет потребляется из
// исходников (exports → src), а publishConfig подменяет их на dist. react,
// react-dom и @tanstack/react-query остаются внешними (peer у потребителя).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@tanstack/react-query'],
})
