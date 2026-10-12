import type { Strings, Translation } from '../strings';
import museum from './de/museum';
import p1 from './de/p1';
import p2 from './de/p2';
import p3 from './de/p3';
import p4 from './de/p4';
import p5 from './de/p5';
import p6 from './de/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
