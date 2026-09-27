import type { ChestOpening } from '../core/loot';
import { CHEST_NAMES, VEHICLE_TYPE_NOTES } from '../core/loot';
import { h, fmt } from './dom';
import { carThumb, chestArt } from './art';
import type { Sound } from '../audio/audio';

const RARITY_COLOR = {
  common: '#9AA3AE',
  rare: '#4FA3FF',
  epic: '#B45CF0',
  legendary: '#E3C15A',
} as const;

const RARITY_NAME = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const;

export interface RevealActions {
  /** Wear the new skin right away; null when it cannot be worn. */
  wear: (() => void) | null;
  done(): void;
}

/**
 * Opening a chest: the chest charges for 0.7 s, then the item card appears. Rare and first
 * of its kind, so it may take a moment (Emil Kowalski: delight for rare events).
 */
export function showReveal(layer: HTMLElement, opening: ChestOpening, sound: Sound, reduceMotion: boolean, actions: RevealActions): void {
  const root = h('div', { class: 'reveal-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Opening ${CHEST_NAMES[opening.chest]}` });
  const stage = h('div', { class: 'reveal' }, chestArt(opening.chest));
  root.append(stage);
  layer.append(root);
  sound.play('chestCharge');

  const finish = (): void => {
    root.remove();
    document.removeEventListener('keydown', onKey, true);
    actions.done();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
    e.stopPropagation();
  };
  document.addEventListener('keydown', onKey, true);

  const show = (): void => {
    const { item, isDuplicate, money } = opening;
    const high = item.rarity === 'epic' || item.rarity === 'legendary';
    sound.play(high ? 'chestBurstRare' : 'chestBurst');
    const note = isDuplicate
      ? `Duplicate · +${fmt(money)} money`
      : item.kind === 'vehicleType'
        ? `New car type in your queue. ${VEHICLE_TYPE_NOTES[item.id] ?? ''}`
        : 'New skin in your collection.';
    const card = h(
      'div',
      { class: 'reveal-card' },
      h('div', { class: 'reveal-rarity' }, RARITY_NAME[item.rarity]),
      h('img', { src: carThumb(item), alt: '', width: 144, height: 96 }),
      h('div', { class: 'reveal-name' }, item.name),
      h('p', { class: 'reveal-note' }, note),
    );
    card.style.setProperty('--rarity', RARITY_COLOR[item.rarity]);
    const buttons = h('div', { class: 'reveal-actions' });
    if (actions.wear && !isDuplicate) {
      buttons.append(
        h(
          'button',
          {
            class: 'btn primary block',
            onclick: () => {
              actions.wear?.();
              finish();
            },
          },
          'Wear it',
        ),
      );
    }
    const doneBtn = h('button', { class: `btn block${buttons.childElementCount ? '' : ' primary'}`, onclick: finish }, 'Done');
    buttons.append(doneBtn);
    stage.replaceChildren(card, buttons);
    (buttons.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  };
  window.setTimeout(show, reduceMotion ? 0 : 700);
}
