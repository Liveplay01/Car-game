import { MONEY_MARK } from './icons';

/** Numbers in the device's format: 1,000 or 1.000. */
const grouping = (() => {
  try {
    const parts = new Intl.NumberFormat(undefined).formatToParts(12345);
    return parts.find((p) => p.type === 'group')?.value ?? ',';
  } catch {
    return ',';
  }
})();

export const Fmt = {
  number(value: number): string {
    const n = Math.round(value);
    const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, grouping);
    return n < 0 ? '−' + digits : digits;
  },
  signed: (value: number): string => (value > 0 ? '+' + Fmt.number(value) : Fmt.number(value)),
  seconds(seconds: number): string {
    const tenths = Math.round(Math.max(0, seconds) * 10);
    return `${Fmt.number(Math.floor(tenths / 10))}.${tenths % 10} s`;
  },
};

export const money = (formatted: string): string => `${MONEY_MARK}${formatted}`;
export const percent = (share: number): string => `${Math.round(share * 100)} %`;
const trimmed = (value: number): string => String(+value.toFixed(2));
export const multiplier = (value: number): string => `${trimmed(value)}×`;
export const comboMultiplier = (value: number): string => `×${trimmed(value)}`;
