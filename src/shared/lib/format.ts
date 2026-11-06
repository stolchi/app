import i18n from '@/shared/i18n';

const TIME_ZONE = 'Asia/Tashkent';

const groupDigits = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const formatMoney = (amount: number) =>
  i18n.t('common.money', { amount: groupDigits(amount) });

/** For showing a whole-so'm amount in an input. */
export const formatAmountInput = groupDigits;

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

export const formatDateTime = (iso: string) =>
  `${dateFormat.format(new Date(iso)).replaceAll('/', '.')} ${formatTime(iso)}`;

/** Today in the cafe's time zone, whatever the device's clock zone is. */
export const todayInTashkent = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);

const collator = new Intl.Collator('uz', {
  numeric: true,
  sensitivity: 'base',
});

/** "Stol 2" comes before "Stol 10". */
export const sortByName = <T extends { name: string }>(items: readonly T[]) =>
  [...items].sort((a, b) => collator.compare(a.name, b.name));
