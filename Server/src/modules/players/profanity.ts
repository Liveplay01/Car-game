/**
 * A first line of defence for names (English and German), not a promise. It reads past the usual
 * tricks (capitals, accents, l33t, dots and spaces between letters, stretched letters) and leaves
 * innocent names alone ("Assassin", "Bassist"). What slips through is removed by hand
 * (`/v1/admin`), and a player can be renamed there.
 */

/** Letters a player may swap for look-alikes. */
const LOOK_ALIKES: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
  '+': 't',
};

/** Latin letters that do not break down into a base letter and an accent, so NFKD leaves them alone. */
const PLAIN_LETTERS: Record<string, string> = { 'ı': 'i', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'ł': 'l', 'ħ': 'h', 'ŧ': 't', 'æ': 'ae', 'œ': 'oe', 'þ': 'th', 'ĸ': 'k' };

/** Lower case, no accents (ä → a, ß → ss, ı → i), look-alikes folded back to letters. Keeps separators. */
export function fold(text: string): string {
  return text
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[ıøđðłħŧæœþĸ]/g, (ch) => PLAIN_LETTERS[ch] ?? ch)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[0134578@$!|+]/g, (ch) => LOOK_ALIKES[ch] ?? ch);
}

/** Found anywhere in the name, even inside a longer word or split up by separators. */
const ANYWHERE = [
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'bastard', 'asshole', 'arsehole', 'dickhead', 'cocksucker', 'wanker', 'twat',
  'jerkoff', 'blowjob', 'handjob', 'rapist', 'molest', 'nigg', 'nigar', 'faggot', 'retard', 'spastic', 'tranny', 'chink', 'gook', 'wetback',
  'hitler', 'nazi', 'siegheil', 'heilhitler', 'kkk', 'holocaust', 'auschwitz',
  'scheisse', 'scheiss', 'arschloch', 'arschgeige', 'wichser', 'wixer', 'hurensohn', 'hurenkind', 'fotze', 'votze', 'schlampe',
  'miststuck', 'missgeburt', 'behindert', 'kanake', 'neger', 'judensau', 'fick', 'vollidiot', 'schwuchtel', 'pisser', 'pimmel',
  'mutterficker', 'bumsen', 'vergewaltig', 'porn', 'penis', 'vagina', 'titten', 'orgasm',
];

/** Only as a word of its own: short, or common inside other words ("Torpedo", "Raccoon"). */
const AS_WORD = [
  'ass', 'arse', 'cum', 'sex', 'tit', 'tits', 'dick', 'cock', 'pussy', 'fag', 'fags', 'homo', 'nig', 'anal', 'rape', 'piss', 'dildo',
  'boobs', 'nutsack', 'pedo', 'paedo', 'coon', 'kike', 'mongo', 'nsdap', 'hure', 'nutte', 'sau', 'kack', 'kacke', 'arsch', 'scheisser',
  'spast', 'idiot', 'pisse', 'lutscher', 'ficker', 'schwanz',
];

/** `fuck` → /f+u+c+k+/ : stretched letters ("fuuuck") still match. */
function stretchy(word: string): string {
  return [...word].map((ch) => `${ch}+`).join('');
}

const anywhere = new RegExp(ANYWHERE.map(stretchy).join('|'));
const asWord = new RegExp(`^(?:${AS_WORD.map(stretchy).join('|')})$`);

/** True when the name contains something that should not stand on a public list. */
export function isOffensive(name: string): boolean {
  const folded = fold(name);
  // "f.u.c.k" and "f u c k": look at the letters alone, too.
  const letters = folded.replace(/[^a-z]/g, '');
  if (anywhere.test(letters)) return true;
  // "ass" is fine inside "Assassin" but not as a name of its own ("Big Ass", "a_s_s").
  const words = folded.split(/[^a-z]+/).filter(Boolean);
  if (words.some((word) => asWord.test(word))) return true;
  return asWord.test(letters);
}
