import { defineConfig } from 'vite';

export default defineConfig({
    publicDir: 'src/public',
    server: {
        host: true,
        port: 5173
    }
});
