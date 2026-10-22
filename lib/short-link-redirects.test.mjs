import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeShortLinkRedirectTarget,
  shortLinkRedirectLocation,
} from './short-link-redirects.mjs';

test('shortLinkRedirectLocation merges extra query params onto fixed UTMs', () => {
  const incoming = new URLSearchParams('u=phsg');
  const loc = shortLinkRedirectLocation('/institutsfeier', incoming);
  assert.ok(loc);
  assert.match(loc, /^\/reservieren\/\?/);
  const params = new URLSearchParams(loc.split('?')[1]);
  assert.equal(params.get('utm_content'), 'institutsfeier');
  assert.equal(params.get('utm_source'), 'letter');
  assert.equal(params.get('u'), 'phsg');
});

test('fixed redirect params win when the same key is on the incoming URL', () => {
  const incoming = new URLSearchParams('utm_source=evil&u=phsg');
  const loc = shortLinkRedirectLocation('/firmenfeier', incoming);
  assert.ok(loc);
  const params = new URLSearchParams(loc.split('?')[1]);
  assert.equal(params.get('utm_source'), 'letter');
  assert.equal(params.get('u'), 'phsg');
});

test('mergeShortLinkRedirectTarget adds trailing slash on booking paths', () => {
  const loc = mergeShortLinkRedirectTarget('/reservieren?utm_campaign=x', new URLSearchParams('u=1'));
  assert.equal(loc, '/reservieren/?utm_campaign=x&u=1');
});

test('weihnachtsessen uses the school-letter UTMs', () => {
  const loc = shortLinkRedirectLocation('/weihnachtsessen', new URLSearchParams());
  assert.ok(loc);
  const params = new URLSearchParams(loc.split('?')[1]);
  assert.equal(params.get('utm_campaign'), 'fondue chalet 2026');
  assert.equal(params.get('utm_source'), 'letter');
  assert.equal(params.get('utm_medium'), 'letter');
  assert.equal(params.get('utm_content'), 'weihnachtsessen');
});

test('weihnachtsfeier alias keeps the weihnachtsessen UTMs', () => {
  const loc = shortLinkRedirectLocation('/weihnachtsfeier', new URLSearchParams());
  assert.ok(loc);
  const params = new URLSearchParams(loc.split('?')[1]);
  assert.equal(params.get('utm_content'), 'weihnachtsessen');
});

test('fondue-stgallen opens the chalet widget with instagram bio UTMs', () => {
  const loc = shortLinkRedirectLocation('/fondue-stgallen', new URLSearchParams());
  assert.ok(loc);
  assert.match(loc, /^\/reservieren\/\?/);
  const params = new URLSearchParams(loc.split('?')[1]);
  assert.equal(params.has('chalet'), true);
  assert.equal(params.get('utm_campaign'), 'fondue chalet 2026');
  assert.equal(params.get('utm_source'), 'instagram');
  assert.equal(params.get('utm_medium'), 'bio');
  assert.equal(params.get('utm_content'), 'instagram');
});

test('normalize accepts trailing slash on slug', () => {
  const loc = shortLinkRedirectLocation('/lehrstuhlfeier/', new URLSearchParams('u=uzh'));
  assert.ok(loc?.includes('u=uzh'));
});
