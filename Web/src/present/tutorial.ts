import type { World } from '../core/world';
import type { GameEvent } from '../core/events';
import { type Vec2, v, add, TAU } from '../core/vec2';
import { type RenderList, arc, circle, text, Ease, toScreen } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S } from './strings';
import { interpolatedPose } from './scene';
import { TopBar } from './hud';

export type TutorialStep = 'sendCar' | 'findGap' | 'combo' | 'quiet';

/**
 * The first shift teaches the one thing to know. Nothing pauses:
 * the front car pulses, the island says to wait for a gap, then that clean merges build the
 * combo; the first crash says why it matters. Ends with the first shift and never comes back.
 */
export class Tutorial {
  static readonly mergesToLearn = 2;
  static readonly hintDuration = 3.5;
  static readonly readyPrompt = S.tutorial.sendCar;

  step: TutorialStep = 'sendCar';
  age = 0;
  cleanMerges = 0;
  strikeAge: number | null = null;
  isOver = false;

  get isDone(): boolean {
    return this.isOver && (this.strikeAge === null || this.strikeAge >= Tutorial.hintDuration);
  }

  end(): void {
    this.isOver = true;
    this.move('quiet');
  }

  advance(delta: number): void {
    this.age += delta;
    if (this.strikeAge !== null) this.strikeAge += delta;
    if (this.step === 'combo' && this.age >= Tutorial.hintDuration) this.move('quiet');
  }

  move(next: TutorialStep): void {
    if (next === this.step) return;
    this.step = next;
    this.age = 0;
  }

  react(event: GameEvent): void {
    if (this.isOver) return;
    switch (event.type) {
      case 'launched':
        if (this.step === 'sendCar') this.move('findGap');
        break;
      case 'merged':
        if (event.rating === 'cutOff') return;
        this.cleanMerges++;
        if (this.step === 'findGap' && this.cleanMerges >= Tutorial.mergesToLearn) this.move('combo');
        break;
      case 'crash':
        if (this.strikeAge === null && (event.isStrike || event.isPoliceCrash)) this.strikeAge = 0;
        break;
    }
  }

  add(list: RenderList, world: World, alpha: number, time: number, reduceMotion: boolean): void {
    const cam = list.camera;
    const frontId = world.queue.vehicles[0];
    const front = frontId === undefined ? undefined : world.vehicle(frontId);
    if ((this.step === 'sendCar' || this.step === 'findGap') && front) {
      const at = toScreen(cam, interpolatedPose(front, alpha).position);
      const beat = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 4);
      const fade = this.step === 'sendCar' ? 1 : Math.max(0, 1 - this.age / 1.5);
      list.s(arc(at, 22 + 5 * beat, 2.5, 0, TAU), 'accent', (0.45 + 0.4 * beat) * fade);
      list.s(circle(at, 22 + 5 * beat), 'accent', 0.08 * fade);
    }
    const island = toScreen(cam, v(0, 0));
    if (this.step === 'findGap') Tutorial.pill(list, S.tutorial.findGap, add(island, v(0, 74)), this.age, null, reduceMotion);
    else if (this.step === 'combo') Tutorial.pill(list, S.tutorial.combo, add(island, v(0, 74)), this.age, this.age - (Tutorial.hintDuration - 0.3), reduceMotion);
    const sa = this.strikeAge;
    if (sa !== null && sa < Tutorial.hintDuration) {
      const at = v(cam.viewport.x / 2, TopBar.top + TopBar.height + 28);
      Tutorial.pill(list, S.tutorial.strikes(world.config.maxPoliceCrashes), at, sa, sa - (Tutorial.hintDuration - 0.3), reduceMotion, 'destructive');
    }
  }

  /** A dark pill with a thin edge in its colour; glides in from a little lower. */
  private static pill(list: RenderList, label: string, center: Vec2, age: number, leaving: number | null, reduceMotion: boolean, tint: ColorToken = 'accent'): void {
    const enter = Ease.outCubic(age / 0.25);
    const exit = leaving === null ? 0 : Ease.clamp01(leaving / 0.3);
    const opacity = enter * (1 - exit);
    if (opacity <= 0.001) return;
    const rise = reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 10;
    const size = Tutorial.fittingSize(label, list.camera.viewport.x);
    const at = add(center, v(0, rise));
    MenuKit.chromePill(list, at, v(textWidth(label, size) + 32, 32), opacity, tint);
    list.s(text(label, at, size, 'center', 'bold'), 'primary', opacity);
  }

  static fittingSize(label: string, viewportWidth: number): number {
    const natural = 14;
    const room = viewportWidth - 2 * TopBar.margin - 32;
    const width = textWidth(label, natural);
    return width <= room ? natural : Math.max(12, (natural * room) / width);
  }
}
