import {
  groupsEnquiryBookableTimes,
  groupsEnquiryBookableTimeWindows,
  groupsEnquiryChaletClosedWeekday,
  groupsEnquiryIsDateInBounds,
  groupsEnquiryIsValidDate,
  groupsEnquiryRestaurantDateBounds,
  groupsEnquiryWeekdayFromIso,
  type GroupsEnquiryDateBounds,
} from '@/lib/aleno';
import { trackUmamiEvent } from '@/lib/analytics';
import {
  composeGroupsEnquiryPhone,
  GROUPS_ENQUIRY_DEFAULT_PHONE_CODE,
  isValidGroupsEnquiryEmail,
  isValidGroupsEnquiryPhone,
  normalizeGroupsEnquiryPhone,
  splitGroupsEnquiryPhone,
} from '@/lib/groups-enquiry-validation';
import type { GroupsEnquiryVenue, Locale } from '@/lib/i18n';
import {
  hasGroupsEnquiryUtm,
  normalizeGroupsEnquiryUtmInput,
  parseGroupsEnquiryUtm,
  type GroupsEnquiryUtmAttribution,
} from '@/lib/utm';
import { mountGroupsDatePicker, type GroupsDatePicker } from './fondue-groups-date-picker';

// iOS Safari keeps the focus zoom after the sheet closes. maximum-scale=1 stops that auto-zoom
// while iOS still allows pinch zoom; other platforms would lose pinch zoom, so iOS only.
function preventIosInputZoom() {
  const isIos =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIos) return;
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (viewport && !/maximum-scale/.test(viewport.content)) {
    viewport.content = `${viewport.content}, maximum-scale=1`;
  }
}

preventIosInputZoom();

const sheet = document.getElementById('fondue-groups-sheet');
const openBtn = document.querySelector<HTMLButtonElement>('[data-groups-sheet-open]');
const closeBtn = document.querySelector<HTMLButtonElement>('[data-groups-sheet-close]');
const cancelConfirm = document.getElementById('fondue-groups-cancel-confirm');
const cancelDismissBtn = document.querySelector<HTMLButtonElement>('[data-groups-cancel-dismiss]');
const form = document.querySelector<HTMLFormElement>('[data-groups-form]');
const nameInput = form?.querySelector<HTMLInputElement>('#fondue-groups-name');
const emailInput = form?.querySelector<HTMLInputElement>('#fondue-groups-email');
const phoneInput = form?.querySelector<HTMLInputElement>('#fondue-groups-phone');
const phoneCodeSelect = form?.querySelector<HTMLSelectElement>('#fondue-groups-phone-code');
const notesInput = form?.querySelector<HTMLTextAreaElement>('#fondue-groups-notes');
const step1Panel = form?.querySelector<HTMLElement>('[data-groups-step="1"]');
const step2Panel = form?.querySelector<HTMLElement>('[data-groups-step="2"]');
const stepNextBtn = form?.querySelector<HTMLButtonElement>('[data-groups-step-next]');
const stepBackBtn = form?.querySelector<HTMLButtonElement>('[data-groups-step-back]');
const submitBtn = form?.querySelector<HTMLButtonElement>('[data-groups-submit]');
const submitStatus = document.getElementById('fondue-groups-submit-status');
const formStage = form?.querySelector<HTMLElement>('.fondue-groups-form-stage');
const formBody = document.getElementById('fondue-groups-form-body');
const successPanel = document.getElementById('fondue-groups-form-success');
const submitDefaultLabel = submitBtn?.textContent?.trim() ?? '';
const GROUPS_ENQUIRY_FETCH_MS = 25_000;
const successMessage = successPanel?.querySelector<HTMLElement>('[data-groups-success-message]');
let enquirySubmitSucceeded = false;
const dateInput = form?.querySelector<HTMLInputElement>('#fondue-groups-date');
const datePickerHost = document.getElementById('fondue-groups-date-picker');
const timeInput = form?.querySelector<HTMLInputElement>('#fondue-groups-time');
const timeField = document.getElementById('fondue-groups-time-field');
const timeWindowsHost = document.getElementById('fondue-groups-time-windows');
const timeEmpty = document.getElementById('fondue-groups-time-empty');
const venueInputs = form?.querySelectorAll<HTMLInputElement>('input[name="venue"]');
const groupSizeInput = form?.querySelector<HTMLInputElement>('#fondue-groups-size');
const groupSizeField = document.getElementById('fondue-groups-size-field');
const groupSizeDisplay = document.getElementById('fondue-groups-size-display');
const GROUPS_UTM_STORAGE_KEY = 'fondue-groups-utm';

function parseLocale(raw: string | undefined): Locale {
  return raw === 'en' ? 'en' : 'de';
}

function readGroupsUtmAttribution(): GroupsEnquiryUtmAttribution {
  const fromUrl = parseGroupsEnquiryUtm(new URLSearchParams(window.location.search));
  if (hasGroupsEnquiryUtm(fromUrl)) {
    try {
      sessionStorage.setItem(GROUPS_UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      /* optional */
    }
    return fromUrl;
  }
  try {
    const stored = sessionStorage.getItem(GROUPS_UTM_STORAGE_KEY);
    if (stored) return normalizeGroupsEnquiryUtmInput(JSON.parse(stored));
  } catch {
    /* optional */
  }
  return fromUrl;
}

function selectedVenue(): GroupsEnquiryVenue | null {
  const checked = form?.querySelector<HTMLInputElement>('input[name="venue"]:checked');
  if (checked?.value === 'chalet' || checked?.value === 'restaurant') return checked.value;
  return null;
}

function dateBoundsForVenue(venue: GroupsEnquiryVenue): GroupsEnquiryDateBounds {
  if (venue === 'restaurant') {
    const datasetMax = form?.dataset.restaurantDateMax?.trim() ?? '';
    return {
      ...groupsEnquiryRestaurantDateBounds(new Date()),
      max: datasetMax,
    };
  }
  return {
    min: form?.dataset.chaletDateMin?.trim() ?? '',
    max: form?.dataset.chaletDateMax?.trim() ?? '',
  };
}

function windowRangeLabel(window: { rangeStart: string; rangeEnd: string }): string {
  return `${window.rangeStart} - ${window.rangeEnd}`;
}

let timePickerExpanded = true;
let groupSizeSelected = false;

function timePickerHost(): HTMLElement | null {
  return timeWindowsHost?.querySelector<HTMLElement>('.fondue-groups-time-picker-host') ?? null;
}

function syncTimeCollapsedState() {
  const host = timePickerHost();
  if (!host || !timeInput) return;

  const summary = host.querySelector<HTMLElement>('.fondue-groups-time-summary');
  const picker = host.querySelector<HTMLElement>('.fondue-groups-time-picker');
  const valueEl = host.querySelector<HTMLElement>('.fondue-groups-time-summary-value');
  const time = timeInput.value.trim();
  const picked = Boolean(time && !timePickerExpanded);

  summary?.toggleAttribute('hidden', !picked);
  picker?.toggleAttribute('hidden', picked);
  host.classList.toggle('fondue-groups-date-picker--picked', picked);
  if (valueEl && time) valueEl.textContent = time;
}

function selectTimeCell(time: string, selectedBtn: HTMLButtonElement) {
  if (!timeInput || !timeWindowsHost) return;
  timeInput.value = time;
  timeInput.setCustomValidity('');
  timeWindowsHost.querySelectorAll('.fondue-groups-time-cell').forEach((el) => {
    const selected = el === selectedBtn;
    el.classList.toggle('fondue-groups-time-cell--selected', selected);
    el.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  timePickerExpanded = false;
  syncTimeCollapsedState();
  syncGroupSizeVisibility({ scrollIntoView: true });
}

function activateTimeTab(
  tablist: HTMLElement,
  panels: HTMLElement[],
  tabs: HTMLButtonElement[],
  index: number,
) {
  tabs.forEach((tab, i) => {
    const active = i === index;
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
    tab.classList.toggle('fondue-groups-time-tab--selected', active);
    tab.tabIndex = active ? 0 : -1;
    panels[i]!.hidden = !active;
  });
  tablist.dataset.activeIndex = String(index);
}

function defaultGroupSizeValue(): string {
  if (!groupSizeInput) return '45';
  const min = Number(groupSizeInput.min);
  const max = Number(groupSizeInput.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '45';
  return String(Math.round((min + max) / 2));
}

function groupSizeChooseLabel(): string {
  return form?.dataset.groupSizeChoose?.trim() || 'Bitte wählen';
}

function syncGroupSizeRangeFill() {
  if (!groupSizeInput) return;
  const min = Number(groupSizeInput.min);
  const max = Number(groupSizeInput.max);
  const value = Number(groupSizeInput.value);
  const span = max - min;
  const pct = span <= 0 ? 0 : ((value - min) / span) * 100;
  groupSizeInput.style.setProperty('--range-fill-pct', `${pct}%`);
}

function syncGroupSizeDisplay() {
  if (!groupSizeInput || !groupSizeDisplay) return;
  groupSizeDisplay.textContent = groupSizeSelected
    ? groupSizeInput.value
    : groupSizeChooseLabel();
  groupSizeField?.classList.toggle('fondue-groups-field--size-pending', !groupSizeSelected);
  syncGroupSizeRangeFill();
}

function syncGroupSizeVisibility(options: { scrollIntoView?: boolean } = {}) {
  const date = dateInput?.value.trim() ?? '';
  const time = timeInput?.value.trim() ?? '';
  const show = Boolean(date && time);
  if (!groupSizeField || !groupSizeInput) return;

  groupSizeField.hidden = !show;
  groupSizeInput.disabled = !show;

  if (!show) {
    resetGroupSizeSelection();
  } else {
    syncGroupSizeDisplay();
  }

  syncStepNextButton();

  if (show && options.scrollIntoView) {
    groupSizeField.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function resetGroupSizeSelection() {
  groupSizeSelected = false;
  if (groupSizeInput) groupSizeInput.value = defaultGroupSizeValue();
  syncGroupSizeDisplay();
}

const datePicker: GroupsDatePicker | null =
  form && dateInput && datePickerHost
    ? mountGroupsDatePicker({
        host: datePickerHost,
        hiddenInput: dateInput,
        locale: parseLocale(form.dataset.groupsLocale),
        changeDateLabel: form.dataset.dateChange?.trim() ?? '',
        getVenue: selectedVenue,
        getBounds: () => {
          const venue = selectedVenue();
          return venue ? dateBoundsForVenue(venue) : { min: '', max: '' };
        },
        onChange: () => {
          validateDateInput();
          syncTimeSlides({ scrollToStart: true });
        },
      })
    : null;

function validateDateInput() {
  if (!form || !dateInput) return;

  const venue = selectedVenue();
  const date = dateInput.value.trim();
  const closedMsg = form.dataset.dateClosed ?? '';
  const chaletClosedMsg = form.dataset.dateClosedChalet ?? closedMsg;

  if (!venue || !date) {
    dateInput.setCustomValidity(
      localeRequiredDateMessage(parseLocale(form.dataset.groupsLocale)),
    );
    return;
  }

  const bounds = dateBoundsForVenue(venue);
  if (groupsEnquiryIsValidDate(date, venue, bounds)) {
    dateInput.setCustomValidity('');
    return;
  }

  if (venue === 'chalet' && groupsEnquiryIsDateInBounds(date, bounds)) {
    const weekday = groupsEnquiryWeekdayFromIso(date);
    if (weekday !== null && groupsEnquiryChaletClosedWeekday(weekday)) {
      dateInput.setCustomValidity(chaletClosedMsg);
      return;
    }
  }

  dateInput.setCustomValidity(closedMsg);
}

function localeRequiredDateMessage(locale: Locale): string {
  return locale === 'en' ? 'Please choose a date.' : 'Bitte ein Datum wählen.';
}

function syncTimeSlides(options: { scrollToStart?: boolean } = {}) {
  if (!form || !timeInput || !timeField || !timeWindowsHost || !timeEmpty) return;

  const closedLabel = form.dataset.timeClosed ?? '';
  const date = dateInput?.value.trim() ?? '';
  const venue = selectedVenue();
  const previous = timeInput.value.trim();

  timeWindowsHost.replaceChildren();
  timeInput.value = '';
  timeInput.setCustomValidity('');
  timeEmpty.hidden = true;
  timeEmpty.textContent = '';

  if (!date || !venue) {
    timeField.hidden = true;
    timeInput.setCustomValidity(localeRequiredTimeMessage(parseLocale(form.dataset.groupsLocale)));
    syncGroupSizeVisibility();
    return;
  }

  timeField.hidden = false;

  const bounds = dateBoundsForVenue(venue);
  if (!groupsEnquiryIsValidDate(date, venue, bounds)) {
    timeEmpty.textContent = closedLabel;
    timeEmpty.hidden = false;
    syncGroupSizeVisibility();
    return;
  }

  const windows = groupsEnquiryBookableTimeWindows(date, venue);
  const allTimes = groupsEnquiryBookableTimes(date, venue);
  if (windows.length === 0 || allTimes.length === 0) {
    timeEmpty.textContent = closedLabel;
    timeEmpty.hidden = false;
    syncGroupSizeVisibility();
    return;
  }

  const keepPrevious = previous && allTimes.includes(previous);
  if (keepPrevious) timeInput.value = previous;
  timePickerExpanded = !keepPrevious;

  const locale = parseLocale(form.dataset.groupsLocale);
  const changeTimeLabel =
    form.dataset.timeChange?.trim() ||
    (locale === 'en' ? 'Change time' : 'Uhrzeit ändern');

  let activeIndex = 0;
  if (keepPrevious) {
    const match = windows.findIndex((window) => window.times.includes(previous));
    if (match >= 0) activeIndex = match;
  }

  const host = document.createElement('div');
  host.className = 'fondue-groups-time-picker-host fondue-groups-date-picker';

  const summary = document.createElement('div');
  summary.className = 'fondue-groups-cal-summary fondue-groups-time-summary';
  summary.hidden = true;

  const summaryValue = document.createElement('p');
  summaryValue.className = 'fondue-groups-cal-summary-value fondue-groups-time-summary-value';

  const changeTimeBtn = document.createElement('button');
  changeTimeBtn.type = 'button';
  changeTimeBtn.className = 'fondue-groups-cal-summary-change';
  changeTimeBtn.textContent = changeTimeLabel;
  changeTimeBtn.addEventListener('click', () => {
    timePickerExpanded = true;
    syncTimeCollapsedState();
    host.querySelector<HTMLElement>('.fondue-groups-time-cell--selected')?.focus();
  });

  summary.append(summaryValue, changeTimeBtn);

  const picker = document.createElement('div');
  picker.className = 'fondue-groups-time-picker';

  const shell = document.createElement('div');
  shell.className = 'fondue-groups-time-tabs';

  const useTabs = windows.length > 1;
  let tablist: HTMLElement | null = null;
  const tabs: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];

  if (useTabs) {
    tablist = document.createElement('div');
    tablist.className = 'fondue-groups-time-tablist';
    tablist.setAttribute('role', 'tablist');
  }

  const panelWrap = document.createElement('div');
  panelWrap.className = 'fondue-groups-time-window';

  windows.forEach((window, index) => {
    const rangeLabel = windowRangeLabel(window);
    const tabId = `fondue-groups-time-tab-${index}`;
    const panelId = `fondue-groups-time-panel-${index}`;

    if (tablist) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'fondue-groups-time-tab';
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelId);
      tab.textContent = rangeLabel;
      tab.addEventListener('click', () => {
        if (!tablist) return;
        activateTimeTab(tablist, panels, tabs, index);
      });
      tabs.push(tab);
      tablist.append(tab);
    }

    const grid = document.createElement('div');
    grid.className = 'fondue-groups-time-grid';
    grid.id = panelId;
    grid.setAttribute('role', useTabs ? 'tabpanel' : 'listbox');
    if (useTabs) {
      grid.setAttribute('aria-labelledby', tabId);
      grid.hidden = index !== activeIndex;
    } else {
      grid.setAttribute('aria-label', rangeLabel);
    }

    for (const time of window.times) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fondue-groups-time-cell';
      btn.textContent = time;
      btn.dataset.time = time;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', keepPrevious && time === previous ? 'true' : 'false');
      if (keepPrevious && time === previous) {
        btn.classList.add('fondue-groups-time-cell--selected');
      }
      btn.addEventListener('click', () => selectTimeCell(time, btn));
      grid.append(btn);
    }

    panels.push(grid);
    panelWrap.append(grid);
  });

  if (tablist) {
    shell.append(tablist);
    activateTimeTab(tablist, panels, tabs, activeIndex);
  }
  shell.append(panelWrap);
  picker.append(shell);
  host.append(summary, picker);
  timeWindowsHost.append(host);
  syncTimeCollapsedState();

  if (options.scrollToStart && !keepPrevious) {
    timeField.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  syncGroupSizeVisibility();
}

function localeRequiredTimeMessage(locale: Locale): string {
  return locale === 'en' ? 'Please choose a time.' : 'Bitte eine Uhrzeit wählen.';
}

function groupsEnquiryEmailInvalidMessage(): string {
  return form?.dataset.submitInvalidEmail?.trim() || 'Bitte eine gültige E-Mail-Adresse eingeben.';
}

function groupsEnquiryPhoneInvalidMessage(): string {
  return form?.dataset.submitInvalidPhone?.trim() || 'Bitte eine gültige Telefonnummer eingeben.';
}

function syncPhoneInputFromAutofill() {
  if (!phoneInput) return;
  const split = phoneCodeSelect ? splitGroupsEnquiryPhone(phoneInput.value) : null;
  if (split && phoneCodeSelect) {
    phoneCodeSelect.value = split.code;
    phoneInput.value = split.national;
    return;
  }
  const normalized = normalizeGroupsEnquiryPhone(phoneInput.value);
  if (normalized !== phoneInput.value) {
    phoneInput.value = normalized;
  }
}

function composedPhoneValue(): string {
  if (!phoneInput) return '';
  return composeGroupsEnquiryPhone(
    phoneCodeSelect?.value || GROUPS_ENQUIRY_DEFAULT_PHONE_CODE,
    phoneInput.value,
  );
}

function validatePhoneInput(syncValue = true): boolean {
  if (!phoneInput) return true;
  if (syncValue) syncPhoneInputFromAutofill();
  const value = composedPhoneValue();
  if (!value) {
    phoneInput.setCustomValidity('');
    return true;
  }
  if (!isValidGroupsEnquiryPhone(value)) {
    phoneInput.setCustomValidity(groupsEnquiryPhoneInvalidMessage());
    return false;
  }
  phoneInput.setCustomValidity('');
  return true;
}

function validateEmailInput(): boolean {
  if (!emailInput) return true;
  const value = emailInput.value.trim();
  if (!value) {
    emailInput.setCustomValidity('');
    return true;
  }
  if (!isValidGroupsEnquiryEmail(value)) {
    emailInput.setCustomValidity(groupsEnquiryEmailInvalidMessage());
    return false;
  }
  emailInput.setCustomValidity('');
  return true;
}

function setContactFieldsEnabled(enabled: boolean) {
  for (const field of [nameInput, emailInput, phoneInput, phoneCodeSelect, notesInput]) {
    if (!field) continue;
    field.disabled = !enabled;
  }
}

function setFormStep(step: 1 | 2) {
  step1Panel?.toggleAttribute('hidden', step !== 1);
  step2Panel?.toggleAttribute('hidden', step !== 2);
  setContactFieldsEnabled(step === 2);
}

function canAdvanceFromStep1(): boolean {
  if (!form || !dateInput || !timeInput || !groupSizeInput) return false;
  const venue = selectedVenue();
  const date = dateInput.value.trim();
  const time = timeInput.value.trim();
  if (!venue || !date || !time || !groupSizeSelected) return false;
  const bounds = dateBoundsForVenue(venue);
  if (!groupsEnquiryIsValidDate(date, venue, bounds)) return false;
  if (!groupsEnquiryBookableTimes(date, venue).includes(time)) return false;
  const size = Number(groupSizeInput.value);
  return Number.isFinite(size) && size >= 9 && size <= 80;
}

function syncStepNextButton() {
  if (!stepNextBtn) return;
  stepNextBtn.disabled = !canAdvanceFromStep1();
}

function validateStep1(): boolean {
  if (!form || !dateInput || !timeInput) return false;
  const locale = parseLocale(form.dataset.groupsLocale);
  validateDateInput();
  if (!timeInput.value.trim()) {
    timeInput.setCustomValidity(localeRequiredTimeMessage(locale));
  } else {
    timeInput.setCustomValidity('');
  }
  if (!dateInput.checkValidity()) {
    dateInput.reportValidity();
    return false;
  }
  if (!timeInput.checkValidity()) {
    timeField?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return false;
  }
  if (!groupSizeSelected) {
    groupSizeField?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
    return false;
  }
  return canAdvanceFromStep1();
}

function syncVenueDependentFields() {
  datePicker?.syncVenue();
  validateDateInput();
  syncTimeSlides();
  syncStepNextButton();
}

function isGroupsFormDirty(): boolean {
  if (!form || !dateInput || !timeInput || !groupSizeInput) return false;
  if (dateInput.value.trim() || timeInput.value.trim()) return true;
  if (groupSizeSelected) return true;
  if (nameInput?.value.trim()) return true;
  if (emailInput?.value.trim()) return true;
  if (phoneInput?.value.trim()) return true;
  if (notesInput?.value.trim()) return true;
  const venue = selectedVenue();
  return venue === 'restaurant';
}

let cancelReturnFocus: HTMLElement | null = null;

function hideCancelConfirm() {
  cancelConfirm?.setAttribute('hidden', '');
  cancelConfirm?.parentElement?.classList.remove('fondue-groups-sheet-panel--confirm');
}

function showCancelConfirm(focusTarget: HTMLElement | null) {
  if (!cancelConfirm) return;
  cancelReturnFocus = focusTarget;
  cancelConfirm.parentElement?.classList.add('fondue-groups-sheet-panel--confirm');
  cancelConfirm.removeAttribute('hidden');
  cancelDismissBtn?.focus();
}

function requestCloseSheet(focusOnDismiss: HTMLElement | null) {
  if (enquirySubmitSucceeded || !isGroupsFormDirty()) {
    closeSheet();
    return;
  }
  showCancelConfirm(focusOnDismiss);
}

function clearSubmitStatus() {
  if (!submitStatus) return;
  submitStatus.hidden = true;
  submitStatus.textContent = '';
  submitStatus.classList.remove(
    'fondue-groups-submit-status--success',
    'fondue-groups-submit-status--error',
  );
}

function showSubmitStatus(kind: 'success' | 'error', message: string) {
  if (!submitStatus) return;
  submitStatus.hidden = false;
  submitStatus.textContent = message;
  submitStatus.classList.toggle('fondue-groups-submit-status--success', kind === 'success');
  submitStatus.classList.toggle('fondue-groups-submit-status--error', kind === 'error');
  submitStatus.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function hideSubmitSuccessView() {
  enquirySubmitSucceeded = false;
  formStage?.classList.remove('fondue-groups-form-stage--success');
  if (formBody) {
    formBody.hidden = false;
    formBody.removeAttribute('hidden');
    formBody.removeAttribute('aria-hidden');
  }
  if (successPanel) {
    successPanel.hidden = true;
    successPanel.setAttribute('hidden', '');
  }
}

function showSubmitSuccessView(message: string) {
  enquirySubmitSucceeded = true;
  clearSubmitStatus();
  const fallback =
    form?.dataset.submitSuccess?.trim() ||
    successMessage?.textContent?.trim() ||
    'Danke — Ihre Anfrage wurde gesendet.';
  if (successMessage) successMessage.textContent = message.trim() || fallback;
  formStage?.classList.add('fondue-groups-form-stage--success');
  if (formBody) {
    formBody.hidden = true;
    formBody.setAttribute('hidden', '');
    formBody.setAttribute('aria-hidden', 'true');
  }
  if (successPanel) {
    successPanel.hidden = false;
    successPanel.removeAttribute('hidden');
  }
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = submitDefaultLabel || submitBtn.textContent || '';
  }
  stepBackBtn?.removeAttribute('disabled');
  closeBtn?.focus();
}

function openSheet() {
  if (!sheet) return;
  sheet.hidden = false;
  hideCancelConfirm();
  hideSubmitSuccessView();
  clearSubmitStatus();
  setFormStep(1);
  resetGroupSizeSelection();
  document.body.classList.add('fondue-groups-open');
  trackUmamiEvent('groups_enquiry_open', {
    locale: parseLocale(form?.dataset.groupsLocale),
  });
  syncVenueDependentFields();
  syncGroupSizeVisibility();
  const firstField = step1Panel?.querySelector<HTMLElement>(
    'input:not([type="hidden"]), select, textarea, button',
  );
  firstField?.focus();
}

function closeSheet() {
  if (!sheet) return;
  hideCancelConfirm();
  hideSubmitSuccessView();
  timePickerExpanded = true;
  sheet.hidden = true;
  document.body.classList.remove('fondue-groups-open');
  form?.reset();
  datePicker?.reset();
  setFormStep(1);
  resetGroupSizeSelection();
  syncVenueDependentFields();
  openBtn?.focus();
}

openBtn?.addEventListener('click', () => openSheet());

closeBtn?.addEventListener('click', () => {
  if (cancelConfirm && !cancelConfirm.hidden) {
    closeSheet();
    return;
  }
  requestCloseSheet(closeBtn);
});
successPanel
  ?.querySelector<HTMLAnchorElement>('[data-groups-success-instagram]')
  ?.addEventListener('click', () => {
    trackUmamiEvent('groups_enquiry_instagram_click', {
      locale: parseLocale(form?.dataset.groupsLocale),
    });
  });
stepNextBtn?.addEventListener('click', () => {
  if (!validateStep1()) return;
  setFormStep(2);
  nameInput?.focus();
});
stepBackBtn?.addEventListener('click', () => {
  setFormStep(1);
  stepNextBtn?.focus();
});
cancelDismissBtn?.addEventListener('click', () => {
  hideCancelConfirm();
  cancelReturnFocus?.focus();
  cancelReturnFocus = null;
});

venueInputs?.forEach((input) => {
  input.addEventListener('change', () => syncVenueDependentFields());
});

function focusPhoneNationalInput() {
  if (!phoneInput || phoneInput.disabled) return;
  phoneInput.focus({ preventScroll: true });
}

function shouldAdvanceFromNameToPhone(): boolean {
  if (!nameInput?.value.trim()) return false;
  if (phoneInput?.value.trim()) return false;
  return Boolean(phoneInput && !phoneInput.disabled);
}

function scheduleFocusPhoneAfterName() {
  if (!shouldAdvanceFromNameToPhone()) return;
  requestAnimationFrame(() => {
    if (!shouldAdvanceFromNameToPhone()) return;
    const active = document.activeElement;
    if (
      active &&
      active !== nameInput &&
      active !== document.body &&
      form?.contains(active)
    ) {
      return;
    }
    focusPhoneNationalInput();
  });
}

nameInput?.addEventListener('keydown', (event) => {
  if (!shouldAdvanceFromNameToPhone()) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    focusPhoneNationalInput();
    return;
  }
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    focusPhoneNationalInput();
  }
});

nameInput?.addEventListener('blur', () => {
  scheduleFocusPhoneAfterName();
});

nameInput?.addEventListener('animationstart', () => {
  queueMicrotask(() => scheduleFocusPhoneAfterName());
});

nameInput?.addEventListener('change', () => {
  scheduleFocusPhoneAfterName();
});

emailInput?.addEventListener('input', () => {
  validateEmailInput();
});

// iOS Safari AutoFill may set the value after (or without) dispatching input/change.
function schedulePhoneAutofillSync(event?: Event) {
  // Leave keystrokes alone: "+4…" must not jump into the picker and spaces must stay typeable.
  // Keyboard suggestions and paste insert the whole number in one insertText event.
  const typing =
    event instanceof InputEvent &&
    (event.inputType.startsWith('delete') ||
      (event.inputType.startsWith('insertText') && (event.data?.length ?? 0) <= 1));
  if (typing) {
    validatePhoneInput(false);
    return;
  }
  queueMicrotask(() => validatePhoneInput());
  requestAnimationFrame(() => validatePhoneInput());
  window.setTimeout(() => validatePhoneInput(), 150);
}

for (const type of ['input', 'change', 'blur', 'animationstart'] as const) {
  phoneInput?.addEventListener(type, schedulePhoneAutofillSync);
}

for (const field of [nameInput, emailInput, notesInput]) {
  field?.addEventListener('focus', schedulePhoneAutofillSync);
}

phoneCodeSelect?.addEventListener('change', () => validatePhoneInput());

groupSizeInput?.addEventListener('input', () => {
  groupSizeSelected = true;
  syncGroupSizeDisplay();
  syncStepNextButton();
});
groupSizeInput?.addEventListener('change', () => {
  groupSizeSelected = true;
  syncGroupSizeDisplay();
  syncStepNextButton();
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form || submitBtn?.disabled) return;

  validateDateInput();
  if (!timeInput?.value.trim()) {
    timeInput?.setCustomValidity(localeRequiredTimeMessage(parseLocale(form.dataset.groupsLocale)));
  }
  const phoneOk = validatePhoneInput();
  const emailOk = validateEmailInput();
  if (!phoneOk || !emailOk || !form.reportValidity()) {
    if (!phoneOk) phoneInput?.focus();
    else if (!emailOk) emailInput?.focus();
    return;
  }

  const locale = parseLocale(form.dataset.groupsLocale);
  const data = new FormData(form);
  const venue = data.get('venue');
  if (venue !== 'chalet' && venue !== 'restaurant') return;

  const date = String(data.get('date') ?? '').trim();
  const time = String(data.get('time') ?? '').trim();
  const bounds = dateBoundsForVenue(venue);
  if (!groupsEnquiryIsValidDate(date, venue, bounds)) return;

  const allowed = groupsEnquiryBookableTimes(date, venue);
  if (!allowed.includes(time)) return;

  const payload = {
    locale,
    venue,
    date,
    time,
    groupSize: groupSizeInput?.value.trim() ?? '',
    name: String(data.get('name') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    phone: composedPhoneValue(),
    notes: String(data.get('notes') ?? '').trim(),
    utm: readGroupsUtmAttribution(),
  };

  const sendingLabel = form.dataset.submitSending?.trim() || '…';
  const successLabel = form.dataset.submitSuccess?.trim() || '';
  const errorLabel = form.dataset.submitError?.trim() || '';

  clearSubmitStatus();
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = sendingLabel;
  }
  stepBackBtn?.setAttribute('disabled', '');

  const controller = new AbortController();
  const fetchTimeoutId = window.setTimeout(() => controller.abort(), GROUPS_ENQUIRY_FETCH_MS);

  try {
    const res = await fetch('/api/groups-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!res.ok || !body?.ok) {
      if (body?.error === 'invalid_email') {
        emailInput?.setCustomValidity(groupsEnquiryEmailInvalidMessage());
        emailInput?.reportValidity();
        emailInput?.focus();
      } else if (body?.error === 'invalid_phone') {
        phoneInput?.setCustomValidity(groupsEnquiryPhoneInvalidMessage());
        phoneInput?.reportValidity();
        phoneInput?.focus();
      } else {
        showSubmitStatus('error', errorLabel);
      }
      return;
    }
    trackUmamiEvent('groups_enquiry_submit', {
      locale,
      venue,
    });
    showSubmitSuccessView(successLabel);
  } catch {
    showSubmitStatus('error', errorLabel);
  } finally {
    window.clearTimeout(fetchTimeoutId);
    if (enquirySubmitSucceeded) return;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitDefaultLabel;
    }
    stepBackBtn?.removeAttribute('disabled');
  }
});

setFormStep(1);
resetGroupSizeSelection();
syncGroupSizeVisibility();
hideSubmitSuccessView();
