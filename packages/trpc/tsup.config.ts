import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    entry: ['index.ts'],
    format: 'esm',
    silent: true,
    watch: options.watch,
  }
})
