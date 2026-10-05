export type Raw = Record<string, unknown>;

export const isObject = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);

/** A whole number in [min, max]. */
export const isInt = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
