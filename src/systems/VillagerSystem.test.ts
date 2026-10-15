import { describe, expect, it } from 'vitest';
import { ItemType, type VillagerRelationship } from '../types/game';
import {
  DIALOGUE_START,
  FRIENDSHIP_PER_HEART,
  GIFTS_PER_WEEK,
  MAX_FRIENDSHIP,
  MAX_HEARTS,
  TALK_FRIENDSHIP,
  VILLAGERS,
  VILLAGER_IDS,
  clampFriendship,
  emptyRelationship,
  giftOutcome,
  giftReaction,
  giftWeekOf,
  heartsFor,
  isVillagerId,
  milestoneMail,
  nextDialogueNode,
  startDialogue,
  talkOutcome,
  villagerPlaceAt,
  type GiftOutcome,
} from './VillagerSystem';

function withPoints(points: number, extra: Partial<VillagerRelationship> = {}): VillagerRelationship {
  return { ...emptyRelationship(), points, ...extra };
}

/** Unwraps an accepted gift, failing the test on a refusal. */
function acceptedGift(result: GiftOutcome): Extract<GiftOutcome, { ok: true }> {
  if (!result.ok) throw new Error(`gift refused: ${result.reason}`);
  return result;
}

describe('villager roster', () => {
  it('lists the four core villagers in roster order', () => {
    expect(VILLAGER_IDS).toEqual(['robin', 'pierre', 'clint', 'willy']);
    for (const id of VILLAGER_IDS) {
      expect(VILLAGERS[id].id).toBe(id);
      expect(VILLAGERS[id].name.length).toBeGreaterThan(0);
    }
  });

  it('gives each villager the role from the issue', () => {
    expect(VILLAGERS.robin.role).toBe('Carpenter');
    expect(VILLAGERS.pierre.role).toBe('Merchant');
    expect(VILLAGERS.clint.role).toBe('Blacksmith');
    expect(VILLAGERS.willy.role).toBe('Fisherman');
  });

  it('accepts roster ids and nothing else', () => {
    expect(isVillagerId('robin')).toBe(true);
    expect(isVillagerId('gus')).toBe(false);
    expect(isVillagerId('constructor')).toBe(false);
  });
});

describe('villagerPlaceAt', () => {
  it.each([
    [0, 'home'],
    [6 * 60, 'home'],
    [8 * 60 - 1, 'home'],
    [8 * 60, 'shop'],
    [12 * 60 - 1, 'shop'],
    [12 * 60, 'square'],
    [13 * 60 - 1, 'square'],
    [13 * 60, 'shop'],
    [17 * 60 - 1, 'shop'],
    [17 * 60, 'square'],
    [20 * 60 - 1, 'square'],
    [20 * 60, 'home'],
    [1439, 'home'],
  ])('minute %i is %s', (minute, place) => {
    expect(villagerPlaceAt(minute)).toBe(place);
  });

  it('wraps past midnight and treats negative minutes as the previous day', () => {
    expect(villagerPlaceAt(1440)).toBe('home');
    expect(villagerPlaceAt(1440 + 9 * 60)).toBe('shop');
    expect(villagerPlaceAt(-60)).toBe('home');
    expect(villagerPlaceAt(-660)).toBe('shop');
  });

  it('treats non-finite input as midnight', () => {
    expect(villagerPlaceAt(Number.NaN)).toBe('home');
    expect(villagerPlaceAt(Number.POSITIVE_INFINITY)).toBe('home');
  });

  it('visits home, shop and square during a day', () => {
    const seen = new Set<string>();
    for (let minute = 0; minute < 1440; minute += 10) seen.add(villagerPlaceAt(minute));
    expect([...seen].sort()).toEqual(['home', 'shop', 'square']);
  });
});

describe('friendship hearts', () => {
  it.each([
    [-5, 0],
    [0, 0],
    [249, 0],
    [250, 1],
    [2499, 9],
    [2500, 10],
    [99999, 10],
    [Number.NaN, 0],
  ])('%p points is %i hearts', (points, hearts) => {
    expect(heartsFor(points)).toBe(hearts);
  });

  it('is ten hearts of 250 points, clamped to that range', () => {
    expect(FRIENDSHIP_PER_HEART).toBe(250);
    expect(MAX_HEARTS).toBe(10);
    expect(MAX_FRIENDSHIP).toBe(2500);
    expect(clampFriendship(-40)).toBe(0);
    expect(clampFriendship(MAX_FRIENDSHIP + 1)).toBe(MAX_FRIENDSHIP);
  });
});

describe('gift reactions', () => {
  it('follows each villager item-type preferences', () => {
    expect(giftReaction('robin', ItemType.WOOD)).toBe('loved');
    expect(giftReaction('robin', ItemType.STONE)).toBe('liked');
    expect(giftReaction('robin', ItemType.DECORATION)).toBe('disliked');
    expect(giftReaction('robin', ItemType.CROP)).toBe('neutral');
    expect(giftReaction('pierre', ItemType.CROP)).toBe('loved');
    expect(giftReaction('clint', ItemType.ORE)).toBe('loved');
    expect(giftReaction('willy', ItemType.ANIMAL_PRODUCT)).toBe('loved');
  });

  it('gives every villager at least one loved item type', () => {
    for (const id of VILLAGER_IDS) expect(VILLAGERS[id].loved.length).toBeGreaterThan(0);
  });
});

describe('talkOutcome', () => {
  it('earns 20 points on the first conversation of a day', () => {
    const outcome = talkOutcome('pierre', emptyRelationship(), 3);
    expect(TALK_FRIENDSHIP).toBe(20);
    expect(outcome.pointsChange).toBe(20);
    expect(outcome.relationship).toMatchObject({ points: 20, lastTalkDay: 3 });
    expect(outcome.milestones).toEqual([]);
  });

  it('earns nothing when the villager was already talked to that day', () => {
    const first = talkOutcome('pierre', emptyRelationship(), 3).relationship;
    const again = talkOutcome('pierre', first, 3);
    expect(again.pointsChange).toBe(0);
    expect(again.relationship).toEqual(first);
  });

  it('earns points again on the next day', () => {
    const day3 = talkOutcome('pierre', emptyRelationship(), 3).relationship;
    expect(talkOutcome('pierre', day3, 4).relationship.points).toBe(40);
  });

  it('stops at the cap and reports only the points it added', () => {
    const outcome = talkOutcome('pierre', withPoints(MAX_FRIENDSHIP - 5), 1);
    expect(outcome.pointsChange).toBe(5);
    expect(outcome.relationship.points).toBe(MAX_FRIENDSHIP);
  });
});

describe('giftOutcome', () => {
  it('adds the loved bonus of 80 and counts the gift', () => {
    const result = acceptedGift(giftOutcome('robin', emptyRelationship(), 0, ItemType.WOOD));
    expect(result.reaction).toBe('loved');
    expect(result.outcome.pointsChange).toBe(80);
    expect(result.outcome.relationship).toMatchObject({ points: 80, giftWeek: 0, giftCount: 1 });
  });

  it('adds 45 for a liked gift and takes 20 for a disliked one, never below zero', () => {
    const liked = acceptedGift(giftOutcome('robin', emptyRelationship(), 0, ItemType.STONE));
    expect(liked.outcome.relationship.points).toBe(45);

    const disliked = acceptedGift(giftOutcome('robin', emptyRelationship(), 0, ItemType.DECORATION));
    expect(disliked.outcome.pointsChange).toBe(0);
    expect(disliked.outcome.relationship.points).toBe(0);

    const dislikedAfterPoints = acceptedGift(
      giftOutcome('robin', withPoints(100), 0, ItemType.DECORATION),
    );
    expect(dislikedAfterPoints.outcome.relationship.points).toBe(80);
  });

  it('treats a neutral gift as +20', () => {
    const result = acceptedGift(giftOutcome('pierre', emptyRelationship(), 0, ItemType.TOOL));
    expect(result.reaction).toBe('neutral');
    expect(result.outcome.relationship.points).toBe(20);
  });

  it('accepts two gifts a week and refuses the third', () => {
    expect(GIFTS_PER_WEEK).toBe(2);
    let relationship = emptyRelationship();
    relationship = acceptedGift(giftOutcome('robin', relationship, 0, ItemType.WOOD)).outcome.relationship;
    relationship = acceptedGift(giftOutcome('robin', relationship, 6, ItemType.WOOD)).outcome.relationship;
    expect(giftOutcome('robin', relationship, 6, ItemType.WOOD)).toEqual({
      ok: false,
      reason: 'weekly-limit',
    });
  });

  it('resets the gift count in the next week', () => {
    let relationship = emptyRelationship();
    relationship = acceptedGift(giftOutcome('robin', relationship, 0, ItemType.WOOD)).outcome.relationship;
    relationship = acceptedGift(giftOutcome('robin', relationship, 6, ItemType.WOOD)).outcome.relationship;
    const nextWeek = acceptedGift(giftOutcome('robin', relationship, 7, ItemType.WOOD));
    expect(nextWeek.outcome.relationship).toMatchObject({ giftWeek: 1, giftCount: 1 });
  });

  it('counts disliked gifts toward the weekly limit', () => {
    let relationship = emptyRelationship();
    relationship = acceptedGift(giftOutcome('robin', relationship, 0, ItemType.DECORATION)).outcome.relationship;
    relationship = acceptedGift(giftOutcome('robin', relationship, 0, ItemType.DECORATION)).outcome.relationship;
    expect(giftOutcome('robin', relationship, 0, ItemType.WOOD).ok).toBe(false);
  });
});

describe('giftWeekOf', () => {
  it('groups days into weeks of seven', () => {
    expect([0, 6, 7, 13, 14].map(giftWeekOf)).toEqual([0, 0, 1, 1, 2]);
  });

  it('treats negative and non-finite day counts as week 0', () => {
    expect(giftWeekOf(-3)).toBe(0);
    expect(giftWeekOf(Number.NaN)).toBe(0);
  });
});

describe('heart milestones', () => {
  it('pays a milestone once, even after points dip and recover', () => {
    const reached = talkOutcome('robin', withPoints(740), 1);
    expect(reached.relationship.points).toBe(760);
    expect(reached.milestones.map((m) => m.hearts)).toEqual([3]);
    expect(reached.relationship.rewardedHearts).toEqual([3]);

    const dipped = acceptedGift(giftOutcome('robin', reached.relationship, 1, ItemType.DECORATION)).outcome;
    expect(dipped.relationship.points).toBe(740);
    expect(dipped.milestones).toEqual([]);

    const recovered = acceptedGift(giftOutcome('robin', dipped.relationship, 1, ItemType.WOOD)).outcome;
    expect(recovered.relationship.points).toBe(820);
    expect(recovered.milestones).toEqual([]);
    expect(recovered.relationship.rewardedHearts).toEqual([3]);
  });

  it('pays every milestone reached in one change, lowest level first', () => {
    const outcome = acceptedGift(giftOutcome('robin', withPoints(2400), 0, ItemType.WOOD)).outcome;
    expect(outcome.relationship.points).toBe(2480);
    expect(outcome.milestones.map((m) => m.hearts)).toEqual([3, 6]);
    expect(outcome.relationship.rewardedHearts).toEqual([3, 6]);
  });

  it('pays the ten-heart milestone at the cap', () => {
    const outcome = talkOutcome('clint', withPoints(MAX_FRIENDSHIP - 5, { rewardedHearts: [3, 6] }), 2);
    expect(outcome.pointsChange).toBe(5);
    expect(outcome.milestones.map((m) => m.hearts)).toEqual([10]);
  });

  it('builds a letter with a stable id and the recipe reward', () => {
    const milestone = VILLAGERS.robin.milestones[0];
    expect(milestoneMail('robin', milestone)).toEqual({
      id: 'mail_robin_3',
      from: 'robin',
      subject: milestone.mail.subject,
      body: milestone.mail.body,
      recipeId: 'robin_birdhouse',
      claimed: false,
    });
  });
});

describe('villager content', () => {
  it('orders milestones by heart level, keeps levels in range, and gives every milestone a unique recipe', () => {
    const recipes = new Set<string>();
    for (const id of VILLAGER_IDS) {
      const levels = VILLAGERS[id].milestones.map((m) => m.hearts);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      for (const level of levels) {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(MAX_HEARTS);
      }
      for (const milestone of VILLAGERS[id].milestones) {
        expect(milestone.cutscene.length).toBeGreaterThan(0);
        recipes.add(milestone.mail.recipeId);
      }
    }
    expect(recipes.size).toBe(VILLAGER_IDS.length * 3);
  });

  it('keeps every dialogue option pointing at a real node or ending the conversation', () => {
    for (const id of VILLAGER_IDS) {
      const tree = VILLAGERS[id].dialogue;
      expect(startDialogue(id).id).toBe(DIALOGUE_START);
      for (const [key, node] of Object.entries(tree)) {
        expect(node.id).toBe(key);
        for (const option of node.options) {
          if (option.next !== null) expect(tree[option.next]).toBeDefined();
        }
      }
    }
  });

  it('walks a dialogue branch and ends it with a null next node', () => {
    expect(nextDialogueNode('robin', 'greet', 'build')?.id).toBe('build');
    expect(nextDialogueNode('robin', 'build', 'thanks')).toBeNull();
    expect(nextDialogueNode('robin', 'greet', 'bye')).toBeNull();
    expect(nextDialogueNode('robin', 'greet', 'missing-option')).toBeNull();
    expect(nextDialogueNode('robin', 'missing-node', 'build')).toBeNull();
  });
});
