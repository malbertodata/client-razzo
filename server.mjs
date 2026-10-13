import './lib/load-env.mjs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { tryHandleAnalyticsProxy, analyticsProxyConfig } from './lib/analytics-proxy.mjs';
import {
  mainSiteHomeLocation,
  mainSiteOrigin,
  shouldKeep404,
} from './lib/fallback-redirect.mjs';
import { dispatchGroupsEnquiryApi } from './lib/groups-enquiry-http.mjs';
import { tryWriteShortLinkRedirect } from './lib/short-link-redirects.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');
const port = Number(process.env.PORT || 3000);

const { token } = analyticsProxyConfig();
const serve = sirv(dist, { dev: false, single: false });

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const analytics = await tryHandleAnalyticsProxy(req, res);
    if (analytics !== 'miss') {
      return;
    }

    if (await dispatchGroupsEnquiryApi(req, res)) {
      return;
    }

    if (tryWriteShortLinkRedirect(res, url.pathname, url.searchParams)) {
      return;
    }

    await new Promise((resolve) => {
      serve(req, res, () => {
        if (shouldKeep404(url.pathname, { analyticsToken: token })) {
          // Assets can 404 briefly while a deploy swaps containers; never let the CDN cache that.
          res.writeHead(404, { 'Cache-Control': 'no-store' });
          res.end('Not Found');
        } else {
          res.writeHead(302, { Location: mainSiteHomeLocation(mainSiteOrigin()) });
          res.end();
        }
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}).listen(port, () => {
  console.log(`Razzo landings listening on http://127.0.0.1:${port}`);
});
