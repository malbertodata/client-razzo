import { defineConfig } from 'astro/config';

const campaign = 'Fondue+Chalet+2026';

export default defineConfig({
  site: 'https://www.razzosg.ch',
  output: 'static',
  redirects: {
    '/': '/reservieren',
    '/buchen': '/reservieren',
    '/en': '/en/book',
    '/fondue-chalet': `/reservieren?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Fondue+Chalet`,
    '/firmenfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Firmenfeier`,
    '/vereinsfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereinsfeier`,
    '/praxisfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Praxisfeier`,
    '/en/fondue-chalet': `/en/book?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Fondue+Chalet`,
    '/en/firmenfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Firmenfeier`,
    '/en/vereinsfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereinsfeier`,
    '/en/praxisfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Praxisfeier`,
    // Legacy short links (same UTMs as replacements above)
    '/chalet-aussen': `/reservieren?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Fondue+Chalet`,
    '/unternehmen': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Firmenfeier`,
    '/vereine': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereinsfeier`,
    '/en/chalet-aussen': `/en/book?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=Fondue+Chalet`,
    '/en/unternehmen': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Firmenfeier`,
    '/en/vereine': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=Vereinsfeier`,
  },
});
