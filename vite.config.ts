import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    base: '/conlang-tool',
    build: {
        outDir: "conlang-tool"
    },
    plugins: [solid()],
});
