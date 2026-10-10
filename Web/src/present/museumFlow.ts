import { type SaveGame, Careers } from '../core/career';
import { conditionsOf, museumEntry, museumId, sightings, type MuseumEntry } from '../core/museum';
import type { World } from '../core/world';
import { type Briefings, briefOf } from './briefing';
import { MuseumPage } from './museum';
import { S } from './strings';
import type { Tutorial } from './tutorial';

/** What the Museum's sightings and briefings need from the session: the save, the shift on the road, the top card. */
export interface MuseumHost {
  readonly save: SaveGame;
  readonly world: World;
  readonly tutorial: Tutorial | null;
  readonly briefings: Briefings;
  /** Whether briefings belong on the top card now: a shift of your own, past the tutorial. */
  readonly briefs: boolean;
  persist(): void;
}

/**
 * Special vehicles and bosses on the road for the first time go on show in the Museum, and the
 * top card says what they are and what to do (`brief`). Conditions have the ready screen and
 * their briefing as the shift starts (`briefConditions`).
 */
export class MuseumFlow {
  /** Entries first met during this shift, for the line on its result. */
  private found: string[] = [];
  /** Entries whose task cost a shift (a criminal got away): explained once more next time. */
  private readonly again = new Set<string>();
  /** Entries met for the first time whose briefing never got its turn (the shift ended first). */
  private readonly owed = new Set<string>();

  constructor(private readonly host: MuseumHost) {}

  /** Briefings cleared off the top card before they were read are owed for a later shift. */
  owe(ids: Iterable<string>): void {
    for (const id of ids) this.owed.add(id);
  }

  /** The task of `id` cost the shift: its briefing comes once more. */
  relearn(id: string): void {
    this.again.add(id);
  }

  noteSightings(): void {
    const { host } = this;
    // The tutorial teaches the first shift itself; what it meets there is met again right after.
    if (host.tutorial && !host.tutorial.isOver) return;
    // Chill is not part of the career: what rolls past there is not met yet.
    if (host.world.config.chill) return;
    const seen = sightings(host.world);
    // A briefing owed from a shift that ended too soon comes when its vehicle is back.
    if (this.owed.size > 0) for (const id of seen) if (this.owed.has(id)) this.brief(museumEntry(id));
    const found = Careers.discover(host.save.career, seen);
    if (found.length === 0) return;
    this.found.push(...found);
    host.persist();
    for (const e of found.map(museumEntry)) if (e && (e.k === 'special' || e.k === 'boss')) this.brief(e, true);
  }

  /**
   * Explains `e` on the top card if it is new to this player or cost the last shift. `found`:
   * the Museum has just taken it in, so it is new for sure.
   */
  brief(e: MuseumEntry | null, found = false): void {
    if (!e) return;
    const id = museumId(e);
    // Met where there is no top card to explain it (Mayhem): owed for a shift that has one.
    if (!this.host.briefs) {
      if (found) this.owed.add(id);
      return;
    }
    const again = this.again.has(id);
    const owed = this.owed.has(id);
    if (!found && !again && !owed && this.host.save.career.museumSeen.includes(id)) return;
    this.again.delete(id);
    this.owed.delete(id);
    this.host.briefings.add(briefOf(e, again && !found && !owed));
  }

  /** The shift's conditions new to this player: each on the top card for a few seconds as it starts. */
  briefConditions(): void {
    for (const e of conditionsOf(this.host.world.config)) this.brief(e);
  }

  /** The Museum's new entries of the shift, as a line for the result; empties the list. */
  takeNotice(): string | null {
    const names = this.found.map((id) => museumEntry(id)).flatMap((e) => (e ? [MuseumPage.name(e)] : []));
    this.found = [];
    return names.length > 0 ? S.museum.discovered(names) : null;
  }
}
