import type { BuildingDef } from './types';

/**
 * Buildings every builder has in the castleFight map: the Treasure Box (+25% income for the first,
 * each further one 15% less than the one before; fragile). Values as in the map.
 */
export const TREASURE_BOX: BuildingDef = {
  id: 'treasure_box', name: 'Treasure Chest', faction: 'any', cost: 350, lumber: 500, hp: 650, armor: 0, buildTime: 1, size: 2,
  desc: 'Your income rises by 25% for the first chest, each further one adds 15% less than the one before (21.25%, 18.06%, …). Fragile: guard it well.',
  treasure: true, incomeRate: 0.009, lumberGain: 0,
  model: { style: 'treasure', wall: 0x7a5228, roof: 0xe0b040, height: 14 },
};

export const COMMON_BUILDINGS: BuildingDef[] = [TREASURE_BOX];
