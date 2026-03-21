import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '/conlang-tool',
    build: {
        outDir: "conlang-tool"
    },
    plugins: [
        tailwindcss(),
        solid()
    ],
});
