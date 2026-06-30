import { defineConfig } from 'tsdown'

// Сборка контракта под публикацию. Все зависимости (effect, @effect/platform)
// остаются внешними. Контракт самодостаточен по типам (Principal лежит здесь же),
// поэтому быстрая генерация d.ts проходит без обращений к серверным пакетам.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: 'esm',
  dts: true,
  clean: true,
})
