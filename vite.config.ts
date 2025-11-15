import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg"],
      manifest: {
        name: "AMDA - WhatsApp Assistant",
        short_name: "AMDA",
        description: "Assistant WhatsApp pour gérer vos statuts, messages supprimés et plus encore",
        theme_color: "#25D366",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        categories: ["productivity", "utilities"],
        screenshots: [],
        shortcuts: []
      },
      injectRegister: "auto",
      strategies: "generateSW",
      filename: "sw.js",
      devOptions: {
        enabled: true,
        type: "module"
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Don't cache auth endpoints - always use network
            urlPattern: /^https:\/\/.*\/api\/auth\//i,
            handler: "NetworkOnly",
            options: {
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // For other API endpoints, use NetworkFirst but with shorter cache
            urlPattern: /^https:\/\/.*\/api\//i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes (reduced from 24 hours)
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              // Don't cache if response includes Authorization header
              matchOptions: {
                ignoreSearch: false
              }
            }
          }
        ],
        // Import Firebase messaging service worker
        // Note: This will be loaded after the service worker is ready
        importScripts: ['/firebase-messaging-sw.js'],
        // Ensure service worker supports push notifications
        skipWaiting: true,
        clientsClaim: true,
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
