import type { Strings, Translation } from '../strings';
import museum from './ja/museum';
import p1 from './ja/p1';
import p2 from './ja/p2';
import p3 from './ja/p3';
import p4 from './ja/p4';
import p5 from './ja/p5';
import p6 from './ja/p6';

export default (s: Strings): Translation => ({ S: { ...p1(s), ...p2(s), ...p3(s), ...p4(s), ...p5(s), ...p6(s) }, museum });
