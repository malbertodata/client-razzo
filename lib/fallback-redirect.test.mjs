import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mainSiteHomeLocation,
  mainSiteOrigin,
  shouldKeep404,
} from './fallback-redirect.mjs';

test('mainSiteOrigin defaults to www.razzo.sg', () => {
  assert.equal(mainSiteOrigin(''), 'https://www.razzo.sg');
  assert.equal(mainSiteOrigin(undefined), 'https://www.razzo.sg');
});

test('mainSiteOrigin trims trailing slashes from env override', () => {
  assert.equal(mainSiteOrigin('https://example.test///'), 'https://example.test');
});

test('mainSiteHomeLocation ends with slash', () => {
  assert.equal(mainSiteHomeLocation('https://www.razzo.sg'), 'https://www.razzo.sg/');
});

test('shouldKeep404 is false for unknown HTML-like paths', () => {
  assert.equal(shouldKeep404('/random-page'), false);
  assert.equal(shouldKeep404('/kontakt'), false);
});

test('shouldKeep404 is true for asset and infra prefixes', () => {
  assert.equal(shouldKeep404('/_astro/missing.js'), true);
  assert.equal(shouldKeep404('/brand/logo.svg'), true);
  assert.equal(shouldKeep404('/.well-known/acme-challenge/token'), true);
});

test('shouldKeep404 is true for paths with file extensions', () => {
  assert.equal(shouldKeep404('/files/app.js'), true);
  assert.equal(shouldKeep404('/theme.css'), true);
});

test('shouldKeep404 is true under analytics token prefix', () => {
  const token = 'secret-analytics-path';
  assert.equal(shouldKeep404(`/${token}/missing`, { analyticsToken: token }), true);
  assert.equal(shouldKeep404(`/${token}`, { analyticsToken: token }), true);
});
