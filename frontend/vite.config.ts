import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://script.google.com https://script.googleusercontent.com ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    fs: {
      allow: ['..'],
    },
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
})
