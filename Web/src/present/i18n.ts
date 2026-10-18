/** The languages the game speaks. The words themselves live in `present/lang/<code>.ts`, loaded once at start (`strings.ts`). */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '简体中文' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Device-wide, not part of the save: the words are chosen before the save is read. */
const KEY = 'carGame.lang';

const known = (code: string | null | undefined): code is LanguageCode => LANGUAGES.some((l) => l.code === code);

/** The chosen language; before any choice, the browser's (`de-AT` speaks German); English where nothing fits or there is no browser (tests, the build). */
export function currentLanguage(): LanguageCode {
  if (typeof document === 'undefined') return 'en';
  try {
    const chosen = localStorage.getItem(KEY);
    if (known(chosen)) return chosen;
  } catch {
    /* storage blocked: the browser's language will do */
  }
  const preferred = navigator.languages?.map((l) => l.slice(0, 2).toLowerCase()).find(known);
  return preferred ?? 'en';
}

/** Remembers the choice and starts the game again: every text, sheet and canvas label is then built in the new language. */
export function chooseLanguage(code: LanguageCode): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* the choice only lasts until the next start */
  }
  location.reload();
}

type Plain = Record<string, unknown>;

/** Lays the words of a translation over the English ones, in place: what a language does not have yet stays English. */
export function overlay(target: Plain, words: Plain): void {
  for (const [key, value] of Object.entries(words)) {
    const own = target[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && own !== null && typeof own === 'object') overlay(own as Plain, value as Plain);
    else if (value !== undefined) target[key] = value;
  }
}

/** A translation has the shape of the English texts, every part optional. */
export type Words<T> = { [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? Words<T[K]> : T[K] };
