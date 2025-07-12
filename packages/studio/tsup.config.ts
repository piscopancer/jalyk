import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    entry: ['index.ts'],
    format: 'esm',
    experimentalDts: true,
    watch: options.watch,
  }
})
