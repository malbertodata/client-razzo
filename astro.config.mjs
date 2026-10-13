import './lib/load-env.mjs';
import { defineConfig } from 'astro/config';
import { tryHandleAnalyticsProxy } from './lib/analytics-proxy.mjs';
import { dispatchGroupsEnquiryApi } from './lib/groups-enquiry-http.mjs';
import { astroRedirectsConfig, tryWriteShortLinkRedirect } from './lib/short-link-redirects.mjs';

export default defineConfig({
  site: 'https://www.razzosg.ch',
  output: 'static',
  vite: {
    plugins: [
      {
        name: 'analytics-proxy-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            tryHandleAnalyticsProxy(req, res)
              .then((result) => {
                if (result === 'miss') next();
              })
              .catch(next);
          });
        },
      },
      {
        name: 'groups-enquiry-api-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            dispatchGroupsEnquiryApi(req, res)
              .then((handled) => {
                if (!handled) next();
              })
              .catch(next);
          });
        },
      },
      {
        name: 'short-link-redirect-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            try {
              const url = new URL(req.url || '/', 'http://127.0.0.1');
              if (tryWriteShortLinkRedirect(res, url.pathname, url.searchParams)) return;
              next();
            } catch (err) {
              next(err);
            }
          });
        },
      },
    ],
  },
  redirects: astroRedirectsConfig(),
});
