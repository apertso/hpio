/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Версия приложения: подставляется Vite из frontend/package.json (единый источник версии)
  readonly VITE_APP_VERSION: string;
}
