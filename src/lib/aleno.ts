import { alenoWidgetLocale, type Locale } from '@/lib/i18n';

export type ReservationLinkContext = {
  incoming: URLSearchParams;
  locale: Locale;
};

const RESTAURANT_TZ = 'Europe/Zurich';
const RESTAURANT_OPEN_HOUR = 9;
/** Aleno defaults to “now + 1h”; use a safer lead for first slot shown. */
const RESTAURANT_LEAD_MINUTES = 90;
const RESTAURANT_SLOT_ROUND_MINUTES = 30;
/** Stop offering same-day times this many minutes before closing (typical online cutoff). */
const RESTAURANT_ONLINE_CUTOFF_BEFORE_CLOSE_MINUTES = 120;

const CHALET_LEAD_MINUTES = 90;
/** Aleno chalet widget uses 15-minute reservation starts. */
const CHALET_SLOT_ROUND_MINUTES = 15;

type ZurichClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function parseIsoDateOnly(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0, 0));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function zurichClock(now: Date): ZurichClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

function restaurantClosingHour(weekday: number): number | null {
  if (weekday === 0) return null;
  if (weekday >= 4) return 23;
  return 22;
}

function isoDate(clock: Pick<ZurichClock, 'year' | 'month' | 'day'>): string {
  return `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}`;
}

function formatHHmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function addCalendarDays(clock: ZurichClock, days: number): ZurichClock {
  const anchor = Date.UTC(clock.year, clock.month - 1, clock.day + days, 12, 0, 0);
  return zurichClock(new Date(anchor));
}

function nextOpenDay(clock: ZurichClock): ZurichClock {
  let next = addCalendarDays(clock, 1);
  while (restaurantClosingHour(next.weekday) === null) {
    next = addCalendarDays(next, 1);
  }
  return next;
}

function isoDateCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

export function zurichTodayIso(now: Date = new Date()): string {
  return isoDate(zurichClock(now));
}

function zurichIsoDate(now: Date): string {
  return zurichTodayIso(now);
}

function clockOnIsoDate(iso: string): ZurichClock {
  const [year, month, day] = iso.split('-').map(Number);
  return zurichClock(new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0)));
}

function bookableSlotStartsInWindow(
  windowStartMinutes: number,
  windowEndMinutes: number,
  stepMinutes: number,
  lastStartBeforeEndMinutes: number,
): string[] {
  const lastBookableStart = windowEndMinutes - lastStartBeforeEndMinutes;
  const slots: string[] = [];
  for (let candidate = windowStartMinutes; candidate <= lastBookableStart; candidate += stepMinutes) {
    slots.push(formatHHmm(Math.floor(candidate / 60), candidate % 60));
  }
  return slots;
}

/**
 * Chalet bookable windows: [first slot, last slot] inclusive (matches Aleno shift grids).
 * Tue–Fri: lunch + dinner; Sat: two shifts (11:00–16, 16–21).
 */
function chaletBookableWindows(weekday: number): Array<[number, number]> | null {
  if (weekday === 0 || weekday === 1) return null;
  if (weekday === 6) {
    return [
      [11 * 60, 16 * 60],
      [16 * 60, 21 * 60],
    ];
  }
  if (weekday >= 2 && weekday <= 5) {
    return [
      [11 * 60 + 30, 14 * 60],
      [17 * 60 + 30, 20 * 60 + 30],
    ];
  }
  return null;
}

function slotStartsThroughLastInclusive(
  startMinutes: number,
  lastStartMinutes: number,
  stepMinutes: number,
): string[] {
  const slots: string[] = [];
  for (let candidate = startMinutes; candidate <= lastStartMinutes; candidate += stepMinutes) {
    slots.push(formatHHmm(Math.floor(candidate / 60), candidate % 60));
  }
  return slots;
}

function chaletSlotsForWindow(startMinutes: number, lastStartMinutes: number): string[] {
  return slotStartsThroughLastInclusive(
    startMinutes,
    lastStartMinutes,
    CHALET_SLOT_ROUND_MINUTES,
  );
}

/** 15-minute starts within chalet Aleno shifts. */
export function chaletBookableTimesForWeekday(weekday: number): string[] {
  const windows = chaletBookableWindows(weekday);
  if (!windows) return [];
  const times = windows.flatMap(([start, last]) => chaletSlotsForWindow(start, last));
  return [...new Set(times)];
}

/** Restaurant: lunch + dinner windows (30-minute grid, online cutoff on evening shift). */
function restaurantBookableWindows(weekday: number): Array<[number, number]> | null {
  const closeHour = restaurantClosingHour(weekday);
  if (closeHour === null) return null;
  const dinnerLast = closeHour * 60 - RESTAURANT_ONLINE_CUTOFF_BEFORE_CLOSE_MINUTES;
  const lunchStart = RESTAURANT_OPEN_HOUR * 60;
  const lunchLast = 14 * 60;
  const dinnerStart = 17 * 60 + 30;
  if (dinnerLast < dinnerStart) {
    return [[lunchStart, Math.min(lunchLast, dinnerLast)]];
  }
  return [
    [lunchStart, lunchLast],
    [dinnerStart, dinnerLast],
  ];
}

function restaurantSlotsForWindow(startMinutes: number, lastStartMinutes: number): string[] {
  return slotStartsThroughLastInclusive(
    startMinutes,
    lastStartMinutes,
    RESTAURANT_SLOT_ROUND_MINUTES,
  );
}

/** Half-hour starts within restaurant hours (same grid as the Aleno restaurant widget). */
export function restaurantBookableTimesForWeekday(weekday: number): string[] {
  const windows = restaurantBookableWindows(weekday);
  if (!windows) return [];
  const times = windows.flatMap(([start, last]) => restaurantSlotsForWindow(start, last));
  return [...new Set(times)];
}

export function groupsEnquiryWeekdayFromIso(dateIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso.trim())) return null;
  return clockOnIsoDate(dateIso.trim()).weekday;
}

export type GroupsEnquiryTimeWindowKey = 'lunch' | 'dinner' | 'continuous' | 'restaurant';

export type GroupsEnquiryTimeWindow = {
  key: GroupsEnquiryTimeWindowKey;
  times: string[];
  rangeStart: string;
  rangeEnd: string;
};

function groupsEnquiryTimeWindow(
  key: GroupsEnquiryTimeWindowKey,
  times: string[],
): GroupsEnquiryTimeWindow | null {
  if (times.length === 0) return null;
  return {
    key,
    times,
    rangeStart: times[0]!,
    rangeEnd: times.at(-1)!,
  };
}

export function groupsEnquiryBookableTimeWindows(
  dateIso: string,
  venue: 'chalet' | 'restaurant',
): GroupsEnquiryTimeWindow[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso.trim())) return [];
  const weekday = clockOnIsoDate(dateIso.trim()).weekday;

  if (venue === 'restaurant') {
    const windows = restaurantBookableWindows(weekday);
    if (!windows) return [];
    if (windows.length === 1) {
      const [start, last] = windows[0]!;
      const window = groupsEnquiryTimeWindow(
        'restaurant',
        restaurantSlotsForWindow(start, last),
      );
      return window ? [window] : [];
    }
    const keys: GroupsEnquiryTimeWindowKey[] = ['lunch', 'dinner'];
    return windows
      .map(([start, last], index) =>
        groupsEnquiryTimeWindow(
          keys[index] ?? 'restaurant',
          restaurantSlotsForWindow(start, last),
        ),
      )
      .filter((window): window is GroupsEnquiryTimeWindow => window !== null);
  }

  const windows = chaletBookableWindows(weekday);
  if (!windows) return [];

  if (windows.length === 1) {
    const [start, last] = windows[0]!;
    const window = groupsEnquiryTimeWindow('continuous', chaletSlotsForWindow(start, last));
    return window ? [window] : [];
  }

  const keys: GroupsEnquiryTimeWindowKey[] = ['lunch', 'dinner'];
  return windows
    .map(([start, last], index) =>
      groupsEnquiryTimeWindow(keys[index] ?? 'continuous', chaletSlotsForWindow(start, last)),
    )
    .filter((window): window is GroupsEnquiryTimeWindow => window !== null);
}

export function groupsEnquiryBookableTimes(
  dateIso: string,
  venue: 'chalet' | 'restaurant',
): string[] {
  return groupsEnquiryBookableTimeWindows(dateIso, venue).flatMap((window) => window.times);
}

export function groupsEnquiryWeekdayHasService(
  venue: 'chalet' | 'restaurant',
  weekday: number,
): boolean {
  return venue === 'chalet'
    ? chaletBookableTimesForWeekday(weekday).length > 0
    : restaurantBookableTimesForWeekday(weekday).length > 0;
}

export type GroupsEnquiryDateBounds = {
  min: string;
  max: string;
};

export function groupsEnquiryChaletDateBounds(
  firstAvailable: string,
  lastAvailable = '2027-01-30',
): GroupsEnquiryDateBounds {
  return {
    min: firstAvailable.trim(),
    max: lastAvailable.trim(),
  };
}

export function groupsEnquiryRestaurantDateBounds(now: Date = new Date()): GroupsEnquiryDateBounds {
  return {
    min: zurichTodayIso(now),
    max: '',
  };
}

export function groupsEnquiryIsDateInBounds(
  dateIso: string,
  bounds: GroupsEnquiryDateBounds,
): boolean {
  const date = dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const min = bounds.min.trim();
  const max = bounds.max.trim();
  if (min && isoDateCompare(date, min) < 0) return false;
  if (max && isoDateCompare(date, max) > 0) return false;
  return true;
}

/** Chalet: closed Sun (0) and Mon (1) — matches reservieren page opening hours. */
export function groupsEnquiryChaletClosedWeekday(weekday: number): boolean {
  return weekday === 0 || weekday === 1;
}

export function groupsEnquiryIsValidDate(
  dateIso: string,
  venue: 'chalet' | 'restaurant',
  bounds: GroupsEnquiryDateBounds,
): boolean {
  const date = dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (!groupsEnquiryIsDateInBounds(date, bounds)) return false;
  const weekday = clockOnIsoDate(date).weekday;
  return groupsEnquiryWeekdayHasService(venue, weekday);
}

export function defaultChaletLastAvailableDate(firstAvailableDate: string): string {
  const year = Number(firstAvailableDate.slice(0, 4));
  if (!Number.isFinite(year)) return '2027-01-31';
  return `${year + 1}-01-31`;
}

export function chaletInitialBookingSlot(
  now: Date = new Date(),
  firstAvailableDate = '2026-11-03',
  lastAvailableDate?: string,
): RestaurantBookingSlot {
  const first = firstAvailableDate.trim();
  const last = (lastAvailableDate?.trim() || defaultChaletLastAvailableDate(first)).trim();
  const todayIso = zurichIsoDate(now);
  let startIso = todayIso;
  if (isoDateCompare(startIso, first) < 0) startIso = first;

  let cursor = clockOnIsoDate(startIso);
  const todayInSeason = isoDateCompare(todayIso, first) >= 0 && isoDateCompare(todayIso, last) <= 0;

  for (let offset = 0; offset < 400; offset++) {
    if (offset > 0) cursor = addCalendarDays(cursor, 1);
    const dateIso = isoDate(cursor);
    if (isoDateCompare(dateIso, last) > 0) break;
    if (isoDateCompare(dateIso, first) < 0) continue;

    const windows = chaletBookableWindows(cursor.weekday);
    if (!windows) continue;

    const isToday = dateIso === todayIso && todayInSeason;
    const minFromNow = isToday
      ? zurichClock(now).hour * 60 + zurichClock(now).minute + CHALET_LEAD_MINUTES
      : 0;

    for (const [windowStart, lastBookableStart] of windows) {
      let candidate = Math.max(minFromNow, windowStart);
      candidate = Math.ceil(candidate / CHALET_SLOT_ROUND_MINUTES) * CHALET_SLOT_ROUND_MINUTES;
      if (candidate <= lastBookableStart) {
        return {
          startDate: dateIso,
          localTime: formatHHmm(Math.floor(candidate / 60), candidate % 60),
        };
      }
    }
  }

  const fallbackDay = clockOnIsoDate(first);
  const windows = chaletBookableWindows(fallbackDay.weekday) ?? [[11 * 60 + 30, 14 * 60]];
  const [windowStart] = windows[0]!;
  return {
    startDate: first,
    localTime: formatHHmm(Math.floor(windowStart / 60), windowStart % 60),
  };
}

export function applyChaletBookingSlotToUrl(
  reservationUrl: string,
  now: Date = new Date(),
  firstAvailableDate = '2026-11-03',
  lastAvailableDate?: string,
): string {
  const url = new URL(reservationUrl);
  const slot = chaletInitialBookingSlot(now, firstAvailableDate, lastAvailableDate);
  url.searchParams.set('startDate', slot.startDate);
  url.searchParams.set('timeUTC', alenoTimeUtcParamFromZurichLocal(slot.startDate, slot.localTime));
  url.searchParams.delete('direct');
  return url.toString();
}

export type RestaurantBookingSlot = {
  startDate: string;
  /** Wall clock in Europe/Zurich (what guests expect to see). */
  localTime: string;
};

/**
 * Aleno initial slot (see `qe()` in reservationsPopup.js): without date/time it uses now+1h,
 * which often triggers “no online reservations for this time”.
 */
export function restaurantInitialBookingSlot(now: Date = new Date()): RestaurantBookingSlot {
  let clock = zurichClock(now);

  if (restaurantClosingHour(clock.weekday) === null) {
    const open = nextOpenDay(clock);
    return { startDate: isoDate(open), localTime: formatHHmm(RESTAURANT_OPEN_HOUR, 0) };
  }

  let totalMinutes = clock.hour * 60 + clock.minute + RESTAURANT_LEAD_MINUTES;
  totalMinutes =
    Math.ceil(totalMinutes / RESTAURANT_SLOT_ROUND_MINUTES) * RESTAURANT_SLOT_ROUND_MINUTES;

  let hour = Math.floor(totalMinutes / 60);
  let minute = totalMinutes % 60;

  const closeHour = restaurantClosingHour(clock.weekday)!;
  const lastOnlineMinute = closeHour * 60 - RESTAURANT_ONLINE_CUTOFF_BEFORE_CLOSE_MINUTES;
  const candidateMinute = hour * 60 + minute;

  if (candidateMinute < RESTAURANT_OPEN_HOUR * 60) {
    hour = RESTAURANT_OPEN_HOUR;
    minute = 0;
  }

  if (candidateMinute > lastOnlineMinute) {
    const open = nextOpenDay(clock);
    return { startDate: isoDate(open), localTime: formatHHmm(RESTAURANT_OPEN_HOUR, 0) };
  }

  return { startDate: isoDate(clock), localTime: formatHHmm(hour, minute) };
}

/** Aleno applies `timeUTC` as UTC hours on `startDate` — convert Zurich local wall time. */
export function alenoTimeUtcParamFromZurichLocal(
  startDate: string,
  localTime: string,
): string {
  const [localHour, localMinute] = localTime.split(':').map(Number);
  const [year, month, day] = startDate.split('-').map(Number);
  if (!year || !month || !day || localHour === undefined || localMinute === undefined) {
    return localTime;
  }

  for (let utcHour = 0; utcHour < 24; utcHour++) {
    for (let utcMinute = 0; utcMinute < 60; utcMinute++) {
      const instant = new Date(Date.UTC(year, month - 1, day, utcHour, utcMinute));
      const z = zurichClock(instant);
      if (
        z.year === year &&
        z.month === month &&
        z.day === day &&
        z.hour === localHour &&
        z.minute === localMinute
      ) {
        return formatHHmm(utcHour, utcMinute);
      }
    }
  }

  return localTime;
}

export function applyRestaurantBookingSlotToUrl(reservationUrl: string, now: Date = new Date()): string {
  const url = new URL(reservationUrl);
  const slot = restaurantInitialBookingSlot(now);
  url.searchParams.set('startDate', slot.startDate);
  url.searchParams.set('timeUTC', alenoTimeUtcParamFromZurichLocal(slot.startDate, slot.localTime));
  url.searchParams.delete('direct');
  return url.toString();
}

/**
 * Aleno `startDate` (dateMin): before season opens, focus the widget on the first bookable day.
 * After that, omit it so guests search from today onward.
 */
export function chaletStartDateParam(firstAvailableDate: string, now: Date = new Date()): string | null {
  const first = parseIsoDateOnly(firstAvailableDate);
  if (!first) return null;

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (todayUtc < first.getTime()) {
    return firstAvailableDate.trim();
  }
  return null;
}

/**
 * Copy `utm_*` from the campaign page onto an Aleno widget URL.
 * Page values win. The static build cannot see the visitor query, so the widget
 * opener calls this again with `window.location.search`.
 */
export function appendIncomingUtmParams(reservationUrl: string, incoming: URLSearchParams): string {
  const url = new URL(reservationUrl.trim());

  for (const [key, value] of incoming.entries()) {
    if (!key.startsWith('utm_')) continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    url.searchParams.set(key, normalized);
  }

  return url.toString();
}

/** Append Aleno `locale` and `utm_*` from the campaign page onto a reservation link. */
export function appendReservationLinkParams(reservationUrl: string, ctx: ReservationLinkContext): string {
  const url = new URL(appendIncomingUtmParams(reservationUrl, ctx.incoming));
  url.searchParams.set('locale', alenoWidgetLocale(ctx.locale));
  return url.toString();
}

export function resolveChaletBookingUrl(chaletBookingUrl: string, ctx: ReservationLinkContext): string {
  return appendReservationLinkParams(chaletBookingUrl, ctx);
}

/** Embedded iframe on campaign pages: hide Aleno close bar; use our Back/Zurück control. */
export function resolveEmbeddedWidgetUrl(widgetUrl: string, ctx: ReservationLinkContext): string {
  const url = new URL(appendReservationLinkParams(widgetUrl, ctx));
  url.searchParams.set('closeButton', 'off');
  return url.toString();
}

/** Restaurant embed: prefill first plausible online slot instead of Aleno’s default now+1h. */
export function resolveRestaurantWidgetUrl(
  restaurantWidgetUrl: string,
  ctx: ReservationLinkContext,
  now?: Date,
): string {
  return applyRestaurantBookingSlotToUrl(resolveEmbeddedWidgetUrl(restaurantWidgetUrl, ctx), now ?? new Date());
}

export function resolveChaletEmbeddedWidgetUrl(
  chaletBookingUrl: string,
  ctx: ReservationLinkContext,
  firstAvailableDate: string,
  lastAvailableDate?: string,
  now?: Date,
): string {
  return applyChaletBookingSlotToUrl(
    resolveEmbeddedWidgetUrl(chaletBookingUrl, ctx),
    now ?? new Date(),
    firstAvailableDate,
    lastAvailableDate,
  );
}

/** Append a one-off query param so Aleno loads a fresh widget session (ignored by Aleno, busts URL). */
export function withFreshWidgetSession(reservationUrl: string, sessionNonce = Date.now()): string {
  const url = new URL(reservationUrl);
  url.searchParams.set('_', String(sessionNonce));
  return url.toString();
}
