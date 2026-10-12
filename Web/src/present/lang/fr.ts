import type { Strings, Translation } from '../strings';
import museum from './fr/museum';
import p1 from './fr/p1';
import p2 from './fr/p2';
import p3 from './fr/p3';
import p4 from './fr/p4';
import p5 from './fr/p5';
import p6 from './fr/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
