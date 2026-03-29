// @ts-check
import { defineConfig } from "astro/config"
import glsl from "vite-plugin-glsl"

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [glsl()],
  },
  server: {
    host: true,
  },
})
