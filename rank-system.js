// Thai Checkers Rank & MMR System (ระบบจัดอันดับและเก็บสถิติแร้ง)

(function(exports) {
  'use strict';

  const TIERS = [
    { id: 'bronze_3', name: 'ทองแดง III', code: 'Bronze III', tier: 'Bronze', badge: '🥉', minMmr: 1000, color: '#cd7f32' },
    { id: 'bronze_2', name: 'ทองแดง II', code: 'Bronze II', tier: 'Bronze', badge: '🥉', minMmr: 1060, color: '#cd7f32' },
    { id: 'bronze_1', name: 'ทองแดง I', code: 'Bronze I', tier: 'Bronze', badge: '🥉', minMmr: 1130, color: '#cd7f32' },

    { id: 'silver_3', name: 'เงิน III', code: 'Silver III', tier: 'Silver', badge: '🥈', minMmr: 1200, color: '#94a3b8' },
    { id: 'silver_2', name: 'เงิน II', code: 'Silver II', tier: 'Silver', badge: '🥈', minMmr: 1260, color: '#94a3b8' },
    { id: 'silver_1', name: 'เงิน I', code: 'Silver I', tier: 'Silver', badge: '🥈', minMmr: 1330, color: '#94a3b8' },

    { id: 'gold_3', name: 'ทองคำ III', code: 'Gold III', tier: 'Gold', badge: '🥇', minMmr: 1400, color: '#fbbf24' },
    { id: 'gold_2', name: 'ทองคำ II', code: 'Gold II', tier: 'Gold', badge: '🥇', minMmr: 1460, color: '#fbbf24' },
    { id: 'gold_1', name: 'ทองคำ I', code: 'Gold I', tier: 'Gold', badge: '🥇', minMmr: 1530, color: '#fbbf24' },

    { id: 'plat_3', name: 'แพลตตินัม III', code: 'Platinum III', tier: 'Platinum', badge: '💎', minMmr: 1600, color: '#38bdf8' },
    { id: 'plat_2', name: 'แพลตตินัม II', code: 'Platinum II', tier: 'Platinum', badge: '💎', minMmr: 1660, color: '#38bdf8' },
    { id: 'plat_1', name: 'แพลตตินัม I', code: 'Platinum I', tier: 'Platinum', badge: '💎', minMmr: 1730, color: '#38bdf8' },

    { id: 'diamond_3', name: 'ไดมอนด์ III', code: 'Diamond III', tier: 'Diamond', badge: '👑', minMmr: 1800, color: '#c084fc' },
    { id: 'diamond_2', name: 'ไดมอนด์ II', code: 'Diamond II', tier: 'Diamond', badge: '👑', minMmr: 1860, color: '#c084fc' },
    { id: 'diamond_1', name: 'ไดมอนด์ I', code: 'Diamond I', tier: 'Diamond', badge: '👑', minMmr: 1930, color: '#c084fc' },

    { id: 'master', name: 'มาสเตอร์ (ปรมาจารย์)', code: 'Master', tier: 'Master', badge: '🏆', minMmr: 2000, color: '#ef4444' },
    { id: 'grandmaster', name: 'เซียนหมากฮอสสยาม', code: 'Grandmaster', tier: 'Grandmaster', badge: '⚡', minMmr: 2200, color: '#f59e0b' }
  ];

  function getRankFromMmr(mmr) {
    mmr = Math.max(1000, Math.round(Number(mmr) || 1200));
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (mmr >= TIERS[i].minMmr) {
        const currentTier = TIERS[i];
        const nextTier = TIERS[i + 1] || null;
        let progress = 100;
        let neededMmr = 0;
        if (nextTier) {
          const range = nextTier.minMmr - currentTier.minMmr;
          const current = mmr - currentTier.minMmr;
          progress = Math.min(100, Math.max(0, Math.round((current / range) * 100)));
          neededMmr = nextTier.minMmr - mmr;
        }
        return {
          ...currentTier,
          mmr,
          progress,
          nextTierName: nextTier ? nextTier.name : 'ระดับสูงสุด',
          neededMmr
        };
      }
    }
    return { ...TIERS[0], mmr, progress: 0, nextTierName: TIERS[1].name, neededMmr: 60 };
  }

  function calculateMmrChange(playerMmr, opponentMmr, result, isAi = false, aiDiff = 'medium') {
    playerMmr = Number(playerMmr) || 1200;
    opponentMmr = Number(opponentMmr) || 1200;

    if (isAi) {
      if (result === 'win') {
        if (aiDiff === 'hard') return +30;
        if (aiDiff === 'medium') return +20;
        return +12;
      } else if (result === 'loss') {
        if (aiDiff === 'hard') return -8;
        if (aiDiff === 'medium') return -12;
        return -16;
      }
      return +4; // draw vs AI
    }

    // Standard ELO rating for Human vs Human
    const expectedScore = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
    let actualScore = 0;
    if (result === 'win') actualScore = 1;
    else if (result === 'draw') actualScore = 0.5;

    const K = 32;
    let change = Math.round(K * (actualScore - expectedScore));

    // Clamp sensible boundaries so wins always feel rewarding and losses fair
    if (result === 'win' && change < 15) change = 16;
    if (result === 'loss' && change > -12) change = -12;
    if (result === 'draw') change = Math.round(change / 2);

    return change;
  }

  exports.TIERS = TIERS;
  exports.getRankFromMmr = getRankFromMmr;
  exports.calculateMmrChange = calculateMmrChange;
})(typeof module !== 'undefined' && module.exports ? module.exports : (window.RankSystem = {}));
