/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
  readonly PUBLIC_ANALYTICS_PROXY_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  umami?: {
    track?: (event: string, data?: Record<string, string>) => void;
  };
}
