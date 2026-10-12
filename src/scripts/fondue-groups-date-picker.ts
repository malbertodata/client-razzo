import { groupsEnquiryIsValidDate, type GroupsEnquiryDateBounds } from '@/lib/aleno';
import type { GroupsEnquiryVenue, Locale } from '@/lib/i18n';

export type GroupsDatePicker = {
  syncVenue: () => void;
  validate: () => void;
  reset: () => void;
  getValue: () => string;
};

type MonthView = {
  year: number;
  month: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function fromMonthIndex(index: number): MonthView {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function mondayFirstOffset(year: number, month: number): number {
  const weekday = new Date(year, month - 1, 1).getDay();
  return (weekday + 6) % 7;
}

function weekdayLabels(locale: Locale): string[] {
  return locale === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
}

function monthTitle(view: MonthView, locale: Locale): string {
  const date = new Date(view.year, view.month - 1, 1);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatSelectedDateLines(
  iso: string,
  locale: Locale,
): { weekdayLine: string; dateLine: string } | null {
  const parsed = parseIso(iso);
  if (!parsed) return null;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  const loc = locale === 'en' ? 'en-GB' : 'de-CH';
  const weekday = new Intl.DateTimeFormat(loc, { weekday: 'long' }).format(date);
  const dateLine = new Intl.DateTimeFormat(loc, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return { weekdayLine: `${weekday},`, dateLine };
}

function fillSummaryDateValue(el: HTMLElement, iso: string, locale: Locale) {
  const lines = formatSelectedDateLines(iso, locale);
  el.replaceChildren();
  if (!lines) {
    el.textContent = iso;
    return;
  }
  for (const text of [lines.weekdayLine, lines.dateLine]) {
    const line = document.createElement('span');
    line.className = 'fondue-groups-cal-summary-value-line';
    line.textContent = text;
    el.append(line);
  }
}

function clampViewToBounds(view: MonthView, bounds: GroupsEnquiryDateBounds): MonthView {
  const min = parseIso(bounds.min);
  const max = parseIso(bounds.max);
  let idx = monthIndex(view.year, view.month);
  if (min) {
    const minIdx = monthIndex(min.year, min.month);
    if (idx < minIdx) idx = minIdx;
  }
  if (max) {
    const maxIdx = monthIndex(max.year, max.month);
    if (idx > maxIdx) idx = maxIdx;
  }
  return fromMonthIndex(idx);
}

function initialView(bounds: GroupsEnquiryDateBounds, selected: string): MonthView {
  const fromSelected = parseIso(selected);
  if (fromSelected) return { year: fromSelected.year, month: fromSelected.month };
  const min = parseIso(bounds.min);
  if (min) return { year: min.year, month: min.month };
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

export function mountGroupsDatePicker(config: {
  host: HTMLElement;
  hiddenInput: HTMLInputElement;
  locale: Locale;
  changeDateLabel: string;
  getVenue: () => GroupsEnquiryVenue | null;
  getBounds: () => GroupsEnquiryDateBounds;
  onChange: () => void;
}): GroupsDatePicker {
  const { host, hiddenInput, locale, changeDateLabel, getVenue, getBounds, onChange } = config;

  let view = initialView(getBounds(), hiddenInput.value.trim());
  let calendarExpanded = !hiddenInput.value.trim();

  const summary = document.createElement('div');
  summary.className = 'fondue-groups-cal-summary';
  summary.hidden = true;

  const summaryValue = document.createElement('p');
  summaryValue.className = 'fondue-groups-cal-summary-value';

  const changeBtn = document.createElement('button');
  changeBtn.type = 'button';
  changeBtn.className = 'fondue-groups-cal-summary-change';
  changeBtn.textContent =
    changeDateLabel || (locale === 'en' ? 'Change date' : 'Datum ändern');

  summary.append(summaryValue, changeBtn);

  const panel = document.createElement('div');
  panel.className = 'fondue-groups-cal-panel';

  const nav = document.createElement('div');
  nav.className = 'fondue-groups-cal-nav';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'fondue-groups-cal-nav-btn';
  prevBtn.setAttribute('aria-label', locale === 'en' ? 'Previous month' : 'Vorheriger Monat');
  prevBtn.textContent = '‹';

  const title = document.createElement('div');
  title.className = 'fondue-groups-cal-title';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'fondue-groups-cal-nav-btn';
  nextBtn.setAttribute('aria-label', locale === 'en' ? 'Next month' : 'Nächster Monat');
  nextBtn.textContent = '›';

  nav.append(prevBtn, title, nextBtn);

  const weekdays = document.createElement('div');
  weekdays.className = 'fondue-groups-cal-weekdays';
  weekdays.setAttribute('aria-hidden', 'true');
  for (const label of weekdayLabels(locale)) {
    const cell = document.createElement('span');
    cell.textContent = label;
    weekdays.append(cell);
  }

  const grid = document.createElement('div');
  grid.className = 'fondue-groups-cal-grid';
  grid.setAttribute('role', 'grid');

  panel.append(nav, weekdays, grid);
  host.replaceChildren(summary, panel);

  function syncCollapsedState() {
    const selected = hiddenInput.value.trim();
    const picked = Boolean(selected && !calendarExpanded);
    summary.hidden = !picked;
    panel.hidden = picked;
    host.classList.toggle('fondue-groups-date-picker--picked', picked);
    if (selected) {
      fillSummaryDateValue(summaryValue, selected, locale);
    }
  }

  function canNavigate(delta: number): boolean {
    const bounds = getBounds();
    const next = fromMonthIndex(monthIndex(view.year, view.month) + delta);
    const clamped = clampViewToBounds(next, bounds);
    return clamped.year === next.year && clamped.month === next.month;
  }

  function render() {
    const bounds = getBounds();
    const venue = getVenue();
    view = clampViewToBounds(view, bounds);
    title.textContent = monthTitle(view, locale);

    prevBtn.disabled = !canNavigate(-1);
    nextBtn.disabled = !canNavigate(1);

    grid.replaceChildren();
    const offset = mondayFirstOffset(view.year, view.month);
    const totalDays = daysInMonth(view.year, view.month);
    const selected = hiddenInput.value.trim();

    for (let i = 0; i < offset; i++) {
      const pad = document.createElement('span');
      pad.className = 'fondue-groups-cal-pad';
      pad.setAttribute('aria-hidden', 'true');
      grid.append(pad);
    }

    for (let day = 1; day <= totalDays; day++) {
      const iso = isoFromParts(view.year, view.month, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fondue-groups-cal-day';
      btn.textContent = String(day);
      btn.dataset.date = iso;

      const inBounds =
        (!bounds.min || compareIso(iso, bounds.min) >= 0) &&
        (!bounds.max || compareIso(iso, bounds.max) <= 0);
      const valid = Boolean(venue && inBounds && groupsEnquiryIsValidDate(iso, venue, bounds));

      if (!valid) {
        btn.disabled = true;
        btn.classList.add('fondue-groups-cal-day--disabled');
      }
      if (iso === selected) {
        btn.classList.add('fondue-groups-cal-day--selected');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.setAttribute('aria-pressed', 'false');
      }

      btn.addEventListener('click', () => {
        if (!valid) return;
        hiddenInput.value = iso;
        calendarExpanded = false;
        render();
        onChange();
      });

      grid.append(btn);
    }

    syncCollapsedState();
  }

  changeBtn.addEventListener('click', () => {
    calendarExpanded = true;
    const selected = hiddenInput.value.trim();
    const fromSelected = parseIso(selected);
    if (fromSelected) {
      view = { year: fromSelected.year, month: fromSelected.month };
    }
    render();
    grid.querySelector<HTMLButtonElement>('.fondue-groups-cal-day--selected')?.focus();
  });

  prevBtn.addEventListener('click', () => {
    if (!canNavigate(-1)) return;
    view = fromMonthIndex(monthIndex(view.year, view.month) - 1);
    render();
  });

  nextBtn.addEventListener('click', () => {
    if (!canNavigate(1)) return;
    view = fromMonthIndex(monthIndex(view.year, view.month) + 1);
    render();
  });

  return {
    syncVenue() {
      const venue = getVenue();
      const bounds = getBounds();
      const value = hiddenInput.value.trim();
      if (value && venue && !groupsEnquiryIsValidDate(value, venue, bounds)) {
        hiddenInput.value = '';
        calendarExpanded = true;
      }
      view = initialView(bounds, hiddenInput.value.trim());
      render();
    },
    validate() {
      hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
    },
    reset() {
      hiddenInput.value = '';
      calendarExpanded = true;
      view = initialView(getBounds(), '');
      render();
    },
    getValue() {
      return hiddenInput.value.trim();
    },
  };
}
