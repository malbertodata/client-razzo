import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendIncomingUtmParams,
  appendReservationLinkParams,
  chaletStartDateParam,
  resolveChaletBookingUrl,
  resolveChaletEmbeddedWidgetUrl,
  resolveEmbeddedWidgetUrl,
  resolveRestaurantWidgetUrl,
  alenoTimeUtcParamFromZurichLocal,
  chaletInitialBookingSlot,
  chaletBookableTimesForWeekday,
  groupsEnquiryBookableTimes,
  groupsEnquiryBookableTimeWindows,
  groupsEnquiryChaletClosedWeekday,
  groupsEnquiryIsValidDate,
  groupsEnquiryWeekdayHasService,
  restaurantBookableTimesForWeekday,
  restaurantInitialBookingSlot,
  withFreshWidgetSession,
} from './aleno.ts';
import { groupsEnquiryMailtoFromForm } from './i18n.ts';

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

test('appendIncomingUtmParams copies the fondue-chalet page query onto the widget url', () => {
  const incoming = new URLSearchParams(
    'utm_campaign=fondue+chalet+2026&utm_source=poster&utm_medium=qr&utm_content=fondue+chalet',
  );
  const parsed = new URL(appendIncomingUtmParams(chaletBase, incoming));
  assert.equal(parsed.searchParams.get('utm_campaign'), 'fondue chalet 2026');
  assert.equal(parsed.searchParams.get('utm_source'), 'poster');
  assert.equal(parsed.searchParams.get('utm_medium'), 'qr');
  assert.equal(parsed.searchParams.get('utm_content'), 'fondue chalet');
  assert.equal(parsed.searchParams.get('k'), 'test');
  assert.equal(parsed.searchParams.get('shifts'), 'Chalet razzo');
});

test('appendIncomingUtmParams lets the page query replace utm values already on the widget url', () => {
  const parsed = new URL(
    appendIncomingUtmParams(`${chaletBase}&utm_source=baked`, new URLSearchParams('utm_source=Poster')),
  );
  assert.equal(parsed.searchParams.get('utm_source'), 'poster');
});

test('appendIncomingUtmParams skips blank utm values', () => {
  const parsed = new URL(appendIncomingUtmParams(chaletBase, new URLSearchParams('utm_medium=')));
  assert.equal(parsed.searchParams.get('utm_medium'), null);
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

test('chaletBookableTimesForWeekday matches Aleno 15-minute shift grids', () => {
  const tue = chaletBookableTimesForWeekday(2);
  assert.deepEqual(tue.slice(0, 4), ['11:30', '11:45', '12:00', '12:15']);
  assert.equal(tue.filter((t) => t < '17:30').at(-1), '14:00');
  assert.ok(tue.includes('13:45'));
  assert.ok(!tue.includes('21:00'));
  assert.equal(tue.filter((t) => t >= '17:30').at(-1), '20:30');
  assert.ok(tue.includes('19:45'));

  const sat = chaletBookableTimesForWeekday(6);
  assert.equal(sat[0], '11:00');
  assert.ok(!sat.includes('09:00'));
  assert.ok(sat.includes('11:15'));
  assert.equal(sat.filter((t) => t <= '16:00').at(-1), '16:00');
  assert.equal(sat.at(-1), '21:00');
  assert.ok(sat.includes('15:45'));
  assert.ok(sat.includes('16:00'));
  assert.equal(chaletBookableTimesForWeekday(0).length, 0);
});

test('restaurantBookableTimesForWeekday respects open hours and online cutoff', () => {
  const wed = restaurantBookableTimesForWeekday(3);
  assert.equal(wed[0], '09:00');
  assert.equal(wed.filter((t) => t < '17:30').at(-1), '14:00');
  assert.ok(!wed.includes('15:00'));
  assert.equal(wed.filter((t) => t >= '17:30').at(-1), '20:00');
  const sat = restaurantBookableTimesForWeekday(6);
  assert.equal(sat.filter((t) => t >= '17:30').at(-1), '21:00');
});

test('groupsEnquiryBookableTimeWindows splits restaurant lunch and dinner', () => {
  const windows = groupsEnquiryBookableTimeWindows('2026-10-07', 'restaurant');
  assert.equal(windows.length, 2);
  assert.equal(windows[0]?.key, 'lunch');
  assert.equal(windows[1]?.key, 'dinner');
  assert.equal(windows[0]?.rangeStart, '09:00');
  assert.equal(windows[0]?.rangeEnd, '14:00');
  assert.equal(windows[1]?.rangeStart, '17:30');
  assert.equal(windows[1]?.rangeEnd, '20:00');
});

test('groupsEnquiryBookableTimes uses ISO date weekday', () => {
  const times = groupsEnquiryBookableTimes('2026-11-03', 'chalet');
  assert.ok(times.includes('17:30'));
  assert.ok(times.includes('11:30'));
});

test('groupsEnquiryBookableTimeWindows splits chalet lunch and dinner', () => {
  const windows = groupsEnquiryBookableTimeWindows('2026-11-05', 'chalet');
  assert.equal(windows.length, 2);
  assert.equal(windows[0]?.key, 'lunch');
  assert.equal(windows[1]?.key, 'dinner');
  assert.ok(windows[0]?.times.includes('11:30'));
  assert.ok(!windows[0]?.times.includes('17:30'));
  assert.ok(windows[1]?.times.includes('17:30'));
  assert.ok(!windows[1]?.times.includes('11:30'));
  assert.equal(windows[0]?.rangeStart, '11:30');
  assert.equal(windows[0]?.rangeEnd, '14:00');
  assert.equal(windows[1]?.rangeStart, '17:30');
  assert.equal(windows[1]?.rangeEnd, '20:30');
  assert.ok(windows[1]?.times.includes('19:45'));
});

test('groupsEnquiryBookableTimeWindows splits chalet saturday shifts', () => {
  const windows = groupsEnquiryBookableTimeWindows('2026-11-07', 'chalet');
  assert.equal(windows.length, 2);
  assert.equal(windows[0]?.key, 'lunch');
  assert.equal(windows[1]?.key, 'dinner');
  assert.equal(windows[0]?.rangeStart, '11:00');
  assert.equal(windows[0]?.rangeEnd, '16:00');
  assert.equal(windows[1]?.rangeStart, '16:00');
  assert.equal(windows[1]?.rangeEnd, '21:00');
});

test('groupsEnquiryIsValidDate respects season bounds and venue weekdays', () => {
  const chaletBounds = { min: '2026-11-03', max: '2027-01-30' };
  const restaurantBounds = { min: '2026-10-01', max: '' };
  assert.equal(groupsEnquiryIsValidDate('2026-11-02', 'chalet', chaletBounds), false);
  assert.equal(groupsEnquiryIsValidDate('2026-11-03', 'chalet', chaletBounds), true);
  assert.equal(groupsEnquiryWeekdayHasService('chalet', 1), false);
  assert.equal(groupsEnquiryWeekdayHasService('restaurant', 1), true);
  assert.equal(groupsEnquiryIsValidDate('2026-11-09', 'chalet', chaletBounds), false);
  assert.equal(groupsEnquiryChaletClosedWeekday(1), true);
  assert.equal(groupsEnquiryChaletClosedWeekday(0), true);
  assert.equal(groupsEnquiryIsValidDate('2026-11-08', 'chalet', chaletBounds), false);
  assert.equal(groupsEnquiryIsValidDate('2026-11-09', 'restaurant', chaletBounds), true);
  assert.equal(groupsEnquiryIsValidDate('2026-10-15', 'restaurant', restaurantBounds), true);
  assert.equal(groupsEnquiryIsValidDate('2026-10-15', 'chalet', chaletBounds), false);
});

test('groupsEnquiryMailtoFromForm uses percent-encoding so mail body has spaces not plus signs', () => {
  const href = groupsEnquiryMailtoFromForm({
    email: 'ciao@razzo.sg',
    locale: 'de',
    values: {
      date: '2026-11-05',
      time: '19:00',
      venue: 'chalet',
      groupSize: '12',
      name: 'Max Muster',
      email: 'max@example.com',
      phone: '+41 71 000 00 00',
      notes: '',
    },
  });
  assert.match(href, /Fondue%20Chalet/);
  assert.doesNotMatch(href, /Fondue\+Chalet/);
});
