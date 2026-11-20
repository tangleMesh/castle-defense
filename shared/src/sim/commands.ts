import { RESCUE_DELAY_TICKS, SAPPHIRE_GOLD, SELL_REFUND, START_LUMBER, START_SAPPHIRES, TICK_RATE } from '../constants';
import { BUILDINGS, ITEM_BY_ID, MAX_ITEMS, itemsOf, teammateCarries, type ItemDef } from '../data';
import { inRescueArea } from '../map/map';
import type { Sim } from './sim';
import type { Entity, PlayerCommand, PlayerState } from './state';
import { placementError } from './placement';
import { builderBounds } from './movement';

function refundOrders(sim: Sim, builder: Entity) {
  const p = sim.state.players[builder.owner];
  // Any new order also ends a repair.
  delete builder.repairId;
  for (const o of builder.orders ?? []) { p.gold += o.paid; if (o.paidS) p.sapphires = sapphiresOf(p) + o.paidS; if (o.paidL) p.lumber = lumberOf(p) + o.paidL; }
  builder.orders = [];
}

export function sapphiresOf(p: PlayerState): number {
  return p.sapphires ?? START_SAPPHIRES;
}

export function lumberOf(p: PlayerState): number {
  return p.lumber ?? START_LUMBER;
}

const finite = (...v: number[]) => v.every((n) => typeof n === 'number' && Number.isFinite(n));

export function applyCommand(sim: Sim, { player, cmd }: PlayerCommand) {
  const s = sim.state;
  const p = s.players[player];
  if (!p || s.phase !== 'playing') return;
  const builder = sim.get(p.builderId);
  const fail = (msg: string) => sim.emit({ t: 'err', p: player, msg });

  switch (cmd.c) {
    case 'move': {
      if (!builder || !finite(cmd.x, cmd.y)) return;
      refundOrders(sim, builder);
      // The builder stays inside its team's build zone; targets beyond it stop at the border.
      const z = builderBounds(p.team);
      builder.moveX = clamp(cmd.x, z.x0, z.x1);
      builder.moveY = clamp(cmd.y, z.y0, z.y1);
      return;
    }
    case 'stop': {
      if (!builder) return;
      refundOrders(sim, builder);
      delete builder.moveX; delete builder.moveY;
      return;
    }
    case 'build': {
      if (!builder || !finite(cmd.tx, cmd.ty)) return;
      const def = BUILDINGS[cmd.building];
      if (!def || def.upgradeOnly) return fail('Cannot build that');
      if (!cmd.queue) refundOrders(sim, builder);
      if (p.gold < def.cost) return fail('Not enough gold');
      const lum = def.lumber ?? 0;
      if (lumberOf(p) < lum) return fail('Not enough lumber (finish buildings to earn more)');
      const gems = def.sapphires ?? 0;
      if (sapphiresOf(p) < gems) return fail('Needs a sapphire (buy one in the castle shop)');
      const err = placementError(sim, player, def.id, cmd.tx, cmd.ty);
      if (err) return fail(err);
      p.gold -= def.cost;
      if (lum) p.lumber = lumberOf(p) - lum;
      if (gems) p.sapphires = sapphiresOf(p) - gems;
      builder.orders!.push({ building: def.id, tx: cmd.tx, ty: cmd.ty, paid: def.cost, ...(gems ? { paidS: gems } : {}), ...(lum ? { paidL: lum } : {}) });
      delete builder.moveX; delete builder.moveY;
      return;
    }
    case 'upgrade': {
      const e = sim.get(cmd.id);
      if (!e || e.kind !== 'building' || e.owner !== player || e.hp <= 0) return;
      if (e.buildLeft) return fail('Building is busy');
      const from = BUILDINGS[e.type];
      const to = BUILDINGS[cmd.to];
      if (!to || !from.upgrades?.includes(to.id)) return fail('Invalid upgrade');
      if (p.gold < to.cost) return fail('Not enough gold');
      if (lumberOf(p) < (to.lumber ?? 0)) return fail('Not enough lumber (finish buildings to earn more)');
      if (sapphiresOf(p) < (to.sapphires ?? 0)) return fail('Needs a sapphire (buy one in the castle shop)');
      p.gold -= to.cost;
      if (to.lumber) p.lumber = lumberOf(p) - to.lumber;
      if (to.sapphires) p.sapphires = sapphiresOf(p) - to.sapphires;
      const ratio = e.hp / e.maxHp;
      e.type = to.id;
      e.maxHp = to.hp;
      e.hp = Math.max(1, Math.round(to.hp * ratio));
      e.value = (e.value ?? 0) + to.cost;
      e.buildLeft = e.buildTotal = Math.round(to.buildTime * TICK_RATE);
      e.upgrading = true;
      delete e.spawnTimer;
      delete e.abilityCd;
      return;
    }
    case 'sell': {
      const e = sim.get(cmd.id);
      if (!e || e.kind !== 'building' || e.owner !== player || e.hp <= 0) return;
      const fresh = (e.buildLeft ?? 0) > 0 && !e.upgrading;
      p.gold += Math.floor((e.value ?? 0) * (fresh ? 1 : SELL_REFUND));
      // Cancelling a construction returns its sapphire too; a finished one keeps it.
      const gems = BUILDINGS[e.type].sapphires;
      if (fresh && gems) p.sapphires = sapphiresOf(p) + gems;
      const lum = BUILDINGS[e.type].lumber;
      if (fresh && lum) p.lumber = lumberOf(p) + lum;
      sim.removeNow(e);
      sim.emit({ t: 'die', id: e.id, x: e.x, y: e.y, k: 'building' });
      return;
    }
    case 'repair': {
      const e = sim.get(cmd.id);
      if (!builder || !e || e.hp <= 0) return;
      // Own buildings and the own castle.
      if (!(e.kind === 'building' && e.owner === player) && !(e.kind === 'castle' && e.team === p.team)) return;
      if (e.buildLeft) return fail('Building is under construction');
      if (e.hp >= e.maxHp) return fail(e.kind === 'castle' ? 'Castle is undamaged' : 'Building is undamaged');
      refundOrders(sim, builder);
      delete builder.moveX; delete builder.moveY;
      builder.repairId = e.id;
      return;
    }
    case 'rescue': {
      if (!finite(cmd.x, cmd.y)) return;
      if (p.rescueUsed) return fail('Rescue strike already used this round');
      if (!inRescueArea(p.team, cmd.x, cmd.y)) return fail('Rescue strike must target your own build zone');
      p.rescueUsed = true;
      p.strikes++;
      s.strikes.push({ player, x: cmd.x, y: cmd.y, ticksLeft: RESCUE_DELAY_TICKS });
      sim.emit({ t: 'strike', p: player, x: cmd.x, y: cmd.y, hit: 0 });
      return;
    }
    case 'buySapphire': {
      if (p.gold < SAPPHIRE_GOLD) return fail(`A sapphire costs ${SAPPHIRE_GOLD} gold`);
      p.gold -= SAPPHIRE_GOLD;
      p.sapphires = sapphiresOf(p) + 1;
      sim.emit({ t: 'sapphire', p: player });
      return;
    }
    case 'buy': {
      const item = ITEM_BY_ID[cmd.item];
      if (!item) return fail('Unknown item');
      const bag = itemsOf(p);
      const elapsed = s.tick - s.roundStartTick;
      if (item.availableAfter && elapsed < item.availableAfter * TICK_RATE) return fail(`${item.name} is available after ${Math.ceil(item.availableAfter / 60)} min`);
      if ((p.itemReady?.[item.id] ?? 0) > s.tick) return fail(`${item.name} restocks in ${Math.ceil(((p.itemReady![item.id]) - s.tick) / TICK_RATE)} s`);
      if (!item.use) {
        if (bag.includes(item.id)) return fail(`You already carry ${item.name}`);
        const mate = teammateCarries(s.players, player, item);
        if (mate) return fail(`${mate} already carries ${item.name}: it doesn't stack within a team`);
        if (bag.length >= MAX_ITEMS) return fail(`Your builder can carry only ${MAX_ITEMS} items`);
      }
      if (p.gold < item.cost) return fail('Not enough gold');
      if (lumberOf(p) < (item.lumber ?? 0)) return fail('Not enough lumber');
      p.gold -= item.cost;
      if (item.lumber) p.lumber = lumberOf(p) - item.lumber;
      if (item.restock) (p.itemReady ??= {})[item.id] = s.tick + Math.round(item.restock * TICK_RATE);
      if (item.use) useItem(sim, p.team, builder, item.use);
      else p.items = [...bag, item.id];
      sim.emit({ t: 'item', p: player, item: item.id });
      return;
    }
  }
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Consumables: a timed team-wide damage boost, or a heal and armor for allies around the builder. */
function useItem(sim: Sim, team: 0 | 1, builder: Entity | undefined, use: NonNullable<ItemDef['use']>) {
  const ticks = Math.round(use.duration * TICK_RATE);
  if (use.dmg) (sim.state.teamBuffs ??= []).push({ team, dmg: use.dmg, left: ticks });
  if (use.heal || use.armor) {
    for (const u of sim.state.entities) {
      if (u.kind !== 'unit' || u.team !== team || u.hp <= 0) continue;
      if (builder && use.radius && Math.hypot(u.x - builder.x, u.y - builder.y) > use.radius) continue;
      if (use.heal) { u.hp = Math.min(u.maxHp, u.hp + use.heal); sim.emit({ t: 'heal', a: u.id, b: u.id }); }
      if (use.armor) u.stone = { armor: use.armor, left: ticks };
    }
  }
}
