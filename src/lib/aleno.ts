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
const CHALET_SLOT_ROUND_MINUTES = 30;
const CHALET_LAST_SLOT_BEFORE_WINDOW_END_MINUTES = 30;

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

function zurichIsoDate(now: Date): string {
  return isoDate(zurichClock(now));
}

function clockOnIsoDate(iso: string): ZurichClock {
  const [year, month, day] = iso.split('-').map(Number);
  return zurichClock(new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0)));
}

/** Chalet: Tue–Sat; lunch + dinner Tue–Fri, continuous Sat (see site copy). */
function chaletServiceWindows(weekday: number): Array<[number, number]> | null {
  if (weekday === 0 || weekday === 1) return null;
  if (weekday === 6) return [[11 * 60, 22 * 60]];
  if (weekday >= 2 && weekday <= 5) {
    return [
      [11 * 60 + 30, 14 * 60],
      [17 * 60 + 30, 22 * 60],
    ];
  }
  return null;
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

    const windows = chaletServiceWindows(cursor.weekday);
    if (!windows) continue;

    const isToday = dateIso === todayIso && todayInSeason;
    const minFromNow = isToday
      ? zurichClock(now).hour * 60 + zurichClock(now).minute + CHALET_LEAD_MINUTES
      : 0;

    for (const [windowStart, windowEnd] of windows) {
      const lastBookableStart = windowEnd - CHALET_LAST_SLOT_BEFORE_WINDOW_END_MINUTES;
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
  const windows = chaletServiceWindows(fallbackDay.weekday) ?? [[11 * 60 + 30, 14 * 60]];
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

/** Append Aleno `locale` and `utm_*` from the campaign page onto a reservation link. */
export function appendReservationLinkParams(reservationUrl: string, ctx: ReservationLinkContext): string {
  const url = new URL(reservationUrl.trim());

  url.searchParams.set('locale', alenoWidgetLocale(ctx.locale));

  for (const [key, value] of ctx.incoming.entries()) {
    if (!key.startsWith('utm_')) continue;
    if (url.searchParams.has(key)) continue;
    url.searchParams.set(key, value);
  }

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
