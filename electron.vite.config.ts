import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { copyFileSync } from 'fs'

const copyPromptsPlugin = () => ({
  name: 'copy-prompts',
  writeBundle() {
    copyFileSync(
      resolve(process.cwd(), 'src/main/prompts.md'),
      resolve(process.cwd(), 'out/main/prompts.md')
    )
  }
})

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: 'src/main/prompts.md',
            dest: '.'
          }
        ]
      }),
      copyPromptsPlugin()
    ]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
