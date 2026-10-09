import { defineConfig } from 'astro/config';

const campaign = 'Fondue+Chalet+2026';

export default defineConfig({
  site: 'https://razzosg.ch',
  output: 'static',
  redirects: {
    '/': '/reservieren',
    '/buchen': '/reservieren',
    '/en': '/en/book',
    '/chalet-aussen': `/reservieren?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Chalet+Aussen`,
    '/unternehmen': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Unternehmen`,
    '/vereine': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereine`,
    '/en/chalet-aussen': `/en/book?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Chalet+Aussen`,
    '/en/unternehmen': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Unternehmen`,
    '/en/vereine': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereine`,
  },
});
