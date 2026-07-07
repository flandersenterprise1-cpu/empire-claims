/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Formspree endpoint used by the public contact form (static-site deploys). */
  readonly VITE_FORMSPREE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
