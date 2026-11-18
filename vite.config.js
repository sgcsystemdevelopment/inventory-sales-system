import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        transactions: resolve(__dirname, 'transactions.html'),
        users: resolve(__dirname, 'users.html'),
        settings: resolve(__dirname, 'settings.html')
      }
    }
  }
})
