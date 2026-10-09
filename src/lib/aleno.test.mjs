import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendReservationLinkParams,
  chaletStartDateParam,
  resolveChaletBookingUrl,
  resolveChaletEmbeddedWidgetUrl,
  resolveEmbeddedWidgetUrl,
  resolveRestaurantWidgetUrl,
  alenoTimeUtcParamFromZurichLocal,
  chaletInitialBookingSlot,
  restaurantInitialBookingSlot,
  withFreshWidgetSession,
} from './aleno.ts';
import { groupsEnquiryMailtoHref } from './i18n.ts';

const chaletBase =
  'https://mytools.aleno.me/reservations/v2.0/reservations.html?k=test&shifts=Chalet+razzo';

test('resolveChaletBookingUrl keeps shifts and sets locale from site language', () => {
  const url = resolveChaletBookingUrl(chaletBase, {
    incoming: new URLSearchParams(),
    locale: 'en',
  });
  assert.match(url, /shifts=Chalet\+razzo/);
  assert.match(url, /locale=en/);
  assert.doesNotMatch(url, /[?&]date=/);
});

test('appendReservationLinkParams uses site locale for Aleno even if query has locale=de', () => {
  const incoming = new URLSearchParams({
    locale: 'de',
    utm_source: 'poster',
    utm_medium: 'qr',
    restaurant: '1',
  });
  const out = appendReservationLinkParams(chaletBase, { incoming, locale: 'en' });
  const parsed = new URL(out);
  assert.equal(parsed.searchParams.get('locale'), 'en');
  assert.equal(parsed.searchParams.get('utm_source'), 'poster');
  assert.equal(parsed.searchParams.get('shifts'), 'Chalet razzo');
  assert.equal(parsed.searchParams.has('restaurant'), false);
});

test('resolveRestaurantWidgetUrl sets closeButton=off and prefills startDate and timeUTC', () => {
  const url = resolveRestaurantWidgetUrl(
    'https://mytools.aleno.me/reservations/v2.0/reservations.html?k=test',
    { incoming: new URLSearchParams(), locale: 'en' },
    new Date('2026-10-09T12:30:00Z'),
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('closeButton'), 'off');
  assert.equal(parsed.searchParams.get('locale'), 'en');
  assert.equal(parsed.searchParams.get('direct'), null);
  assert.equal(parsed.searchParams.get('startDate'), '2026-10-09');
  assert.equal(parsed.searchParams.get('timeUTC'), '14:00');
});

test('restaurantInitialBookingSlot uses Zurich local time with ~90min lead', () => {
  const slot = restaurantInitialBookingSlot(new Date('2026-10-09T12:30:00Z'));
  assert.equal(slot.startDate, '2026-10-09');
  assert.equal(slot.localTime, '16:00');
});

test('alenoTimeUtcParamFromZurichLocal offsets for CEST', () => {
  assert.equal(alenoTimeUtcParamFromZurichLocal('2026-10-09', '16:00'), '14:00');
});

test('restaurantInitialBookingSlot rolls to next open day after online cutoff', () => {
  const slot = restaurantInitialBookingSlot(new Date('2026-10-09T19:30:00Z'));
  assert.match(slot.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(slot.localTime, '09:00');
});

test('resolveEmbeddedWidgetUrl keeps chalet shifts and closeButton=off', () => {
  const url = resolveEmbeddedWidgetUrl(chaletBase, {
    incoming: new URLSearchParams(),
    locale: 'de',
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('closeButton'), 'off');
  assert.equal(parsed.searchParams.get('shifts'), 'Chalet razzo');
  assert.equal(parsed.searchParams.get('locale'), 'de');
});

test('withFreshWidgetSession adds cache-busting query param', () => {
  const out = withFreshWidgetSession('https://example.com/book?k=1', 12345);
  assert.equal(new URL(out).searchParams.get('_'), '12345');
});

test('chaletStartDateParam returns first day before season, null once season started', () => {
  assert.equal(chaletStartDateParam('2026-11-03', new Date('2026-10-09T12:00:00Z')), '2026-11-03');
  assert.equal(chaletStartDateParam('2026-11-03', new Date('2026-11-03T12:00:00Z')), null);
  assert.equal(chaletStartDateParam('2026-11-03', new Date('2026-11-10T12:00:00Z')), null);
});

test('resolveChaletEmbeddedWidgetUrl opens first season day before Nov 3', () => {
  const url = resolveChaletEmbeddedWidgetUrl(
    chaletBase,
    { incoming: new URLSearchParams(), locale: 'de' },
    '2026-11-03',
    '2027-01-31',
    new Date('2026-10-09T12:00:00Z'),
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('startDate'), '2026-11-03');
  assert.equal(parsed.searchParams.get('timeUTC'), '10:30');
  assert.equal(parsed.searchParams.get('shifts'), 'Chalet razzo');
  assert.doesNotMatch(url, /[?&]date=/);
});

test('chaletInitialBookingSlot uses dinner after lunch during season', () => {
  const slot = chaletInitialBookingSlot(
    new Date('2026-11-05T12:30:00Z'),
    '2026-11-03',
    '2027-01-31',
  );
  assert.equal(slot.startDate, '2026-11-05');
  assert.equal(slot.localTime, '17:30');
});

test('groupsEnquiryMailtoHref uses percent-encoding so mail body has spaces not plus signs', () => {
  const href = groupsEnquiryMailtoHref({ email: 'ciao@razzo.sg', locale: 'de' });
  assert.match(href, /Fondue%20Chalet%20oder%20Restaurant/);
  assert.doesNotMatch(href, /Fondue\+Chalet/);
});
