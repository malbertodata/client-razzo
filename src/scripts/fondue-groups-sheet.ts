const sheet = document.getElementById('fondue-groups-sheet');
const openBtn = document.querySelector<HTMLButtonElement>('[data-groups-sheet-open]');
const closeBtn = document.querySelector<HTMLButtonElement>('[data-groups-sheet-close]');
const sendBtn = document.querySelector<HTMLButtonElement>('[data-groups-sheet-send]');
const backdrop = sheet?.querySelector<HTMLElement>('[data-groups-sheet-backdrop]');

let activeMailto: string | null = null;

function openSheet(mailto: string) {
  if (!sheet) return;
  activeMailto = mailto;
  sheet.hidden = false;
  document.body.classList.add('fondue-groups-open');
  closeBtn?.focus();
}

function closeSheet() {
  if (!sheet) return;
  sheet.hidden = true;
  document.body.classList.remove('fondue-groups-open');
  activeMailto = null;
  openBtn?.focus();
}

openBtn?.addEventListener('click', () => {
  const mailto = openBtn.getAttribute('data-mailto');
  if (!mailto) return;
  openSheet(mailto);
});

closeBtn?.addEventListener('click', () => closeSheet());
backdrop?.addEventListener('click', () => closeSheet());

sendBtn?.addEventListener('click', () => {
  if (!activeMailto) return;
  window.location.href = activeMailto;
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || sheet?.hidden) return;
  closeSheet();
});
