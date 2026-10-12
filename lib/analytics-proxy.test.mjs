import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyAnalyticsProxy } from './analytics-proxy.mjs';

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
