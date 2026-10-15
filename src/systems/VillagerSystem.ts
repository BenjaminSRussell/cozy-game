/**
 * Villager roster, daily schedule, friendship points, gifts and milestone mail.
 *
 * Pure data and functions. The store calls these and writes the results into
 * `world`. Nothing here draws anything: the schedule answers where a villager
 * should be, not the path they walk to get there.
 *
 * Hearts are 250 friendship points each. A villager tops out at ten hearts (2500 points).
 */

import {
  ItemType,
  type GameWorld,
  type VillagerId,
  type VillagerMail,
  type VillagerRelationship,
} from '../types/game';

/** Core villagers in roster order. */
export const VILLAGER_IDS: readonly VillagerId[] = ['robin', 'pierre', 'clint', 'willy'];

/** Friendship points per heart. */
export const FRIENDSHIP_PER_HEART = 250;
/** Hearts at the cap. */
export const MAX_HEARTS = 10;
/** Points at the cap. */
export const MAX_FRIENDSHIP = FRIENDSHIP_PER_HEART * MAX_HEARTS;
/** Points for a conversation. Earned once per in-game day per villager. */
export const TALK_FRIENDSHIP = 20;
/** Gifts one villager accepts per in-game week. */
export const GIFTS_PER_WEEK = 2;
/** In-game days in one gift week. */
export const DAYS_PER_WEEK = 7;

export type GiftReaction = 'loved' | 'liked' | 'neutral' | 'disliked';

/**
 * Points for each gift reaction. Loved, liked and disliked come from the issue.
 * The issue does not price neutral gifts, so they get +20, the same as a conversation.
 */
export const GIFT_FRIENDSHIP: Record<GiftReaction, number> = {
  loved: 80,
  liked: 45,
  neutral: 20,
  disliked: -20,
};

// ============================================================================
// SCHEDULE
// ============================================================================

export type VillagerPlace = 'home' | 'shop' | 'square';

const MINUTES_PER_DAY = 1440;

/**
 * The day in blocks, by minute from midnight. Each block lasts until the next one starts.
 * Every villager follows the same timetable and goes to their own home and shop counter.
 */
const DAILY_SCHEDULE: ReadonlyArray<{ fromMinute: number; place: VillagerPlace }> = [
  { fromMinute: 0, place: 'home' }, // 00:00 to 08:00
  { fromMinute: 8 * 60, place: 'shop' }, // 08:00 to 12:00, counter opens
  { fromMinute: 12 * 60, place: 'square' }, // 12:00 to 13:00, lunch in town
  { fromMinute: 13 * 60, place: 'shop' }, // 13:00 to 17:00
  { fromMinute: 17 * 60, place: 'square' }, // 17:00 to 20:00
  { fromMinute: 20 * 60, place: 'home' }, // 20:00 to midnight
];

/**
 * Where villagers are at an in-game time. `dayTime` is minutes since midnight and
 * wraps past 1440. A non-finite value counts as midnight.
 */
export function villagerPlaceAt(dayTime: number): VillagerPlace {
  const minute = Number.isFinite(dayTime)
    ? ((dayTime % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
    : 0;
  let place = DAILY_SCHEDULE[0].place;
  for (const block of DAILY_SCHEDULE) {
    if (minute >= block.fromMinute) place = block.place;
  }
  return place;
}

// ============================================================================
// DIALOGUE AND MILESTONES
// ============================================================================

export type VillagerExpression = 'neutral' | 'happy' | 'surprised' | 'sad';

export interface VillagerDialogueOption {
  id: string;
  label: string;
  /** Node to show next, or null to end the conversation. */
  next: string | null;
}

export interface VillagerDialogueNode {
  id: string;
  line: string;
  expression: VillagerExpression;
  options: VillagerDialogueOption[];
}

/** Entry node of every villager's dialogue tree. */
export const DIALOGUE_START = 'greet';

export interface VillagerMilestone {
  /** Heart level that triggers this milestone. */
  hearts: number;
  /** Cutscene lines shown when the level is reached. */
  cutscene: string[];
  /** Letter that arrives with the milestone. Its recipe unlocks when claimed. */
  mail: { subject: string; body: string; recipeId: string };
}

export interface VillagerDef {
  id: VillagerId;
  name: string;
  role: string;
  /**
   * Gift preferences are matched by item type. Stack ids such as
   * `harvest_wheat_normal_<timestamp>` are per instance, so an id list would not match.
   */
  loved: ItemType[];
  liked: ItemType[];
  disliked: ItemType[];
  /** Dialogue tree keyed by node id. Starts at `DIALOGUE_START`. */
  dialogue: Record<string, VillagerDialogueNode>;
  milestones: VillagerMilestone[];
}

export const VILLAGERS: Record<VillagerId, VillagerDef> = {
  robin: {
    id: 'robin',
    name: 'Robin',
    role: 'Carpenter',
    loved: [ItemType.WOOD],
    liked: [ItemType.STONE],
    disliked: [ItemType.DECORATION],
    dialogue: {
      greet: {
        id: 'greet',
        line: 'Morning! Need something built, or just stopping by?',
        expression: 'happy',
        options: [
          { id: 'build', label: 'What can you build?', next: 'build' },
          { id: 'bye', label: 'Just saying hi', next: null },
        ],
      },
      build: {
        id: 'build',
        line: 'Coops, barns, silos. Bring the materials and I will have it standing before supper.',
        expression: 'neutral',
        options: [{ id: 'thanks', label: 'Thanks, Robin', next: null }],
      },
    },
    milestones: [
      {
        hearts: 3,
        cutscene: [
          'Robin holds up a half-finished birdhouse.',
          '"Something for your farm. Every good yard needs a roof for its visitors."',
        ],
        mail: {
          subject: 'A birdhouse plan',
          body: 'Build this one by the fence and the birds will sing for you. - Robin',
          recipeId: 'robin_birdhouse',
        },
      },
      {
        hearts: 6,
        cutscene: [
          'Robin unrolls drawings across the workbench.',
          '"A proper coop, drawn to my own design. I think you are ready for it."',
        ],
        mail: {
          subject: 'Coop blueprints',
          body: 'Keep these somewhere dry. The corners are tricky, so measure twice. - Robin',
          recipeId: 'robin_coop',
        },
      },
      {
        hearts: 10,
        cutscene: [
          'Robin sets down her hammer and smiles.',
          '"Bring me the timber and we will raise a barn that outlasts us both."',
        ],
        mail: {
          subject: 'The grand barn',
          body: 'Only my closest clients get these plans. Treat them well. - Robin',
          recipeId: 'robin_grand_barn',
        },
      },
    ],
  },
  pierre: {
    id: 'pierre',
    name: 'Pierre',
    role: 'Merchant',
    loved: [ItemType.CROP],
    liked: [ItemType.SEED],
    disliked: [ItemType.ORE],
    dialogue: {
      greet: {
        id: 'greet',
        line: 'Welcome to the General Store! Seeds, supplies and gossip, all at fair prices.',
        expression: 'happy',
        options: [
          { id: 'stock', label: 'What is in stock?', next: 'stock' },
          { id: 'bye', label: 'Goodbye', next: null },
        ],
      },
      stock: {
        id: 'stock',
        line: 'Fresh seed packets came in this morning. The shelves change every day, so check back.',
        expression: 'neutral',
        options: [{ id: 'bye', label: 'See you later', next: null }],
      },
    },
    milestones: [
      {
        hearts: 3,
        cutscene: [
          'Pierre leans across the counter.',
          '"You have a good eye for a bargain. I like that in a customer."',
        ],
        mail: {
          subject: 'A welcome gift',
          body: 'Thanks for stopping by so often. The enclosed recipe is on the house. - Pierre',
          recipeId: 'pierre_fertilizer',
        },
      },
      {
        hearts: 6,
        cutscene: [
          'Pierre shows you a ledger full of notes about your sales.',
          '"You move more produce than anyone in town. I have a special blend for you."',
        ],
        mail: {
          subject: 'Premium feed blend',
          body: 'Keep this one quiet. I only share it with regulars. - Pierre',
          recipeId: 'pierre_premium_feed',
        },
      },
      {
        hearts: 10,
        cutscene: [
          'Pierre closes the shop early and pours two cups of tea.',
          '"Partner, I mean it. When the shelves run bare, your name is the first I think of."',
        ],
        mail: {
          subject: 'The partner reserve',
          body: 'The reserve is open to you now. Ask for it at the counter. - Pierre',
          recipeId: 'pierre_reserve',
        },
      },
    ],
  },
  clint: {
    id: 'clint',
    name: 'Clint',
    role: 'Blacksmith',
    loved: [ItemType.ORE],
    liked: [ItemType.TOOL],
    disliked: [ItemType.ANIMAL_PRODUCT],
    dialogue: {
      greet: {
        id: 'greet',
        line: 'Hmph. Here to have something forged, or just passing through?',
        expression: 'neutral',
        options: [
          { id: 'tools', label: 'Can you upgrade my tools?', next: 'tools' },
          { id: 'bye', label: 'Just passing through', next: null },
        ],
      },
      tools: {
        id: 'tools',
        line: 'Bring ore and I will upgrade your tools. Got a geode? I can crack it open too.',
        expression: 'neutral',
        options: [{ id: 'thanks', label: 'Thanks, Clint', next: null }],
      },
    },
    milestones: [
      {
        hearts: 3,
        cutscene: [
          'Clint quenches a blade with a hiss of steam.',
          '"Good steel takes patience. You are showing some. Take this."',
        ],
        mail: {
          subject: 'Notes from the forge',
          body: 'Quench slow and temper fast. Your tools will last twice as long. - Clint',
          recipeId: 'clint_quench',
        },
      },
      {
        hearts: 6,
        cutscene: [
          'Clint turns a geode over in his palm for a long moment.',
          '"There is more inside than you would think. Let me show you how I crack them."',
        ],
        mail: {
          subject: 'Geode technique',
          body: 'Tap the seam, not the middle. Patience opens more than force. - Clint',
          recipeId: 'clint_geode',
        },
      },
      {
        hearts: 10,
        cutscene: [
          'Clint wipes his hands on his apron and nods once.',
          '"Forge with me and you will never need to buy a tool again."',
        ],
        mail: {
          subject: 'The master mark',
          body: 'Only one farmer in town has earned this mark. It is yours now. - Clint',
          recipeId: 'clint_master_mark',
        },
      },
    ],
  },
  willy: {
    id: 'willy',
    name: 'Willy',
    role: 'Fisherman',
    loved: [ItemType.ANIMAL_PRODUCT],
    liked: [ItemType.TOOL],
    disliked: [ItemType.FURNITURE],
    dialogue: {
      greet: {
        id: 'greet',
        line: 'Caught anything worth bragging about? The river has been generous lately.',
        expression: 'happy',
        options: [
          { id: 'rods', label: 'Any rods for sale?', next: 'rods' },
          { id: 'bye', label: 'Not yet', next: null },
        ],
      },
      rods: {
        id: 'rods',
        line: 'Rods and tackle at fair prices. Come back when the weather turns, the big ones bite then.',
        expression: 'happy',
        options: [{ id: 'bye', label: 'Good to know', next: null }],
      },
    },
    milestones: [
      {
        hearts: 3,
        cutscene: [
          'Willy sets a rod across the dock between you.',
          '"Patience and a good line. I think you have both."',
        ],
        mail: {
          subject: 'Fishing tips',
          body: 'Cast near the reeds at dusk. That is where the good ones wait. - Willy',
          recipeId: 'willy_bait',
        },
      },
      {
        hearts: 6,
        cutscene: [
          'Willy opens a battered tackle box.',
          '"Lures I made myself. Only my friends get these."',
        ],
        mail: {
          subject: 'A handmade lure',
          body: 'Tie it on and keep quiet about it around the other fishermen. - Willy',
          recipeId: 'willy_lure',
        },
      },
      {
        hearts: 10,
        cutscene: [
          'Willy laughs and tosses you a rod.',
          '"Keep it. The river likes you, and I suppose I do too."',
        ],
        mail: {
          subject: 'The old rod',
          body: 'It has caught more fish than I can count. Now it is yours. - Willy',
          recipeId: 'willy_old_rod',
        },
      },
    ],
  },
};

// ============================================================================
// FRIENDSHIP
// ============================================================================

/** Result of the store actions the UI reads. */
export interface VillagerTalkResult {
  node: VillagerDialogueNode;
  /** Points gained, after clamping to the 0 to 2500 range. Zero on a repeat conversation. */
  pointsChange: number;
  milestones: VillagerMilestone[];
}

export type VillagerGiftResult =
  | { ok: true; reaction: GiftReaction; pointsChange: number; milestones: VillagerMilestone[] }
  | { ok: false; reason: 'no-world' | 'unknown-villager' | 'missing-item' | 'weekly-limit' };

/** One friendship change, ready for the store to write back. */
export interface FriendshipOutcome {
  relationship: VillagerRelationship;
  /** Points gained or lost after clamping to the 0 to 2500 range. */
  pointsChange: number;
  /** Milestones whose heart level this change reached for the first time. */
  milestones: VillagerMilestone[];
}

export type GiftOutcome =
  | { ok: true; reaction: GiftReaction; outcome: FriendshipOutcome }
  | { ok: false; reason: 'weekly-limit' };

export function isVillagerId(value: string): value is VillagerId {
  return (VILLAGER_IDS as readonly string[]).includes(value);
}

export function emptyRelationship(): VillagerRelationship {
  return { points: 0, lastTalkDay: null, giftWeek: 0, giftCount: 0, rewardedHearts: [] };
}

/** A fresh relationship for every villager, used when a new world is created. */
export function freshRelationships(): Record<VillagerId, VillagerRelationship> {
  return {
    robin: emptyRelationship(),
    pierre: emptyRelationship(),
    clint: emptyRelationship(),
    willy: emptyRelationship(),
  };
}

/** Stored relationship, or a fresh one for a villager that the save has not recorded yet. */
export function relationshipOf(world: GameWorld, villagerId: VillagerId): VillagerRelationship {
  return world.villagerRelationships?.[villagerId] ?? emptyRelationship();
}

/** Gift week for a day count. Week 0 is days 0 to 6, week 1 is days 7 to 13, and so on. */
export function giftWeekOf(totalDaysPlayed: number): number {
  if (!Number.isFinite(totalDaysPlayed) || totalDaysPlayed < 0) return 0;
  return Math.floor(totalDaysPlayed / DAYS_PER_WEEK);
}

/** Clamps points to 0 through `MAX_FRIENDSHIP`. NaN counts as 0. */
export function clampFriendship(points: number): number {
  if (Number.isNaN(points)) return 0;
  return Math.min(MAX_FRIENDSHIP, Math.max(0, Math.round(points)));
}

/** Whole hearts for a point total, from 0 to `MAX_HEARTS`. */
export function heartsFor(points: number): number {
  return Math.floor(clampFriendship(points) / FRIENDSHIP_PER_HEART);
}

/** Reaction to a gift, from the villager's item-type preferences. Loved wins, then liked, then disliked. */
export function giftReaction(villagerId: VillagerId, itemType: ItemType): GiftReaction {
  const def = VILLAGERS[villagerId];
  if (def.loved.includes(itemType)) return 'loved';
  if (def.liked.includes(itemType)) return 'liked';
  if (def.disliked.includes(itemType)) return 'disliked';
  return 'neutral';
}

/** Adds points, clamps them, and reports milestones reached for the first time. */
function applyPoints(
  villagerId: VillagerId,
  relationship: VillagerRelationship,
  delta: number,
): FriendshipOutcome {
  const points = clampFriendship(relationship.points + delta);
  const hearts = heartsFor(points);
  const milestones = VILLAGERS[villagerId].milestones.filter(
    (milestone) =>
      hearts >= milestone.hearts && !relationship.rewardedHearts.includes(milestone.hearts),
  );
  return {
    relationship: {
      ...relationship,
      points,
      rewardedHearts: [...relationship.rewardedHearts, ...milestones.map((m) => m.hearts)],
    },
    pointsChange: points - relationship.points,
    milestones,
  };
}

/**
 * A conversation earns `TALK_FRIENDSHIP` once per in-game day. Talking again the
 * same day changes nothing, though the dialogue still plays.
 */
export function talkOutcome(
  villagerId: VillagerId,
  relationship: VillagerRelationship,
  totalDaysPlayed: number,
): FriendshipOutcome {
  if (relationship.lastTalkDay === totalDaysPlayed) {
    return { relationship, pointsChange: 0, milestones: [] };
  }
  return applyPoints(
    villagerId,
    { ...relationship, lastTalkDay: totalDaysPlayed },
    TALK_FRIENDSHIP,
  );
}

/**
 * A gift earns points by reaction. A villager takes at most `GIFTS_PER_WEEK` gifts
 * per week, and every gift counts toward that limit, including disliked ones.
 */
export function giftOutcome(
  villagerId: VillagerId,
  relationship: VillagerRelationship,
  totalDaysPlayed: number,
  itemType: ItemType,
): GiftOutcome {
  const week = giftWeekOf(totalDaysPlayed);
  const giftCount = relationship.giftWeek === week ? relationship.giftCount : 0;
  if (giftCount >= GIFTS_PER_WEEK) return { ok: false, reason: 'weekly-limit' };

  const reaction = giftReaction(villagerId, itemType);
  const outcome = applyPoints(
    villagerId,
    { ...relationship, giftWeek: week, giftCount: giftCount + 1 },
    GIFT_FRIENDSHIP[reaction],
  );
  return { ok: true, reaction, outcome };
}

/** Letter that carries a heart milestone. Its id is fixed per villager and level. */
export function milestoneMail(villagerId: VillagerId, milestone: VillagerMilestone): VillagerMail {
  return {
    id: `mail_${villagerId}_${milestone.hearts}`,
    from: villagerId,
    subject: milestone.mail.subject,
    body: milestone.mail.body,
    recipeId: milestone.mail.recipeId,
    claimed: false,
  };
}

/** Writes a friendship outcome into the world, and adds a letter for each new milestone. */
export function applyFriendshipOutcome(
  world: GameWorld,
  villagerId: VillagerId,
  outcome: FriendshipOutcome,
): GameWorld {
  const letters = outcome.milestones.map((milestone) => milestoneMail(villagerId, milestone));
  return {
    ...world,
    villagerRelationships: { ...world.villagerRelationships, [villagerId]: outcome.relationship },
    villagerMailbox: [...(world.villagerMailbox ?? []), ...letters],
  };
}

/**
 * Marks a letter claimed and unlocks the recipe it carries. Returns null when the
 * letter does not exist or was already claimed.
 */
export function claimMail(world: GameWorld, mailId: string): GameWorld | null {
  const mailbox = world.villagerMailbox ?? [];
  const letter = mailbox.find((entry) => entry.id === mailId);
  if (!letter || letter.claimed) return null;

  const unlocked = world.unlockedRecipeIds ?? [];
  const unlockedRecipeIds =
    letter.recipeId && !unlocked.includes(letter.recipeId)
      ? [...unlocked, letter.recipeId]
      : unlocked;
  return {
    ...world,
    villagerMailbox: mailbox.map((entry) =>
      entry.id === mailId ? { ...entry, claimed: true } : entry,
    ),
    unlockedRecipeIds,
  };
}

// ============================================================================
// DIALOGUE TREES
// ============================================================================

/** Opening node of a conversation. */
export function startDialogue(villagerId: VillagerId): VillagerDialogueNode {
  return VILLAGERS[villagerId].dialogue[DIALOGUE_START];
}

/**
 * Node reached by picking an option. Null ends the conversation. It is also null
 * when the node or option does not exist.
 */
export function nextDialogueNode(
  villagerId: VillagerId,
  nodeId: string,
  optionId: string,
): VillagerDialogueNode | null {
  const tree = VILLAGERS[villagerId].dialogue;
  const option = tree[nodeId]?.options.find((entry) => entry.id === optionId);
  if (!option?.next) return null;
  return tree[option.next] ?? null;
}
