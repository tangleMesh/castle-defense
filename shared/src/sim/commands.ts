import { RESCUE_DELAY_TICKS, RESCUE_RANGE, SAPPHIRE_GOLD, SELL_REFUND, START_SAPPHIRES, TICK_RATE } from '../constants';
import { BUILDINGS, ITEM_BY_ID, MAX_ITEMS, itemsOf } from '../data';
import { MAP, rectCenter } from '../map/map';
import type { Sim } from './sim';
import type { Entity, PlayerCommand, PlayerState } from './state';
import { placementError } from './placement';
import { builderBounds } from './movement';

function refundOrders(sim: Sim, builder: Entity) {
  const p = sim.state.players[builder.owner];
  for (const o of builder.orders ?? []) { p.gold += o.paid; if (o.paidS) p.sapphires = sapphiresOf(p) + o.paidS; }
  builder.orders = [];
}

export function sapphiresOf(p: PlayerState): number {
  return p.sapphires ?? START_SAPPHIRES;
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
      const gems = def.sapphires ?? 0;
      if (sapphiresOf(p) < gems) return fail('Needs a sapphire (buy one in the castle shop)');
      const err = placementError(sim, player, def.id, cmd.tx, cmd.ty);
      if (err) return fail(err);
      p.gold -= def.cost;
      if (gems) p.sapphires = sapphiresOf(p) - gems;
      builder.orders!.push({ building: def.id, tx: cmd.tx, ty: cmd.ty, paid: def.cost, ...(gems ? { paidS: gems } : {}) });
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
      if (sapphiresOf(p) < (to.sapphires ?? 0)) return fail('Needs a sapphire (buy one in the castle shop)');
      p.gold -= to.cost;
      if (to.sapphires) p.sapphires = sapphiresOf(p) - to.sapphires;
      const ratio = e.hp / e.maxHp;
      e.type = to.id;
      e.maxHp = to.hp;
      e.hp = Math.max(1, Math.round(to.hp * ratio));
      e.value = (e.value ?? 0) + to.cost;
      e.buildLeft = e.buildTotal = Math.round(to.buildTime * TICK_RATE);
      e.upgrading = true;
      delete e.spawnTimer;
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
      sim.removeNow(e);
      sim.emit({ t: 'die', id: e.id, x: e.x, y: e.y, k: 'building' });
      return;
    }
    case 'rescue': {
      if (!finite(cmd.x, cmd.y)) return;
      if (p.rescueUsed) return fail('Rescue strike already used this round');
      const c = rectCenter(MAP.castles[p.team]);
      if (Math.hypot(cmd.x - c.x, cmd.y - c.y) > RESCUE_RANGE) return fail('Rescue strike must target near your castle');
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
      if (bag.includes(item.id)) return fail(`You already carry ${item.name}`);
      if (bag.length >= MAX_ITEMS) return fail(`Your builder can carry only ${MAX_ITEMS} items`);
      if (p.gold < item.cost) return fail('Not enough gold');
      p.gold -= item.cost;
      p.items = [...bag, item.id];
      sim.emit({ t: 'item', p: player, item: item.id });
      return;
    }
  }
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
