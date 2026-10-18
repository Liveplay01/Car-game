import type { Strings, Translation } from '../strings';
import museum from './zh/museum';
import p1 from './zh/p1';
import p2 from './zh/p2';
import p3 from './zh/p3';
import p4 from './zh/p4';
import p5 from './zh/p5';
import p6 from './zh/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
