import { defineConfig } from 'astro/config';

const campaign = 'fondue+chalet+2026';

export default defineConfig({
  site: 'https://www.razzosg.ch',
  output: 'static',
  redirects: {
    '/': '/reservieren',
    '/buchen': '/reservieren',
    '/en': '/en/book',
    '/fondue-chalet': `/reservieren?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
    '/firmenfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
    '/vereinsfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
    '/praxisfeier': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=praxisfeier`,
    '/en/fondue-chalet': `/en/book?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
    '/en/firmenfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
    '/en/vereinsfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
    '/en/praxisfeier': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=praxisfeier`,
    // Legacy short links (same UTMs as replacements above)
    '/chalet-aussen': `/reservieren?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
    '/unternehmen': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
    '/vereine': `/reservieren?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
    '/en/chalet-aussen': `/en/book?utm_campaign=${campaign}&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet`,
    '/en/unternehmen': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=firmenfeier`,
    '/en/vereine': `/en/book?utm_campaign=${campaign}&utm_source=letter&utm_medium=letter&utm_content=vereinsfeier`,
  },
});
