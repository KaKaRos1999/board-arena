/**
 * Dokapon Kingdom Engine (โดกาปอง: เกมทำลายมิตรภาพ)
 * Supports Node.js & Browser.
 * 
 * Includes:
 * - Circular RPG Map with Towns, Monsters, Shops, Treasures, Castle
 * - Dice / Spinner Movement (1-6)
 * - Rock-Paper-Scissors Battle System (Two-way Clashes: Player Attack & Monster Counter-attack!)
 * - Leveling Up & Character Stat Progression (EXP -> Levels -> Bonus HP/ATK/DEF/MAG)
 * - Town Liberation, Upgrades & Passive Gold Taxes
 * - PvP Friendship-Destruction Punishments (Steal Gold, Steal Town, Prank)
 * - Game Balance: 20 Rounds Campaign, 10,000G Net Worth Goal, or Control All 5 Towns!
 */

(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  }
  if (typeof root !== 'undefined') {
    root.DokaponEngine = engine;
  }
  if (typeof window !== 'undefined') {
    window.DokaponEngine = engine;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WIN_GOLD = 10000;
  const WIN_TOWNS = 5;
  const MAX_ROUNDS = 20;

  // Map Node Definitions (16 nodes circular track)
  const MAP_NODES = [
    { id: 0, type: 'castle', name: '🏰 ปราสาทหลวง', desc: 'ฟื้นฟูพลังชีวิตเต็ม & ชุบชีวิต & รับเบี้ยเลี้ยง' },
    { id: 1, type: 'monster', name: '⚔️ ป่าก็อบลิน', desc: 'พบมอนสเตอร์ดักซุ่ม' },
    { id: 2, type: 'town', townId: 'oakland', name: '🏘️ เมืองโอ๊คแลนด์', price: 600, income: 120, desc: 'หมู่บ้านเกษตรกรรม' },
    { id: 3, type: 'treasure', name: '🎁 หีบสมบัติ', desc: 'ลุ้นรับเงินทองหรือไอเทมหายาก' },
    { id: 4, type: 'shop', name: '🏪 ร้านค้าไอเทม', desc: 'ซื้อยาฟื้นพลังและคัมภีร์เวท' },
    { id: 5, type: 'monster', name: '⚔️ ถ้ำค้างคาวผี', desc: 'พบมอนสเตอร์ดักซุ่ม' },
    { id: 6, type: 'town', townId: 'sunvale', name: '🏘️ เมืองซันเวล', price: 800, income: 150, desc: 'เมืองแห่งแสงตะวัน' },
    { id: 7, type: 'curse', name: '💀 สุสานต้องสาป', desc: 'ระวังเสียเลือดหรือเหรียญทอง!' },
    { id: 8, type: 'monster', name: '⚔️ บึงพิษโคโบลด์', desc: 'พบมอนสเตอร์ดักซุ่ม' },
    { id: 9, type: 'town', townId: 'crystal', name: '🏘️ เมืองคริสตัล', price: 1100, income: 190, desc: 'เหมืองผลึกเวทมนตร์' },
    { id: 10, type: 'treasure', name: '🎁 หีบสมบัติโบราณ', desc: 'ลุ้นรับเงินทองหรือไอเทมหายาก' },
    { id: 11, type: 'shop', name: '🏪 ร้านอาวุธและยา', desc: 'ซื้อยาฟื้นพลังและคัมภีร์เวท' },
    { id: 12, type: 'monster', name: '⚔️ รังโกเลมหิน', desc: 'พบมอนสเตอร์ดักซุ่ม' },
    { id: 13, type: 'town', townId: 'emerald', name: '🏘️ เมืองเอเมอรัลด์', price: 1400, income: 240, desc: 'ป้อมปราการมรกต' },
    { id: 14, type: 'monster', name: '⚔️ ยอดเขาไวเวิร์น', desc: 'พบมอนสเตอร์ดักซุ่ม' },
    { id: 15, type: 'town', townId: 'dragon', name: '🏘️ เมืองดราก้อนคีป', price: 2000, income: 320, desc: 'มหานครแห่งมังกร' }
  ];

  // Town initial monsters (Challenging Bosses)
  const INITIAL_TOWNS = {
    oakland: { name: 'เมืองโอ๊คแลนด์', price: 600, income: 120, owner: null, level: 1, monster: { name: 'ก็อบลินยักษ์จอมคลั่ง', hp: 95, maxHp: 95, atk: 22, def: 14, mag: 10, exp: 50, gold: 180 } },
    sunvale: { name: 'เมืองซันเวล', price: 800, income: 150, owner: null, level: 1, monster: { name: 'หมาป่าเคอเบรอสเพลิง', hp: 130, maxHp: 130, atk: 26, def: 18, mag: 14, exp: 70, gold: 240 } },
    crystal: { name: 'เมืองคริสตัล', price: 1100, income: 190, owner: null, level: 1, monster: { name: 'โกเลมผลึกคริสตัล', hp: 165, maxHp: 165, atk: 30, def: 24, mag: 18, exp: 90, gold: 300 } },
    emerald: { name: 'เมืองเอเมอรัลด์', price: 1400, income: 240, owner: null, level: 1, monster: { name: 'อัศวินเกราะทมิฬ', hp: 210, maxHp: 210, atk: 36, def: 28, mag: 22, exp: 120, gold: 380 } },
    dragon: { name: 'เมืองดราก้อนคีป', price: 2000, income: 320, owner: null, level: 1, monster: { name: 'ดราก้อนลอร์ดจอมราชัน', hp: 300, maxHp: 300, atk: 44, def: 32, mag: 30, exp: 180, gold: 600 } }
  };

  // Random field monsters
  const FIELD_MONSTERS = [
    { name: 'สไลม์วุ้นจอมกวน', hp: 60, maxHp: 60, atk: 18, def: 10, mag: 12, exp: 35, gold: 90, icon: '🟢' },
    { name: 'ก็อบลินหัวขโมย', hp: 75, maxHp: 75, atk: 22, def: 12, mag: 10, exp: 45, gold: 120, icon: '👺' },
    { name: 'โครงกระดูกนักดาบ', hp: 90, maxHp: 90, atk: 26, def: 15, mag: 16, exp: 60, gold: 160, icon: '💀' },
    { name: 'โคโบลด์จอมเวทย์', hp: 80, maxHp: 80, atk: 20, def: 12, mag: 30, exp: 65, gold: 170, icon: '🧙' },
    { name: 'โกเลมหินผา', hp: 120, maxHp: 120, atk: 30, def: 26, mag: 12, exp: 80, gold: 220, icon: '🗿' },
    { name: 'ไวเวิร์นสายฟ้า', hp: 110, maxHp: 110, atk: 34, def: 18, mag: 28, exp: 95, gold: 250, icon: '🦅' }
  ];

  const SHOP_ITEMS = [
    { id: 'potion', name: '🧪 ยาฟื้นพลัง HP', price: 80, desc: 'ฟื้นฟู HP +70 ทันที' },
    { id: 'elixir', name: '✨ น้ำยาชุบพลังชีวิตเต็ม', price: 220, desc: 'ฟื้นฟู HP เต็ม 100%' },
    { id: 'warp', name: '🌀 ผลึกวาร์ปกลับปราสาท', price: 130, desc: 'วาร์ปกลับปราสาทหลวงทันที' },
    { id: 'sword', name: '⚔️ ดาบเหล็กกล้า (+10 ATK)', price: 280, desc: 'เพิ่มพลังโจมตีถาวร +10' },
    { id: 'shield', name: '🛡️ โล่อัศวิน (+10 DEF)', price: 260, desc: 'เพิ่มพลังป้องกันถาวร +10' },
    { id: 'staff', name: '🔮 ไม้เท้าเวทมนตร์ (+12 MAG)', price: 290, desc: 'เพิ่มพลังเวทมนตร์ถาวร +12' }
  ];

  function createInitialState() {
    return {
      gameType: 'dokapon',
      turn: 'red',
      round: 1,
      maxRounds: MAX_ROUNDS,
      targetGold: WIN_GOLD,
      phase: 'roll', // 'roll', 'battle', 'shop', 'punish', 'town_upgrade', 'game_over'
      lastRoll: null,
      winner: null,
      winReason: null,
      players: {
        red: {
          id: 'red',
          name: 'ผู้เล่นแดง',
          pos: 0,
          hp: 120,
          maxHp: 120,
          atk: 28,
          def: 18,
          mag: 22,
          gold: 400,
          level: 1,
          exp: 0,
          maxExp: 100,
          towns: [],
          items: ['potion'],
          alive: true,
          reviveTurns: 0,
          avatar: 'cat_ninja',
          stats: { wins: 0, monstersKilled: 0 }
        },
        blue: {
          id: 'blue',
          name: 'ผู้เล่นน้ำเงิน',
          pos: 0,
          hp: 120,
          maxHp: 120,
          atk: 28,
          def: 18,
          mag: 22,
          gold: 400,
          level: 1,
          exp: 0,
          maxExp: 100,
          towns: [],
          items: ['potion'],
          alive: true,
          reviveTurns: 0,
          avatar: 'cyber_fox',
          stats: { wins: 0, monstersKilled: 0 }
        }
      },
      towns: JSON.parse(JSON.stringify(INITIAL_TOWNS)),
      battle: null,
      shop: null,
      punish: null,
      eventMessage: `ยินดีต้อนรับสู่อาณาจักรโดกาปอง! สะสมทรัพย์สินครบ ${WIN_GOLD.toLocaleString()}G, ยึดครบ 5 เมือง, หรือเป็นผู้นำเมื่อครบ ${MAX_ROUNDS} รอบ!`,
      recentLogs: [`เริ่มแคมเปญ Dokapon Kingdom (${MAX_ROUNDS} รอบ)! ทอยลูกเต๋าเพื่อเริ่มต้นการผจญภัย`]
    };
  }

  function getPlayerNetWorth(state, playerId) {
    const p = state.players[playerId];
    if (!p) return 0;
    let total = p.gold;
    p.towns.forEach(tId => {
      const town = state.towns[tId];
      if (town) total += town.price;
    });
    return total;
  }

  function checkVictory(state) {
    // 1. Check Gold target or All Towns
    for (const pid of ['red', 'blue']) {
      const p = state.players[pid];
      const netWorth = getPlayerNetWorth(state, pid);
      if (netWorth >= WIN_GOLD) {
        state.phase = 'game_over';
        state.winner = pid;
        state.winReason = `👑 ${p.name} สะสมทรัพย์สินมหาศาลครบ ${netWorth.toLocaleString()}G ครองราชย์เป็นมหาราชาแห่งโดกาปอง!`;
        return true;
      }
      if (p.towns.length >= WIN_TOWNS) {
        state.phase = 'game_over';
        state.winner = pid;
        state.winReason = `🏰 ${p.name} ปลดปล่อยและยึดครองแผ่นดินครบทั้ง ${WIN_TOWNS} เมือง ชนะเกมอย่างยิ่งใหญ่!`;
        return true;
      }
    }

    // 2. Check Round Limit
    if (state.round > state.maxRounds) {
      const redWorth = getPlayerNetWorth(state, 'red');
      const blueWorth = getPlayerNetWorth(state, 'blue');
      state.phase = 'game_over';

      if (redWorth > blueWorth) {
        state.winner = 'red';
        state.winReason = `🏁 ครบกำหนด ${state.maxRounds} รอบ! ${state.players.red.name} มีทรัพย์สินสูงสุด (${redWorth.toLocaleString()}G vs ${blueWorth.toLocaleString()}G) คว้าชัยชนะ!`;
      } else if (blueWorth > redWorth) {
        state.winner = 'blue';
        state.winReason = `🏁 ครบกำหนด ${state.maxRounds} รอบ! ${state.players.blue.name} มีทรัพย์สินสูงสุด (${blueWorth.toLocaleString()}G vs ${redWorth.toLocaleString()}G) คว้าชัยชนะ!`;
      } else {
        state.winner = 'draw';
        state.winReason = `🏁 ครบกำหนด ${state.maxRounds} รอบ! ทั้งสองฝ่ายมีทรัพย์สินเท่ากันพอดี (${redWorth.toLocaleString()}G) เสมอกัน!`;
      }
      return true;
    }

    return false;
  }

  // Level Up Check
  function checkLevelUp(player, state) {
    if (player.exp >= player.maxExp) {
      player.level++;
      player.exp -= player.maxExp;
      player.maxExp = Math.floor(player.maxExp * 1.4);
      player.maxHp += 25;
      player.hp = player.maxHp; // Free full heal on level up
      player.atk += 6;
      player.def += 4;
      player.mag += 5;

      const log = `🌟 [LEVEL UP!] ${player.name} อัปเกรดเป็น Lv.${player.level}! เลือดเต็ม HP:${player.maxHp} ATK:${player.atk} DEF:${player.def} MAG:${player.mag}!`;
      state.recentLogs.unshift(log);
      return true;
    }
    return false;
  }

  function rollSpinner(state, playerId) {
    if (state.phase !== 'roll') return { success: false, error: 'ยังไม่ถึงรอบทอยลูกเต๋า' };
    if (state.turn !== playerId) return { success: false, error: 'ยังไม่ใช่ตาของคุณ' };

    const player = state.players[playerId];
    if (!player.alive) {
      player.reviveTurns--;
      if (player.reviveTurns <= 0) {
        player.alive = true;
        player.hp = Math.floor(player.maxHp * 0.7);
        player.pos = 0; // Revive at Castle
        state.recentLogs.unshift(`⛪ ${player.name} ฟื้นคืนชีพที่ปราสาทหลวงแล้ว! เลือดฟื้นฟู 70%`);
      } else {
        state.recentLogs.unshift(`💀 ${player.name} ยังสลบอยู่ ต้องรออีก ${player.reviveTurns} รอบ`);
        switchTurn(state);
        return { success: true, revived: false };
      }
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    state.lastRoll = roll;
    const oldPos = player.pos;
    player.pos = (player.pos + roll) % MAP_NODES.length;

    state.recentLogs.unshift(`🎲 ${player.name} ทอยได้ [ ${roll} ] เดินไปยังช่อง ${player.pos} (${MAP_NODES[player.pos].name})`);
    handleNodeArrival(state, playerId);

    return { success: true, roll, newPos: player.pos };
  }

  function handleNodeArrival(state, playerId) {
    const player = state.players[playerId];
    const opponentId = playerId === 'red' ? 'blue' : 'red';
    const opponent = state.players[opponentId];
    const node = MAP_NODES[player.pos];

    // PvP Battle Check
    if (opponent.alive && opponent.pos === player.pos && player.pos !== 0) {
      state.phase = 'battle';
      state.battle = {
        isPvP: true,
        attacker: playerId,
        defender: opponentId,
        round: 1,
        turnSide: 'attacker',
        attackerAction: null,
        defenderAction: null,
        log: [`⚔️ ศึกลูกผู้ชาย! ${player.name} ปะทะ ${opponent.name} บนช่อง ${node.name}!`]
      };
      state.eventMessage = `⚔️ เปิดฉากการต่อสู้ระหว่าง ${player.name} และ ${opponent.name}!`;
      state.recentLogs.unshift(state.eventMessage);
      return;
    }

    switch (node.type) {
      case 'castle': {
        player.hp = player.maxHp;
        const bonusGold = 120;
        player.gold += bonusGold;
        state.eventMessage = `🏰 เข้าสู่ปราสาทหลวง! พระราชาต้อนรับ อวยพรฟื้นฟู HP เต็ม (${player.maxHp}) และมอบเงินสนับสนุน +${bonusGold}G!`;
        state.recentLogs.unshift(state.eventMessage);
        finishTurn(state);
        break;
      }

      case 'town': {
        const town = state.towns[node.townId];
        if (!town.owner) {
          // Oppressed by Boss Monster
          state.phase = 'battle';
          state.battle = {
            isPvP: false,
            attacker: playerId,
            defender: 'monster',
            monster: JSON.parse(JSON.stringify(town.monster)),
            townId: node.townId,
            round: 1,
            turnSide: 'attacker',
            monsterAttacking: false,
            attackerAction: null,
            defenderAction: null,
            log: [`🛡️ ${town.name} กำลังถูก [ ${town.monster.name} ] ยึดครอง! จงปราบมันเพื่อปลดปล่อยเมือง!`]
          };
          state.eventMessage = `🛡️ ต่อสู้เพื่อปลดปล่อย ${town.name}!`;
          state.recentLogs.unshift(state.eventMessage);
        } else if (town.owner === playerId) {
          // My Town: Rest & Collect or Upgrade
          const bonus = 100;
          player.gold += bonus;
          player.hp = Math.min(player.maxHp, player.hp + 40);
          state.eventMessage = `🏡 แวะพักที่ ${town.name} (เมืองของคุณ)! ฟื้นฟู HP +40 และได้รับผลตอบแทน +${bonus}G`;
          state.recentLogs.unshift(state.eventMessage);
          finishTurn(state);
        } else {
          // Opponent Town: Pay Tax
          const tax = Math.min(player.gold, Math.floor(town.income * 0.9));
          player.gold -= tax;
          state.players[town.owner].gold += tax;
          state.eventMessage = `💸 เหยียบถิ่นศัตรู! ${town.name} เป็นของ ${state.players[town.owner].name} คุณต้องจ่ายค่าผ่านทาง ${tax}G!`;
          state.recentLogs.unshift(state.eventMessage);
          finishTurn(state);
        }
        break;
      }

      case 'monster': {
        const m = FIELD_MONSTERS[Math.floor(Math.random() * FIELD_MONSTERS.length)];
        state.phase = 'battle';
        state.battle = {
          isPvP: false,
          attacker: playerId,
          defender: 'monster',
          monster: JSON.parse(JSON.stringify(m)),
          round: 1,
          turnSide: 'attacker',
          monsterAttacking: false,
          attackerAction: null,
          defenderAction: null,
          log: [`🌲 ป่าทึบ! มอนสเตอร์ [ ${m.name} ] โผล่ออกมาขวางทางคุณ!`]
        };
        state.eventMessage = `⚔️ พบศัตรู: ${m.name} (HP: ${m.hp})`;
        state.recentLogs.unshift(state.eventMessage);
        break;
      }

      case 'treasure': {
        const rand = Math.random();
        if (rand < 0.45) {
          const goldFound = Math.floor(Math.random() * 200) + 120;
          player.gold += goldFound;
          state.eventMessage = `🎁 เปิดหีบสมบัติโบราณ! พบถุงเหรียญทองคำ +${goldFound}G!`;
        } else if (rand < 0.75) {
          player.items.push('potion');
          state.eventMessage = `🎁 เปิดหีบสมบัติ! ได้รับ [ 🧪 ยาฟื้นพลัง HP ] บรรจุในกระเป๋า!`;
        } else {
          const atkBuff = 6;
          player.atk += atkBuff;
          state.eventMessage = `🎁 หีบสมบัติลึกลับ! พบดาบโบราณ พลังโจมตี ATK เพิ่มถาวร +${atkBuff}!`;
        }
        state.recentLogs.unshift(state.eventMessage);
        finishTurn(state);
        break;
      }

      case 'shop': {
        state.phase = 'shop';
        state.shop = {
          player: playerId,
          items: SHOP_ITEMS
        };
        state.eventMessage = `🏪 ยินดีต้อนรับสู่ร้านค้า! เลือกซื้อไอเทมหรืออาวุธเสริมแกร่งได้เลย`;
        state.recentLogs.unshift(state.eventMessage);
        break;
      }

      case 'curse': {
        const dmg = 25;
        player.hp = Math.max(1, player.hp - dmg);
        const lostGold = Math.min(player.gold, 80);
        player.gold -= lostGold;
        state.eventMessage = `💀 โดนคำสาปสุสานโบราณ! เสีย HP -${dmg} และทำเงินหล่นหาย -${lostGold}G!`;
        state.recentLogs.unshift(state.eventMessage);
        finishTurn(state);
        break;
      }

      default:
        finishTurn(state);
        break;
    }
  }

  // Battle Action Submission
  function resolveBattleTurn(state, playerId, action) {
    const battle = state.battle;
    if (!battle) return { success: false, error: 'ไม่อยู่ในช่วงต่อสู้' };

    const isPvP = battle.isPvP;

    // PvP: Standard Turn Flow
    if (isPvP) {
      if (battle.turnSide === 'attacker') {
        if (playerId !== battle.attacker) return { success: false, error: 'ตาของฝ่ายโจมตีเลือกท่า' };
        battle.attackerAction = action;
        battle.turnSide = 'defender';
        return { success: true, waitingForDefender: true };
      } else if (battle.turnSide === 'defender') {
        if (playerId !== battle.defender) return { success: false, error: 'ตาของฝ่ายป้องกันเลือกท่า' };
        battle.defenderAction = action;
        return executeBattleClash(state);
      }
    } else {
      // PvE (Against Monster)
      if (!battle.monsterAttacking) {
        // Player is Attacking Monster
        if (playerId !== battle.attacker) return { success: false, error: 'ยังไม่ใช่ตาของคุณ' };
        battle.attackerAction = action;
        // Monster AI chooses defense
        const choices = ['defend', 'counter', 'mg_guard'];
        battle.defenderAction = choices[Math.floor(Math.random() * choices.length)];
        return executeBattleClash(state);
      } else {
        // Monster is Attacking Player! Player must choose Defense!
        if (playerId !== battle.attacker) return { success: false, error: 'เลือกท่าป้องกันของคุณ' };
        battle.defenderAction = action;
        return executeMonsterClash(state);
      }
    }

    return { success: false, error: 'สถานะการต่อสู้ไม่ถูกต้อง' };
  }

  // Player attacks Monster or Player attacks Player
  function executeBattleClash(state) {
    const b = state.battle;
    const attacker = state.players[b.attacker];
    const defender = b.isPvP ? state.players[b.defender] : b.monster;
    const defName = defender.name;

    const atkAct = b.attackerAction;
    const defAct = b.defenderAction;

    let resultMsg = '';
    let atkDamage = 0;
    let counterDamage = 0;
    let healAmount = 0;

    if (atkAct === 'item') {
      healAmount = 70;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      resultMsg = `🧪 ${attacker.name} ดื่มยาฟื้นพลัง! ฟื้นฟูเลือด +${healAmount} HP!`;
    } else if (atkAct === 'attack') {
      if (defAct === 'counter') {
        atkDamage = Math.max(18, Math.floor(attacker.atk * 1.3 - defender.def * 0.3));
        resultMsg = `⚔️ ${attacker.name} โจมตีธรรมดา! ${defName} พยายามสวนกลับแต่เปิดช่องโหว่ โดนฟันเต็มๆ -${atkDamage} HP!`;
      } else if (defAct === 'defend') {
        atkDamage = Math.max(8, Math.floor((attacker.atk - defender.def * 0.5) * 0.45));
        resultMsg = `🛡️ ${defName} ยกโล่ป้องกัน! ลดความเสียหายเหลือเพียง -${atkDamage} HP`;
      } else if (defAct === 'mg_guard') {
        atkDamage = Math.max(16, Math.floor(attacker.atk - defender.def * 0.4));
        resultMsg = `⚔️ ${attacker.name} ฟันดาบทะลวงบาเรียเวทย์ของ ${defName} โดนไป -${atkDamage} HP!`;
      } else if (defAct === 'surrender') {
        atkDamage = 999;
        resultMsg = `🏃 ${defName} ขอยอมจำนน!`;
      }
    } else if (atkAct === 'strike') {
      if (defAct === 'counter') {
        counterDamage = Math.max(35, Math.floor(attacker.atk * 2.2));
        resultMsg = `💥⚡ [เคาน์เตอร์สะท้อนกลับ!!] ${defName} อ่านทางออก! สะท้อนหมัด 200% อัด ${attacker.name} กระเด็น -${counterDamage} HP!!`;
      } else if (defAct === 'defend') {
        atkDamage = Math.max(28, Math.floor(attacker.atk * 2.0 - defender.def * 0.3));
        resultMsg = `💥 [ท่าไม้ตายทะลวงเกราะ!] ${attacker.name} ฟาดท่าไม้ตายทะลวงโล่ ${defName} พังยับ โดนหนัก -${atkDamage} HP!!`;
      } else if (defAct === 'mg_guard' || defAct === 'surrender') {
        atkDamage = Math.max(32, Math.floor(attacker.atk * 2.2));
        resultMsg = `💥 [ไม้ตายระเบิดพลัง!!] ${attacker.name} ปล่อยท่าไม้ตายอัด ${defName} เต็มข้อ -${atkDamage} HP!!`;
      }
    } else if (atkAct === 'magic') {
      if (defAct === 'mg_guard') {
        counterDamage = Math.max(18, Math.floor(attacker.mag * 0.85));
        resultMsg = `🪄 [กระจกสะท้อนเวทย์!] ${defName} กางบาเรียเวทย์ สะท้อนลูกไฟกลับไปโดน ${attacker.name} -${counterDamage} HP!`;
      } else if (defAct === 'counter' || defAct === 'defend') {
        atkDamage = Math.max(24, Math.floor(attacker.mag * 1.5 - defender.def * 0.1));
        resultMsg = `🔮 [เวทมนตร์ระเบิดเพลิง!] ${attacker.name} ร่ายเวทย์ข้ามการป้องกันของ ${defName} เผาไหม้เต็มๆ -${atkDamage} HP!`;
      } else if (defAct === 'surrender') {
        atkDamage = 999;
        resultMsg = `🏃 ${defName} ขอยอมจำนน!`;
      }
    }

    if (atkDamage > 0) defender.hp = Math.max(0, defender.hp - atkDamage);
    if (counterDamage > 0) attacker.hp = Math.max(0, attacker.hp - counterDamage);

    b.log.unshift(resultMsg);
    state.recentLogs.unshift(resultMsg);

    b.attackerAction = null;
    b.defenderAction = null;

    if (defender.hp <= 0) return handleBattleVictory(state, b.attacker, b.defender, b.isPvP);
    if (attacker.hp <= 0) return handleBattleDefeat(state, b.attacker, b.defender, b.isPvP);

    b.round++;
    if (b.isPvP) {
      const prevAtk = b.attacker;
      b.attacker = b.defender;
      b.defender = prevAtk;
      b.turnSide = 'attacker';
      b.log.unshift(`🔄 สลับบทบาท! ตอนนี้ ${state.players[b.attacker].name} เป็นฝ่ายบุก และ ${state.players[b.defender].name} เป็นฝ่ายรับ!`);
    } else {
      // Monster survives -> Monster prepares counter-attack!
      b.monsterAttacking = true;
      b.turnSide = 'defender';
      const monsterMoves = ['attack', 'attack', 'strike', 'magic'];
      b.monsterAction = monsterMoves[Math.floor(Math.random() * monsterMoves.length)];
      b.log.unshift(`⚠️ [ระวัง!] ${defName} รอดชีวิตและกำลังสวนกลับ! จงเลือกท่าป้องกันของคุณ!`);
    }

    return { success: true, clash: resultMsg };
  }

  // Monster attacks Player (Player chooses Defense)
  function executeMonsterClash(state) {
    const b = state.battle;
    const player = state.players[b.attacker];
    const monster = b.monster;

    const monsterAct = b.monsterAction;
    const playerDef = b.defenderAction;

    let resultMsg = '';
    let dmgToPlayer = 0;
    let reflectedDmg = 0;

    if (playerDef === 'surrender') {
      dmgToPlayer = 999;
      resultMsg = `🏃 ${player.name} ขอยอมจำนนและหนีออกจากสนามรบ!`;
    } else if (monsterAct === 'attack') {
      if (playerDef === 'counter') {
        dmgToPlayer = Math.max(16, Math.floor(monster.atk * 1.3 - player.def * 0.3));
        resultMsg = `⚔️ ${monster.name} ฟันธรรมดา! ${player.name} ดักเคาน์เตอร์ไม่สำเร็จ โดนไปเต็มๆ -${dmgToPlayer} HP!`;
      } else if (playerDef === 'defend') {
        dmgToPlayer = Math.max(6, Math.floor((monster.atk - player.def * 0.5) * 0.45));
        resultMsg = `🛡️ [ป้องกันสำเร็จ!] ${player.name} ยกโล่รับการโจมตี เสียเลือดเพียง -${dmgToPlayer} HP`;
      } else if (playerDef === 'mg_guard') {
        dmgToPlayer = Math.max(14, Math.floor(monster.atk - player.def * 0.4));
        resultMsg = `⚔️ ${monster.name} ตีทะลวงบาเรียเวทย์ของ ${player.name} โดน -${dmgToPlayer} HP!`;
      }
    } else if (monsterAct === 'strike') {
      if (playerDef === 'counter') {
        reflectedDmg = Math.max(35, Math.floor(monster.atk * 2.2));
        resultMsg = `💥🔄 [เคาน์เตอร์สะท้อนกลับสุดสมบูรณ์แบบ!!] ${player.name} สวนกลับท่าไม้ตายของ ${monster.name} สะท้อนพลัง 200% อัดมอนสเตอร์ยับเยิน -${reflectedDmg} HP!!`;
      } else if (playerDef === 'defend') {
        dmgToPlayer = Math.max(26, Math.floor(monster.atk * 2.0 - player.def * 0.3));
        resultMsg = `💥 ${monster.name} ปล่อยท่าไม้ตายทะลวงโล่ ${player.name} กระเด็น โดนหนัก -${dmgToPlayer} HP!`;
      } else {
        dmgToPlayer = Math.max(30, Math.floor(monster.atk * 2.2));
        resultMsg = `💥 ${monster.name} ฟาดท่าไม้ตายอัด ${player.name} อย่างจัง -${dmgToPlayer} HP!`;
      }
    } else if (monsterAct === 'magic') {
      if (playerDef === 'mg_guard') {
        reflectedDmg = Math.max(18, Math.floor(monster.mag * 0.9));
        resultMsg = `🪄✨ [สะท้อนเวทย์!] ${player.name} กางกระจกเวทย์ สะท้อนลูกไฟย้อนกลับไปโดน ${monster.name} -${reflectedDmg} HP!`;
      } else {
        dmgToPlayer = Math.max(20, Math.floor(monster.mag * 1.5 - player.def * 0.1));
        resultMsg = `🔮 ${monster.name} ร่ายมนตร์ดำใส่ ${player.name} โดนดาเมจเวทย์ -${dmgToPlayer} HP!`;
      }
    }

    if (dmgToPlayer > 0) player.hp = Math.max(0, player.hp - dmgToPlayer);
    if (reflectedDmg > 0) monster.hp = Math.max(0, monster.hp - reflectedDmg);

    b.log.unshift(resultMsg);
    state.recentLogs.unshift(resultMsg);

    b.attackerAction = null;
    b.defenderAction = null;

    if (monster.hp <= 0) return handleBattleVictory(state, b.attacker, b.defender, b.isPvP);
    if (player.hp <= 0) return handleBattleDefeat(state, b.attacker, b.defender, b.isPvP);

    // Both survived: Next round, player attacks again
    b.round++;
    b.monsterAttacking = false;
    b.turnSide = 'attacker';
    b.log.unshift(`⚔️ รอบที่ ${b.round}! ถึงตา ${player.name} โจมตีมอนสเตอร์อีกครั้ง!`);

    return { success: true, clash: resultMsg };
  }

  function handleBattleVictory(state, winnerId, loserIdOrMonster, isPvP) {
    const winner = state.players[winnerId];

    if (isPvP) {
      const loser = state.players[loserIdOrMonster];
      loser.alive = false;
      loser.hp = 0;
      loser.reviveTurns = 2;
      winner.exp += 80;
      checkLevelUp(winner, state);

      state.phase = 'punish';
      state.punish = {
        winner: winnerId,
        loser: loserIdOrMonster,
        options: [
          { id: 'steal_gold', label: '💰 ขโมยเหรียญทองทั้งหมด', desc: `แย่งชิงเงิน ${loser.gold}G จากผู้แพ้` },
          { id: 'steal_town', label: '🏰 ปล้นยึดเมือง 1 เมือง', desc: 'เปลี่ยนเมืองของศัตรูมาเป็นของคุณ' },
          { id: 'prank', label: '🤡 ทาสีหน้าตัวตลก (ล้อเลียน)', desc: 'ประจานความพ่ายแพ้' }
        ]
      };
      const winMsg = `🏆 ${winner.name} ชนะการประลองดวลกับ ${loser.name}! กำลังเลือกบทลงโทษผู้แพ้...`;
      state.recentLogs.unshift(winMsg);
      state.battle = null;
      return { success: true, victory: true, punishPhase: true };
    } else {
      const monster = state.battle.monster;
      winner.gold += monster.gold;
      winner.exp += (monster.exp || 40);
      winner.stats.monstersKilled++;
      let winMsg = `🎉 ${winner.name} ปราบ [ ${monster.name} ] สำเร็จ! ได้รับ +${monster.gold}G และ +${monster.exp} EXP!`;

      checkLevelUp(winner, state);

      if (state.battle.townId) {
        const tId = state.battle.townId;
        const town = state.towns[tId];
        town.owner = winnerId;
        winner.towns.push(tId);
        winMsg += ` 🏰 ปลดปล่อย [ ${town.name} ] สำเร็จ! ตอนนี้เมืองเป็นของคุณแล้ว!`;
      }

      state.recentLogs.unshift(winMsg);
      state.battle = null;
      finishTurn(state);
      return { success: true, victory: true };
    }
  }

  function handleBattleDefeat(state, attackerId, defenderIdOrMonster, isPvP) {
    const attacker = state.players[attackerId];
    attacker.alive = false;
    attacker.hp = 0;
    attacker.reviveTurns = 2;

    if (isPvP) {
      const defender = state.players[defenderIdOrMonster];
      defender.exp += 80;
      checkLevelUp(defender, state);

      state.phase = 'punish';
      state.punish = {
        winner: defenderIdOrMonster,
        loser: attackerId,
        options: [
          { id: 'steal_gold', label: '💰 ขโมยเหรียญทองทั้งหมด', desc: `แย่งชิงเงิน ${attacker.gold}G จากผู้แพ้` },
          { id: 'steal_town', label: '🏰 ปล้นยึดเมือง 1 เมือง', desc: 'เปลี่ยนเมืองของศัตรูมาเป็นของคุณ' },
          { id: 'prank', label: '🤡 ทาสีหน้าตัวตลก (ล้อเลียน)', desc: 'ประจานความพ่ายแพ้' }
        ]
      };
      state.recentLogs.unshift(`🏆 ${defender.name} สวนกลับและคว้าชัยเหนือ ${attacker.name}!`);
      state.battle = null;
      return { success: true, defeat: true, punishPhase: true };
    } else {
      state.recentLogs.unshift(`💀 ${attacker.name} พ่ายแพ้ต่อมอนสเตอร์และหมดสติ! ต้องรอฟื้นคืนชีพที่ปราสาทหลวง`);
      state.battle = null;
      finishTurn(state);
      return { success: true, defeat: true };
    }
  }

  function applyPunishment(state, winnerId, choiceId) {
    if (state.phase !== 'punish' || !state.punish) return { success: false, error: 'ไม่อยู่ในช่วงลงโทษ' };
    if (state.punish.winner !== winnerId) return { success: false, error: 'คุณไม่ใช่ผู้มีสิทธิ์เลือกบทลงโทษ' };

    const winner = state.players[winnerId];
    const loser = state.players[state.punish.loser];

    let log = '';
    if (choiceId === 'steal_gold') {
      const stolen = loser.gold;
      loser.gold = 0;
      winner.gold += stolen;
      log = `💰 [บทลงโทษ] ${winner.name} ปล้นเหรียญทองทั้งหมดของ ${loser.name} (+${stolen}G)! เพื่อนรักหักเหลี่ยมโหด!`;
    } else if (choiceId === 'steal_town') {
      if (loser.towns.length > 0) {
        const stolenTownId = loser.towns.pop();
        winner.towns.push(stolenTownId);
        state.towns[stolenTownId].owner = winnerId;
        log = `🏰 [บทลงโทษ] ${winner.name} ยึดครองเมือง [ ${state.towns[stolenTownId].name} ] ไปจาก ${loser.name}!`;
      } else {
        const stolen = Math.floor(loser.gold / 2);
        loser.gold -= stolen;
        winner.gold += stolen;
        log = `💰 [บทลงโทษ] ${loser.name} ไม่มีเมืองให้ยึด จึงถูกขโมยเงินกึ่งหนึ่งแทน (+${stolen}G)!`;
      }
    } else if (choiceId === 'prank') {
      loser.name = `🤡 ตัวตลกพ่ายแพ้`;
      log = `🤡 [บทลงโทษ] ${winner.name} สวมหน้ากากตัวตลกให้ ${loser.name} เพื่อความบันเทิงแก่สาธารณชน!`;
    }

    state.recentLogs.unshift(log);
    state.punish = null;
    finishTurn(state);
    return { success: true, log };
  }

  function buyShopItem(state, playerId, itemId) {
    if (state.phase !== 'shop' || !state.shop) return { success: false, error: 'ร้านค้าไม่ได้เปิดอยู่' };
    if (state.shop.player !== playerId) return { success: false, error: 'ยังไม่ใช่ตาของคุณ' };

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'ไม่พบไอเทมนี้' };

    const player = state.players[playerId];
    if (player.gold < item.price) {
      return { success: false, error: `เงินไม่พอ! ขาดอีก ${item.price - player.gold}G` };
    }

    player.gold -= item.price;
    if (item.id === 'sword') {
      player.atk += 10;
      state.recentLogs.unshift(`⚔️ ${player.name} ซื้อดาบเหล็กกล้า! ATK เพิ่มเป็น ${player.atk}`);
    } else if (item.id === 'shield') {
      player.def += 10;
      state.recentLogs.unshift(`🛡️ ${player.name} ซื้อโล่อัศวิน! DEF เพิ่มเป็น ${player.def}`);
    } else if (item.id === 'staff') {
      player.mag += 12;
      state.recentLogs.unshift(`🔮 ${player.name} ซื้อไม้เท้าเวทย์! MAG เพิ่มเป็น ${player.mag}`);
    } else if (item.id === 'warp') {
      player.pos = 0; // Castle
      player.hp = player.maxHp;
      state.recentLogs.unshift(`🌀 ${player.name} ใช้วาร์ปผลึก กลับสู่ปราสาทหลวงทันที!`);
    } else {
      player.items.push(item.id);
      state.recentLogs.unshift(`🛍️ ${player.name} ซื้อ [ ${item.name} ] สำเร็จ!`);
    }

    return { success: true };
  }

  function leaveShop(state, playerId) {
    if (state.phase !== 'shop') return { success: false };
    state.shop = null;
    finishTurn(state);
    return { success: true };
  }

  function finishTurn(state) {
    if (checkVictory(state)) return;
    switchTurn(state);
  }

  function switchTurn(state) {
    const nextTurn = state.turn === 'red' ? 'blue' : 'red';
    state.turn = nextTurn;
    state.phase = 'roll';
    state.lastRoll = null;

    if (nextTurn === 'red') {
      state.round++;
      // Passive town income every round
      for (const pid of ['red', 'blue']) {
        const p = state.players[pid];
        let income = 0;
        p.towns.forEach(tId => {
          const town = state.towns[tId];
          if (town) income += town.income;
        });
        if (income > 0) {
          p.gold += income;
          state.recentLogs.unshift(`💰 [เงินปันผลรอบ ${state.round}] ${p.name} ได้รับภาษีจาก ${p.towns.length} เมือง รวม +${income}G!`);
        }
      }
    }

    checkVictory(state);
  }

  // AI Logic for Bot
  function getBestAIMove(state, aiSide) {
    if (state.phase === 'roll') {
      return { type: 'roll' };
    }

    if (state.phase === 'battle') {
      const b = state.battle;
      if (!b.isPvP) {
        // AI fighting Monster
        if (!b.monsterAttacking && b.attacker === aiSide) {
          // AI Attacking
          const aiPlayer = state.players[aiSide];
          if (aiPlayer.hp < 45 && aiPlayer.items.includes('potion')) {
            return { type: 'battle_action', action: 'item' };
          }
          const rand = Math.random();
          if (rand < 0.45) return { type: 'battle_action', action: 'attack' };
          if (rand < 0.75) return { type: 'battle_action', action: 'strike' };
          return { type: 'battle_action', action: 'magic' };
        } else if (b.monsterAttacking && b.attacker === aiSide) {
          // AI Defending against monster
          const rand = Math.random();
          if (rand < 0.50) return { type: 'battle_action', action: 'defend' };
          if (rand < 0.80) return { type: 'battle_action', action: 'counter' };
          return { type: 'battle_action', action: 'mg_guard' };
        }
      } else {
        // PvP Battle
        if (b.turnSide === 'attacker' && b.attacker === aiSide) {
          const aiPlayer = state.players[aiSide];
          if (aiPlayer.hp < 45 && aiPlayer.items.includes('potion')) {
            return { type: 'battle_action', action: 'item' };
          }
          const rand = Math.random();
          if (rand < 0.45) return { type: 'battle_action', action: 'attack' };
          if (rand < 0.75) return { type: 'battle_action', action: 'strike' };
          return { type: 'battle_action', action: 'magic' };
        }
        if (b.turnSide === 'defender' && b.defender === aiSide) {
          const rand = Math.random();
          if (rand < 0.50) return { type: 'battle_action', action: 'defend' };
          if (rand < 0.80) return { type: 'battle_action', action: 'counter' };
          return { type: 'battle_action', action: 'mg_guard' };
        }
      }
    }

    if (state.phase === 'punish' && state.punish && state.punish.winner === aiSide) {
      const loser = state.players[state.punish.loser];
      if (loser.towns.length > 0) return { type: 'punish', choice: 'steal_town' };
      return { type: 'punish', choice: 'steal_gold' };
    }

    if (state.phase === 'shop' && state.shop && state.shop.player === aiSide) {
      const aiPlayer = state.players[aiSide];
      if (aiPlayer.gold >= 280) {
        return { type: 'shop_buy', itemId: 'sword' };
      } else if (aiPlayer.gold >= 80 && aiPlayer.items.length === 0) {
        return { type: 'shop_buy', itemId: 'potion' };
      } else {
        return { type: 'shop_leave' };
      }
    }

    return null;
  }

  return {
    MAP_NODES,
    INITIAL_TOWNS,
    FIELD_MONSTERS,
    SHOP_ITEMS,
    WIN_GOLD,
    WIN_TOWNS,
    MAX_ROUNDS,
    createInitialState,
    getPlayerNetWorth,
    checkVictory,
    checkLevelUp,
    rollSpinner,
    resolveBattleTurn,
    applyPunishment,
    buyShopItem,
    leaveShop,
    switchTurn,
    getBestAIMove
  };
});
