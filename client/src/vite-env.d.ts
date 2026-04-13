/// <reference types="vite/client" />

// Declare image/asset modules for TypeScript
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
