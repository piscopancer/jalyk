import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Единый flat-config на всю монорепу: ESLint запускается из корня и покрывает
// apps/* и packages/*. Главная цель — правила React Compiler из
// eslint-plugin-react-hooks (recommended-latest), которые подсвечивают то, что
// мешает компилятору корректно мемоизировать (мутация в рендере, условные хуки).
export default tseslint.config(
  // Сгенерированное и собранное не линтуем.
  {
    ignores: [
      '**/dist/**',
      '**/*.gen.ts',
      '**/routeTree.gen.ts',
      // Сгенерированный Prisma-клиент — не наш код, не линтуем.
      '**/generated/**',
    ],
  },
  // База для всего TS/TSX-кода.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Правила хуков и React Compiler — для реактовых пакетов и приложений.
  // В v7 flat-пресеты вложены под configs.flat (configs['recommended-latest']
  // на верхнем уровне — это легаси-формат с plugins-массивом, несовместимый с
  // flat config).
  reactHooks.configs.flat['recommended-latest'],
  // Fast Refresh актуален только для Vite-приложений, поэтому ограничиваем их.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/test-client/**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite],
  },
  // Файлы-роуты TanStack: компонент определяется локально, наружу уходит только
  // Route (createFileRoute). Правило хочет экспортируемых компонентов и потому
  // ругается на локальный компонент — для роутов это неустранимо соглашением, а
  // Fast Refresh здесь идёт через роутер-плагин. Выключаем правило для роутов.
  {
    files: ['apps/*/src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Песочница студии: демо-компоненты живут рядом с конфигом сегмента
  // (customRootSegment), это не модуль-граница Fast Refresh — правило не нужно.
  {
    files: ['apps/test-client/src/custom-studio.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Типизированный клиент студии: методы (findMany/create/publish/…) — это
  // хуки, оформленные как методы объекта с маленькой буквы. По имени правило не
  // распознаёт их как хуки и даёт ложные срабатывания, хотя вызываются они на
  // верхнем уровне как обычные хуки. Отключаем правило для этого файла.
  {
    files: ['packages/studio/src/data/createStudio.tsx'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
)
