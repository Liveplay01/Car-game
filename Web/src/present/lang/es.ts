import type { Strings, Translation } from '../strings';
import museum from './es/museum';
import p1 from './es/p1';
import p2 from './es/p2';
import p3 from './es/p3';
import p4 from './es/p4';
import p5 from './es/p5';
import p6 from './es/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
