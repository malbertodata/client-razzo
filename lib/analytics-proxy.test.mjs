import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyticsUpstreamHeaders,
  classifyAnalyticsProxy,
  clientAddressForAnalytics,
  pinWebsiteId,
} from './analytics-proxy.mjs';

const config = { token: 'abc123', scriptName: 'stats' };

test('classifyAnalyticsProxy allows stats script GET', () => {
  const result = classifyAnalyticsProxy('/abc123/stats', 'GET', config);
  assert.deepEqual(result, { kind: 'allow', upstreamPath: '/stats', method: 'GET' });
});

test('classifyAnalyticsProxy misses unknown prefix', () => {
  assert.equal(classifyAnalyticsProxy('/other/stats', 'GET', config).kind, 'miss');
});

test('classifyAnalyticsProxy denies legacy _stats path', () => {
  assert.equal(classifyAnalyticsProxy('/_stats/stats', 'GET', config).kind, 'deny');
});

test('a docker proxy hop trusts a public connecting ip with a real cf-ray', () => {
  const headers = {
    'cf-connecting-ip': '146.70.141.254',
    'cf-ray': 'abcdef0123456789-SYD',
    'cf-ipcountry': 'AU',
    'cf-ipcity': 'Sydney',
  };
  assert.equal(clientAddressForAnalytics(headers), '146.70.141.254');
  const upstream = analyticsUpstreamHeaders(headers, 'POST');
  assert.equal(upstream['x-forwarded-for'], '146.70.141.254');
  assert.equal(upstream['cf-ipcountry'], 'AU');
  assert.equal(upstream['cf-ipcity'], 'Sydney');
});

test('a public non-cloudflare hop ignores a real cf-ray', () => {
  const headers = {
    'cf-connecting-ip': '146.70.141.254',
    'cf-ray': 'abcdef0123456789-SYD',
    'cf-ipcountry': 'AU',
    'cf-ipcity': 'Sydney',
    'x-forwarded-for': '8.8.8.8',
  };
  assert.equal(clientAddressForAnalytics(headers), '8.8.8.8');
  const upstream = analyticsUpstreamHeaders(headers, 'POST');
  assert.equal(upstream['x-forwarded-for'], '8.8.8.8');
  assert.equal(upstream['cf-ipcountry'], undefined);
  assert.equal(upstream['cf-ipcity'], undefined);
});

test('a private hop after a cloudflare edge uses the connecting ip', () => {
  const headers = {
    'cf-connecting-ip': '198.51.100.8',
    'x-forwarded-for': '203.0.113.9, 104.16.1.1, 10.0.0.5',
  };
  assert.equal(clientAddressForAnalytics(headers), '198.51.100.8');
});

test('a private hop without a cf-ray forwards neither address nor country', () => {
  const headers = {
    'cf-connecting-ip': '146.70.141.254',
    'cf-ipcountry': 'AU',
    'cf-ipcity': 'Sydney',
    'x-forwarded-for': '10.0.0.5',
  };
  assert.equal(clientAddressForAnalytics(headers), null);
  const upstream = analyticsUpstreamHeaders(headers, 'POST');
  assert.equal(upstream['x-forwarded-for'], undefined);
  assert.equal(upstream['cf-ipcountry'], undefined);
  assert.equal(upstream['cf-ipcity'], undefined);
});

test('collect JSON drops a client-supplied ip', () => {
  const pinned = JSON.parse(
    pinWebsiteId(
      JSON.stringify({
        ip: '1.1.1.1',
        payload: { website: 'spoof', ip: '9.9.9.9', url: '/reservieren' },
      }),
      'site-umami-id',
    ),
  );
  assert.equal(pinned.ip, undefined);
  assert.equal(pinned.payload.ip, undefined);
  assert.equal(pinned.payload.website, 'site-umami-id');
  assert.equal(pinned.payload.url, '/reservieren');
});
