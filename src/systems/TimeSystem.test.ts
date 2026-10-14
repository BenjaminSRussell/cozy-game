import { describe, expect, it } from 'vitest';
import type { Season } from '../types/game';
import { TimeSystem, type DailyResetSystem, type GameTime } from './TimeSystem';

function atMinutes(totalMinutes: number): TimeSystem {
  const system = new TimeSystem();
  const time: GameTime = {
    realTime: 0,
    gameTime: totalMinutes,
    day: 1,
    season: 'spring',
    year: 1,
    isNewDay: false,
  };
  const dailyReset: DailyResetSystem = {
    lastReset: 0,
    rockResources: [],
    fossilSpots: [],
    shopInventory: [],
    villagerDialogues: [],
  };
  system.load({ time, dailyReset });
  return system;
}

describe('TimeSystem.getTimeString', () => {
  it('rolls minute 59 into the next hour and never emits minute 60', () => {
    expect(atMinutes(839).getTimeString()).toBe('1:59 PM');
    expect(atMinutes(840).getTimeString()).toBe('2:00 PM');
    expect(atMinutes(0).getTimeString()).toBe('12:00 AM');
    expect(atMinutes(1440).getTimeString()).toBe('12:00 AM');

    for (let hour = 0; hour < 24; hour += 1) {
      const at59 = atMinutes(hour * 60 + 59).getTimeString();
      const atNextHour = atMinutes(hour * 60 + 60).getTimeString();
      expect(at59).toMatch(/:59 /);
      expect(atNextHour).toMatch(/:00 /);
      expect(at59).not.toContain(':60');
      expect(atNextHour).not.toContain(':60');
      expect(atNextHour).toBe(atMinutes(hour * 60 + 60).formatGameTime());
    }
  });
});

describe('TimeSystem season calendar', () => {
  const boundaries: Array<[Season, Season]> = [
    ['spring', 'summer'],
    ['summer', 'autumn'],
    ['autumn', 'winter'],
    ['winter', 'spring'],
  ];

  it('rolls day 28 into day 1 of the next season and leaves day 27 in season', () => {
    const system = new TimeSystem();
    expect(system.getSeasonCalendar()).toEqual({ season: 'spring', day: 1 });

    for (const [from, to] of boundaries) {
      system.setSeasonCalendar(from, 27);
      const sameSeason = system.advanceSeasonCalendar();
      expect(sameSeason.seasonChanged).toBe(false);
      expect(sameSeason.previous).toEqual({ season: from, day: 27 });
      expect(sameSeason.current).toEqual({ season: from, day: 28 });

      const nextSeason = system.advanceSeasonCalendar();
      expect(nextSeason.seasonChanged).toBe(true);
      expect(nextSeason.previous).toEqual({ season: from, day: 28 });
      expect(nextSeason.current).toEqual({ season: to, day: 1 });
      expect(system.getSeasonCalendar()).toEqual({ season: to, day: 1 });
    }
  });

  it('restores the season calendar from a save', () => {
    const system = new TimeSystem();
    system.setSeasonCalendar('autumn', 28);
    const saved = system.save();
    const loaded = new TimeSystem();
    loaded.load(saved);
    expect(loaded.getSeasonCalendar()).toEqual({ season: 'autumn', day: 28 });
    expect(loaded.advanceSeasonCalendar().current).toEqual({ season: 'winter', day: 1 });
  });
});
