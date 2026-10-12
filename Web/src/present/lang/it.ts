import type { Strings, Translation } from '../strings';
import museum from './it/museum';
import p1 from './it/p1';
import p2 from './it/p2';
import p3 from './it/p3';
import p4 from './it/p4';
import p5 from './it/p5';
import p6 from './it/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
