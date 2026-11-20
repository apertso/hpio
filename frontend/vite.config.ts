/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { resolve } from "path";

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8")
);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  server: {
    watch: {
      // Сборки Tauri/Android (десятки тысяч файлов, ~20 ГБ) не относятся к фронтенду:
      // без исключения watcher обходит их при старте и dev-сервер «висит» минутами
      ignored: [
        "**/src-tauri/**",
        "**/dist/**",
        "**/storybook-static/**",
        "**/*.log",
      ],
    },
    // Заранее трансформируем точку входа, чтобы первая загрузка страницы была быстрее
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/index.css"],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "html-transform",
      transformIndexHtml(html) {
        // Only add analytics in production
        if (mode === "production") {
          const analyticsCode = `
  <!-- Google tag (gtag.js) -->
  <script
    async
    src="https://www.googletagmanager.com/gtag/js?id=G-QJH6DN1RSY"
  ></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "G-QJH6DN1RSY");
  </script>
`;

          return html.replace("@@ANALYTICS@@", analyticsCode);
        } else {
          return html.replace("@@ANALYTICS@@", "");
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
}));
