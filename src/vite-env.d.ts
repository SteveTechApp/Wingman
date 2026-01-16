/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  // add other VITE_* vars as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}