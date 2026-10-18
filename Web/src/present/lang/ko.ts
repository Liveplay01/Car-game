import type { Strings, Translation } from '../strings';
import museum from './ko/museum';
import p1 from './ko/p1';
import p2 from './ko/p2';
import p3 from './ko/p3';
import p4 from './ko/p4';
import p5 from './ko/p5';
import p6 from './ko/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
