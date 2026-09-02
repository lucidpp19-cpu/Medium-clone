import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/neon-auth': {
          target: env.VITE_NEON_AUTH_URL ? new URL(env.VITE_NEON_AUTH_URL).origin : undefined,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => {
            const authPath = env.VITE_NEON_AUTH_URL ? new URL(env.VITE_NEON_AUTH_URL).pathname.replace(/\/$/, '') : ''
            return `${authPath}${path.replace(/^\/neon-auth/, '')}`
          },
        },
      },
    },
  }
})
