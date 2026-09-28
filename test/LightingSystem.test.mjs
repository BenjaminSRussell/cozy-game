// Run with: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DynamicLightingSystem } from '../src/engine/LightingSystem.ts';

function lightingAt(season, hour, minute = 0) {
  const lighting = new DynamicLightingSystem();
  lighting.setSeason(season);
  lighting.setTime(hour, minute);
  return lighting.getLightingState();
}

test('starts in spring', () => {
  assert.equal(new DynamicLightingSystem().getSeason(), 'spring');
});

test('winter afternoon just before the 16:30 sunset is not night', () => {
  assert.equal(lightingAt('winter', 16, 29).isNight, false);
});

test('20:00 is night in winter and still day in summer', () => {
  assert.equal(lightingAt('winter', 20).isNight, true);
  assert.equal(lightingAt('summer', 20).isNight, false);
});

test('changing the season recalculates the lighting at once', () => {
  const lighting = new DynamicLightingSystem();
  lighting.setSeason('summer');
  lighting.setTime(20, 0);
  assert.equal(lighting.getLightingState().isNight, false);

  lighting.setSeason('winter');

  assert.equal(lighting.getSeason(), 'winter');
  assert.equal(lighting.getLightingState().isNight, true);
});

test('golden hour is the hour before sunset, whatever the season', () => {
  assert.equal(lightingAt('winter', 16, 0).isGoldenHour, true);
  assert.equal(lightingAt('winter', 18, 0).isGoldenHour, false);
  assert.equal(lightingAt('summer', 20, 0).isGoldenHour, true);
  assert.equal(lightingAt('summer', 18, 0).isGoldenHour, false);
});

test('golden hour is the hour after sunrise, whatever the season', () => {
  assert.equal(lightingAt('winter', 8, 0).isGoldenHour, true);
  assert.equal(lightingAt('summer', 6, 0).isGoldenHour, true);
  assert.equal(lightingAt('summer', 8, 0).isGoldenHour, false);
});

test('blue hour is the hour after sunset and the hour before sunrise', () => {
  assert.equal(lightingAt('winter', 17, 0).isBlueHour, true);
  assert.equal(lightingAt('winter', 17, 0).isNight, false);
  assert.equal(lightingAt('winter', 7, 0).isBlueHour, true);
  assert.equal(lightingAt('summer', 17, 0).isBlueHour, false);
});

test('night begins an hour after sunset and ends an hour before sunrise', () => {
  assert.equal(lightingAt('winter', 17, 31).isNight, true);
  assert.equal(lightingAt('winter', 6, 29).isNight, true);
  assert.equal(lightingAt('winter', 6, 31).isNight, false);
});
