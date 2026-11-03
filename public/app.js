// Thai Checkers (หมากฮ็อตออนไลน์) Main Application Client

(function() {
  'use strict';

  // --- STATE ---
  let socket = null;
  let gameMode = 'lobby'; // 'lobby' | 'online' | 'ai' | 'pass_play'
  let currentGameType = 'checkers'; // 'checkers' | 'makruk' | 'chess' | 'go'
  let currentRoomId = null;
  let currentRoomPassword = null;
  let myRole = 'red'; // 'red' | 'blue' | 'spectator'
  let isBoardFlipped = false;
  let boardState = null;
  let currentTurn = 'red';
  let activePiece = null;
  let legalMoves = [];
  let selectedPiece = null;
  let lastMove = null;
  let ruleMode = 'thai';
  let serverLanUrl = '';
  let goCaptures = { B: 0, W: 0 };
  let goConsecutivePasses = 0;
  let goPrevHash = null;

  // Saved Room Passwords (Host remembers their room passwords)
  function saveRoomPassword(roomId, password) {
    if (!roomId || !password) return;
    try {
      const keys = JSON.parse(localStorage.getItem('thai_checkers_room_keys') || '{}');
      keys[roomId] = password;
      localStorage.setItem('thai_checkers_room_keys', JSON.stringify(keys));
    } catch (e) {}
  }

  function getSavedRoomPassword(roomId) {
    if (!roomId) return null;
    try {
      const keys = JSON.parse(localStorage.getItem('thai_checkers_room_keys') || '{}');
      return keys[roomId] || null;
    } catch (e) { return null; }
  }

  // AI & Local Play State
  let aiDifficulty = 'medium';
  let aiSide = 'blue'; // user is red, ai is blue
  let isAITurnPending = false;

  // Extensible Category List & Game Catalog
  const GAME_CATEGORIES = [
    { id: 'all', name: 'ทั้งหมด', icon: '🌟', desc: 'ทุกเกมกระดานในระบบ' },
    { id: 'thai', name: 'กระดานไทย', icon: '🇹🇭', desc: 'เกมกระดานเชิงยุทธวิธีแบบไทยดั้งเดิม' },
    { id: 'classic', name: 'ยุทธศาสตร์สากล', icon: '♟️', desc: 'หมากรุกสากล หมากล้อม โอเทลโล่ มาตรฐานระดับโลก' },
    { id: 'casual', name: 'เล่นเร็ว / พัซเซิล', icon: '⚡', desc: 'ประลองไหวพริบ วางหมากเรียง สนุกไว เข้าใจง่าย' },
    { id: 'party', name: 'ปาร์ตี้ & RPG', icon: '🏰', desc: 'บอร์ดเกมผจญภัย ทอยเต๋า แย่งชิงมิตรภาพ' }
  ];

  const GAME_INFO = {
    checkers: {
      category: 'thai',
      name: 'หมากฮอสไทย',
      title: 'หมากฮอสไทย (Thai Checkers)',
      subtitle: 'เล่นง่าย ชวนเพื่อนด้วยลิงก์หรือสแกน QR Code ทันที<br>หรือฝึกซ้อมกับบอท AI สุดฉลาด!',
      emblemIcon: '🔴',
      tag: '🔥 ยอดนิยม',
      subDesc: '8 ตัวต่อฝ่าย • กินบังคับ • ฮอสบินได้ทุกระยะ',
      players: '2 ผู้เล่น',
      tip: 'กติกาหมากฮอสไทยแท้: 8 ตัวต่อฝ่าย • กินบังคับ • ฮอสบินได้ทุกระยะ'
    },
    makruk: {
      category: 'thai',
      name: 'หมากรุกไทย',
      title: 'หมากรุกไทย (Makruk)',
      subtitle: 'ศึกจอมยุทธ์กระดานไม้ไทย: ขุน เม็ด โคน ม้า เรือ เบี้ย<br>ประลองปัญญาแบบดั้งเดิมแท้ๆ!',
      emblemIcon: '⚔️🐴',
      tag: '🛡️ ยุทธการกระดานไม้',
      subDesc: 'ขุน เม็ด โคน ม้า เรือ เบี้ย • เบี้ยหงายแถว 6',
      players: '2 ผู้เล่น',
      tip: 'กติกาหมากรุกไทย: เบี้ยหงายที่แถว 6 • โคนเดิน 5 ทิศ • ม้าเดินรูปตัว L • รุกจน'
    },
    chess: {
      category: 'classic',
      name: 'หมากรุกสากล',
      title: 'หมากรุกสากล (Chess)',
      subtitle: 'เกมกระดานระดับโลก King Queen Rook Bishop Knight Pawn<br>ทดสอบกลยุทธ์ชิงไหวชิงพริบ!',
      emblemIcon: '♟️👑',
      tag: '🌍 มาตรฐานสากล',
      subDesc: 'King Queen Rook Bishop Knight Pawn • รุกจน',
      players: '2 ผู้เล่น',
      tip: 'กติกาสากล: พอนเดินหน้า/กินทแยง • ม้ากระโดด • ควีนครองกระดาน • รุกจน (Checkmate)'
    },
    go: {
      category: 'classic',
      name: 'หมากล้อม (Go)',
      title: 'หมากล้อม (Go / Weiqi)',
      subtitle: 'ศาสตร์แห่งกลยุทธ์ดำ-ขาว ล้อมพื้นที่ ชิงจุดยุทธศาสตร์<br>กระดาน 9x9 เล่นเร็ว จบไว สนุกทันใจ!',
      emblemIcon: '⚫⚪',
      tag: '☯️ ศาสตร์กลยุทธ์ลึกซึ้ง',
      subDesc: 'จุดตัด 9x9 • ล้อมพื้นที่ • นับลมหายใจ',
      players: '2 ผู้เล่น',
      tip: 'กติกาหมากล้อม: วางหมากบนจุดตัด • นับลมหายใจ • ล้อมกิน • นับแต้มพื้นที่ดินแดน'
    },
    othello: {
      category: 'classic',
      name: 'โอเทลโล่ (Othello)',
      title: 'โอเทลโล่ / รีเวอร์ซี (Othello)',
      subtitle: 'เกมกระดานพลิกหมากสุดคลาสสิก วางดักหัวท้ายเพื่อพลิกเป็นสีเรา<br>ใครมีหมากมากกว่าเมื่อจบเกมเป็นผู้ชนะ!',
      emblemIcon: '🟢⚪',
      tag: '🔄 พลิกเกมชิงชัย',
      subDesc: 'กระดาน 8x8 • ขลิบหนีบดักหัวท้ายเพื่อพลิกสี',
      players: '2 ผู้เล่น',
      tip: 'กติกาโอเทลโล่: ต้องวางในจุดที่ขลิบหนีบหมากคู่แข่งเพื่อพลิกสี • หากไม่มีตาเดินจะถูกข้ามตาอัตโนมัติ'
    },
    gomoku: {
      category: 'casual',
      name: 'หมากเรียง 5 (Gomoku)',
      title: 'หมากเรียง 5 (Gomoku / Connect 5)',
      subtitle: 'ประลองไหวพริบวางหมาก เรียง 5 ตัวในแนวใดก็ได้ก่อนชนะทันที!<br>เล่นง่าย สนุก รวดเร็ว ทุกเพศทุกวัย',
      emblemIcon: '🎯🏆',
      tag: '⚡ เล่นง่าย รวดเร็ว',
      subDesc: 'เรียง 5 เม็ดติดต่อกันแนวใดก็ได้ ชนะทันที',
      players: '2 ผู้เล่น',
      tip: 'กติกาหมากเรียง 5: ใครเรียงหมากสีตัวเองครบ 5 เม็ดติดต่อกัน (แนวนอน แนวตั้ง ทแยง) ชนะทันที'
    },
    connect4: {
      category: 'casual',
      name: 'หมากเรียง 4 (Connect 4)',
      title: 'หมากเรียง 4 (Connect 4)',
      subtitle: 'หยอดเหรียญลงในช่องให้เรียงครบ 4 ช่องติดต่อกัน<br>ท้าทายจังหวะและบล็อกคู่ต่อสู้แบบสุดมันส์!',
      emblemIcon: '🟡🔴',
      tag: '🎮 สนุกเพลินทุกเพศวัย',
      subDesc: 'หยอดเหรียญลง 7 คอลัมน์ เรียงครบ 4 เม็ดชนะ',
      players: '2 ผู้เล่น',
      tip: 'กติกา Connect 4: เลือกคอลัมน์เพื่อหยอดเหรียญลงล่างสุด ใครเรียงครบ 4 เม็ดก่อนชนะ'
    },
    dokapon: {
      category: 'party',
      name: 'โดกาปอง (Dokapon)',
      title: 'โดกาปอง: สงครามมิตรภาพ (Dokapon Kingdom)',
      subtitle: 'เกมกระดาน RPG ทำลายมิตรภาพชื่อดัง! ทอยเต๋า ผจญภัย ตีมอนสเตอร์<br>ปลดปล่อยเมือง ดวลเป่ายิ้งฉุบ โจมตี/ไม้ตาย/กัน/เคาน์เตอร์ และแย่งชิงทรัพย์สิน!',
      emblemIcon: '🏰⚔️',
      tag: '👑 RPG มิตรภาพแตกหัก',
      subDesc: 'ทอยลูกเต๋า • ตีมอนสเตอร์ • ยึดเมือง • แย่งชิงทรัพย์สิน',
      players: '2-4 ผู้เล่น',
      tip: 'กติกาโดกาปอง (แคมเปญ 20 รอบ): สะสมทรัพย์สินครบ 10,000G หรือยึดครบ 5 เมือง หรือมีทรัพย์สินสูงสุดเมื่อครบ 20 รอบ!'
    }
  };

  function getChessPieceHtml(pieceChar) {
    const isWhite = pieceChar === pieceChar.toUpperCase();
    const type = pieceChar.toLowerCase();
    const symbols = {
      k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
    };
    const icon = symbols[type] || '♟';
    const grad = isWhite ? 'radial-gradient(circle at 35% 30%, #ffffff, #e2e8f0 60%, #cbd5e1)' : 'radial-gradient(circle at 35% 30%, #334155, #1e293b 70%, #0f172a)';
    const border = isWhite ? '#94a3b8' : '#020617';
    const textColor = isWhite ? '#1e293b' : '#f8fafc';
    const textShadow = isWhite ? '0 1px 2px rgba(255,255,255,0.8)' : '0 1px 3px rgba(0,0,0,0.9)';

    return `
      <div class="chess-character-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="width: 84%; height: 84%; border-radius: 50%; background: ${grad}; border: 2.5px solid ${border}; box-shadow: 0 4px 8px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px; line-height: 1; color: ${textColor}; text-shadow: ${textShadow}; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">${icon}</span>
        </div>
      </div>
    `;
  }

  function getMakrukPieceHtml(pieceChar) {
    const isWhite = pieceChar === pieceChar.toUpperCase();
    const type = pieceChar.toUpperCase();
    const makrukInfo = {
      K: { thai: 'ขุน', icon: '👑' },
      M: { thai: 'เม็ด', icon: '💎' },
      S: { thai: 'โคน', icon: '🛡️' },
      H: { thai: 'ม้า', icon: '🐴' },
      R: { thai: 'เรือ', icon: '⛵' },
      P: { thai: 'เบี้ย', icon: '⚪' },
      F: { thai: 'หงาย', icon: '✨' }
    };
    const info = makrukInfo[type] || { thai: 'เบี้ย', icon: '⚪' };
    const grad = isWhite ? 'radial-gradient(circle at 35% 30%, #fef08a, #eab308 65%, #a16207)' : 'radial-gradient(circle at 35% 30%, #64748b, #334155 70%, #0f172a)';
    const border = isWhite ? '#ca8a04' : '#1e293b';
    const textColor = isWhite ? '#78350f' : '#f8fafc';

    return `
      <div class="makruk-character-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="width: 86%; height: 86%; border-radius: 50%; background: ${grad}; border: 2.5px solid ${border}; box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
          <span style="font-size: 18px; line-height: 1;">${info.icon}</span>
          <span class="makruk-label" style="font-size: 11px; font-weight: 800; color: ${textColor}; line-height: 1; margin-top: 1px;">${info.thai}</span>
        </div>
      </div>
    `;
  }

  // --- ARENAS, THEMES & SKINS ---
  const ARENAS = [
    'arena-anime-autumn',
    'arena-graveyard',
    'arena-dojo',
    'arena-space',
    'arena-forest',
    'arena-volcano',
    'arena-palace',
    'arena-sunset'
  ];
  const ARENA_NAMES = {
    'arena-anime-autumn': '🍁 อนิเมะใบไม้เปลี่ยนสี (Anime Autumn)',
    'arena-graveyard': '⚰️ สุสานผีสิง (Haunted Graveyard)',
    'arena-dojo': '🏯 โรงเตี๊ยมซากุระ',
    'arena-space': '🌌 ฐานทัพอวกาศ',
    'arena-forest': '🌲 ป่าเวทมนตร์',
    'arena-volcano': '🌋 ลานประลองลาวา',
    'arena-palace': '🏰 ท้องพระโรงหลวง',
    'arena-sunset': '🏝️ ชายหาดซันเซ็ต'
  };

  const BOARD_THEMES = [
    'theme-anime-autumn',
    'theme-graveyard-tomb',
    'theme-classic-wood',
    'theme-cosmic-space',
    'theme-zen-matcha',
    'theme-volcano-lava',
    'theme-royal-marble',
    'theme-sunset-beach',
    'theme-neon-cyber',
    'theme-emerald-jade'
  ];

  const PIECE_SKINS = [
    'skin-graveyard-ghosts',
    'skin-nong-tk',
    'skin-chibi-pets',
    'skin-chibi-monsters',
    'skin-chibi-ninjas',
    'skin-modern-3d',
    'skin-crystal-gem',
    'skin-neon-holo',
    'skin-ancient-coins',
    'skin-cute-creatures'
  ];

  const THEME_NAMES = {
    'theme-anime-autumn': '🍁 อนิเมะใบไม้เปลี่ยนสี (Anime Autumn)',
    'theme-graveyard-tomb': '⚰️ สุสานผีสิง (Haunted Graveyard)',
    'theme-classic-wood': '🏯 โรงเตี๊ยมซากุระ (Zen Dojo)',
    'theme-cosmic-space': '🌌 ฐานทัพอวกาศ (Cosmic Nebula)',
    'theme-zen-matcha': '🌲 ป่าเวทมนตร์ (Enchanted Forest)',
    'theme-volcano-lava': '🌋 ลาวาภูเขาไฟ (Volcano Inferno)',
    'theme-royal-marble': '🏰 ท้องพระโรงหลวง (Royal Palace)',
    'theme-sunset-beach': '🏝️ ชายหาดซันเซ็ต (Tropical Sunset)',
    'theme-neon-cyber': '⚡ นีออนไซเบอร์ (Cyberpunk)',
    'theme-emerald-jade': '✨ หยกมรกตทองคำ (Imperial Jade)'
  };

  const SKIN_NAMES = {
    'skin-graveyard-ghosts': '👻 ผีวิญญาณสุสาน (โมเดลลอยตัว)',
    'skin-nong-tk': '🧢 น้อง TK (โมเดล 3D ไม่กลม)',
    'skin-chibi-pets': '🐱 น้อนแมว & ชิบะ (โมเดลการ์ตูน)',
    'skin-chibi-monsters': '👾 มอนสเตอร์จิ๋ว (โมเดลการ์ตูน)',
    'skin-chibi-ninjas': '🥷 นินจาจิ๋ว (โมเดลการ์ตูน)',
    'skin-modern-3d': '🔴 โมเดิร์น 3D',
    'skin-crystal-gem': '💎 อัญมณีคริสตัล',
    'skin-neon-holo': '⚡ โฮโลแกรมแสง',
    'skin-ancient-coins': '🪙 เหรียญกษาปณ์ทอง',
    'skin-cute-creatures': '🐲 มังกร & สัตว์เทพ'
  };

  let currentArena = localStorage.getItem('checkers_arena') || 'arena-anime-autumn';
  let currentBoardTheme = localStorage.getItem('checkers_theme') || 'theme-anime-autumn';
  let currentPieceSkin = localStorage.getItem('checkers_skin') || 'skin-nong-tk';
  let autoRandomize = localStorage.getItem('checkers_auto_random') === 'true';

  // --- PLAYER PROFILE & STATS SYSTEM ---
  const DEFAULT_STATS = {
    name: 'นักสู้หมากฮอส',
    mmr: 1200,
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    piecesCaptured: 0,
    kingsCrowned: 0,
    history: []
  };

  function loadPlayerStats() {
    try {
      const saved = localStorage.getItem('checkers_player_stats_v2');
      if (saved) {
        return Object.assign({}, DEFAULT_STATS, JSON.parse(saved));
      }
      const oldName = localStorage.getItem('checkers_player_name');
      if (oldName) {
        return Object.assign({}, DEFAULT_STATS, { name: oldName });
      }
    } catch (e) {
      console.error(e);
    }
    return Object.assign({}, DEFAULT_STATS);
  }

  function savePlayerStats(stats) {
    try {
      localStorage.setItem('checkers_player_stats_v2', JSON.stringify(stats));
      localStorage.setItem('checkers_player_name', stats.name);
    } catch (e) {
      console.error(e);
    }
  }

  let playerStats = loadPlayerStats();

  // DOM Elements
  const lobbyView = document.getElementById('lobbyView');
  const gameView = document.getElementById('gameView');
  const boardGrid = document.getElementById('boardGrid');
  const roomPill = document.getElementById('roomPill');
  const headerRoomCode = document.getElementById('headerRoomCode');
  const sidebarRoomId = document.getElementById('sidebarRoomId');

  // Player bars
  const topPlayerBar = document.getElementById('topPlayerBar');
  const topPlayerName = document.getElementById('topPlayerName');
  const topPlayerStatus = document.getElementById('topPlayerStatus');
  const topPiecesCount = document.getElementById('topPiecesCount');
  const topTimerBox = document.getElementById('topTimerBox');

  const bottomPlayerBar = document.getElementById('bottomPlayerBar');
  const bottomPlayerName = document.getElementById('bottomPlayerName');
  const bottomPlayerStatus = document.getElementById('bottomPlayerStatus');
  const bottomPiecesCount = document.getElementById('bottomPiecesCount');
  const bottomTimerBox = document.getElementById('bottomTimerBox');

  const historyList = document.getElementById('historyList');

  // Modals
  const onlineModal = document.getElementById('onlineModal');
  const aiModal = document.getElementById('aiModal');
  const shareModal = document.getElementById('shareModal');
  const gameOverModal = document.getElementById('gameOverModal');
  const rulesModal = document.getElementById('rulesModal');
  const themeModal = document.getElementById('themeModal');
  const rankModal = document.getElementById('rankModal');
  const passwordPromptModal = document.getElementById('passwordPromptModal');
  const authModal = document.getElementById('authModal');
  const profileModal = document.getElementById('profileModal');
  const shopModal = document.getElementById('shopModal');

  // User & Shop State
  let currentUser = null;
  let shopCatalog = { avatars: [], frames: [], topupPackages: [] };

  const AVATAR_ICONS = {
    cat_ninja: '🐱',
    cyber_fox: '🦊',
    panda_master: '🐼',
    white_tiger: '🐯',
    thunder_hero: '⚡',
    grand_wizard: '🧙‍♂️',
    mecha_knight: '🤖',
    sakura_moon: '🌸',
    golden_dragon: '🐉',
    celestial_unicorn: '🦄',
    demon_lord: '💀',
    chess_king: '👑'
  };

  function getAvatarIcon(id) {
    return AVATAR_ICONS[id] || '🐱';
  }

  // Init
  function init() {
    setupSocket();
    setupEventListeners();
    setupThemeCustomizer();
    updateHeaderRankUI();
    fetchServerInfo();
    checkUrlForRoom();
    fetchLobbyRooms();
    fetchShopCatalog();
    checkAuthSession();
  }

  // Socket.IO Setup
  function setupSocket() {
    socket = io();

    socket.on('connect', () => {
      console.log('Connected to server with socket id:', socket.id);
      fetchLobbyRooms();
    });

    socket.on('room_list_updated', (roomsList) => {
      renderLobbyRooms(roomsList);
    });

    socket.on('game_started', (data) => {
      window.soundCtrl.playNotify();
      showToast('เพื่อนเข้าร่วมห้องแล้ว! เริ่มการแข่งขัน');
      updateOnlineGameState(data.gameState);
    });

    socket.on('spectator_joined', (data) => {
      showToast(`${data.name} เข้าร่วมเป็นผู้ชม`);
    });

    socket.on('game_updated', (data) => {
      handleMoveResult(data);
    });

    socket.on('timer_tick', (data) => {
      updateTimerDisplay(data.turn, data.timerLeft);
    });

    socket.on('game_over', (data) => {
      handleGameOver(data);
    });

    socket.on('draw_offered', (data) => {
      window.soundCtrl.playNotify();
      const accept = confirm(`ฝ่ายตรงข้าม (${data.byName || 'คู่แข่ง'}) ขอเสมอ ยอมรับหรือไม่?`);
      socket.emit('respond_draw', { roomId: currentRoomId, accept });
    });

    socket.on('draw_declined', (data) => {
      showToast(data.message);
    });

    socket.on('rematch_voted', (data) => {
      document.getElementById('rematchCount').textContent = data.count;
      showToast(`${data.voterName} ขอเล่นอีกรอบ (${data.count}/${data.needed})`);
    });

    socket.on('rematch_started', (data) => {
      window.soundCtrl.playNotify();
      closeModal(gameOverModal);
      if (autoRandomize) {
        randomizeEverything(false);
      }
      showToast('เริ่มเกมใหม่แล้ว!');
      // Swap role if sides swapped
      if (myRole === 'red') myRole = 'blue';
      else if (myRole === 'blue') myRole = 'red';
      isBoardFlipped = (myRole === 'blue');
      updateOnlineGameState(data.gameState);
    });

    socket.on('chat_received', (data) => {
      if (data.emoji) {
        spawnFloatingEmoji(data.emoji);
      }
      if (data.message) {
        showToast(`💬 ${data.sender}: ${data.message}`);
      }
    });

    socket.on('player_disconnected', (data) => {
      showToast(`⚠️ ${data.name} ออกจากห้อง`);
    });

    socket.on('opponent_disconnected', (data) => {
      window.soundCtrl.playNotify();
      showToast(`⚠️ ${data.name} ขาดการเชื่อมต่อ!`);
      const banner = document.getElementById('disconnectBanner');
      const title = document.getElementById('disconnectTitle');
      const countdown = document.getElementById('disconnectCountdown');
      if (banner && countdown) {
        title.textContent = `⚠️ ${data.name} ขาดการเชื่อมต่อ`;
        countdown.textContent = data.secondsLeft || 15;
        banner.style.display = 'flex';
      }
    });

    socket.on('disconnect_countdown_tick', (data) => {
      const countdown = document.getElementById('disconnectCountdown');
      if (countdown) {
        countdown.textContent = data.secondsLeft;
      }
    });

    socket.on('opponent_reconnected', (data) => {
      window.soundCtrl.playNotify();
      showToast(`🎉 ${data.name} เชื่อมต่อกลับเข้ามาแล้ว!`);
      const banner = document.getElementById('disconnectBanner');
      if (banner) {
        banner.style.display = 'none';
      }
    });
  }

  // Fetch Server LAN IP info
  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      if (data && data.suggestedUrl) {
        serverLanUrl = data.suggestedUrl;
      }
    } catch (e) {
      serverLanUrl = window.location.origin;
    }
  }

  // Check URL query parameters for ?room=ABC123
  function checkUrlForRoom() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      document.getElementById('inputRoomCode').value = roomParam.toUpperCase();
      openOnlineModal('join');
    }
  }

  // ==========================================
  // AUTHENTICATION, AVATAR & SHOP SYSTEM
  // ==========================================
  async function fetchShopCatalog() {
    try {
      const res = await fetch('/api/shop/catalog');
      const data = await res.json();
      if (data) {
        shopCatalog = data;
      }
    } catch (e) {
      console.error('Error fetching shop catalog:', e);
    }
  }

  async function checkAuthSession() {
    const token = localStorage.getItem('thai_checkers_token');
    if (!token) {
      updateUserHeaderUI(null);
      return;
    }
    try {
      const res = await fetch(`/api/auth/me?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data && data.success && data.user) {
        currentUser = data.user;
        playerStats.name = currentUser.displayName || currentUser.username;
        if (currentUser.stats?.mmr) {
          playerStats.mmr = currentUser.stats.mmr;
        }
        updateUserHeaderUI(currentUser);
        updateHeaderRankUI();
      } else {
        localStorage.removeItem('thai_checkers_token');
        currentUser = null;
        updateUserHeaderUI(null);
      }
    } catch (e) {
      console.error('Error checking auth session:', e);
    }
  }

  function updateUserHeaderUI(user) {
    const guestBox = document.getElementById('userGuestBox');
    const loggedInBox = document.getElementById('userLoggedInBox');
    if (!user) {
      if (guestBox) guestBox.style.display = 'block';
      if (loggedInBox) loggedInBox.style.display = 'none';
      return;
    }

    if (guestBox) guestBox.style.display = 'none';
    if (loggedInBox) loggedInBox.style.display = 'block';

    const avatarIcon = document.getElementById('headerAvatarIcon');
    const avatarFrame = document.getElementById('headerAvatarFrame');
    const userName = document.getElementById('headerUserName');
    const userLevel = document.getElementById('headerUserLevel');
    const userCoins = document.getElementById('headerUserCoins');
    const userGems = document.getElementById('headerUserGems');

    if (avatarIcon) avatarIcon.textContent = getAvatarIcon(user.avatar);
    if (avatarFrame) avatarFrame.className = `header-avatar-frame ${user.frame || 'frame_wood'}`;
    if (userName) userName.textContent = user.displayName || user.username;
    if (userLevel) userLevel.textContent = `Lv.${user.level || 1}`;
    if (userCoins) userCoins.textContent = (user.coins || 0).toLocaleString();
    if (userGems) userGems.textContent = (user.gems || 0).toLocaleString();

    // Update player input defaults
    const createNameInput = document.getElementById('createPlayerName');
    const joinNameInput = document.getElementById('joinPlayerName');
    if (createNameInput && !createNameInput.value) createNameInput.value = user.displayName;
    if (joinNameInput && !joinNameInput.value) joinNameInput.value = user.displayName;
  }

  function openAuthModal(defaultTab = 'login') {
    const tabLogin = document.getElementById('tabAuthLogin');
    const tabReg = document.getElementById('tabAuthRegister');
    const paneLogin = document.getElementById('paneAuthLogin');
    const paneReg = document.getElementById('paneAuthRegister');

    if (defaultTab === 'register') {
      tabReg?.classList.add('active');
      tabLogin?.classList.remove('active');
      if (paneReg) paneReg.style.display = 'block';
      if (paneLogin) paneLogin.style.display = 'none';
    } else {
      tabLogin?.classList.add('active');
      tabReg?.classList.remove('active');
      if (paneLogin) paneLogin.style.display = 'block';
      if (paneReg) paneReg.style.display = 'none';
    }
    openModal(authModal);
  }

  async function handleAuthLogin() {
    const username = (document.getElementById('loginUsername')?.value || '').trim();
    const password = (document.getElementById('loginPassword')?.value || '').trim();
    const errBox = document.getElementById('loginErrorMsg');

    if (!username || !password) {
      if (errBox) {
        errBox.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        errBox.style.display = 'block';
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem('thai_checkers_token', data.token);
        currentUser = data.user;
        playerStats.name = currentUser.displayName;
        if (currentUser.stats?.mmr) playerStats.mmr = currentUser.stats.mmr;
        updateUserHeaderUI(currentUser);
        updateHeaderRankUI();
        closeModal(authModal);
        showToast(`ยินดีต้อนรับกลับคุณ ${currentUser.displayName}!`);
      } else {
        if (errBox) {
          errBox.textContent = data.error || 'เข้าสู่ระบบไม่สำเร็จ';
          errBox.style.display = 'block';
        }
      }
    } catch (e) {
      if (errBox) {
        errBox.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        errBox.style.display = 'block';
      }
    }
  }

  async function handleAuthRegister() {
    const username = (document.getElementById('regUsername')?.value || '').trim();
    const displayName = (document.getElementById('regDisplayName')?.value || '').trim();
    const password = (document.getElementById('regPassword')?.value || '').trim();
    const errBox = document.getElementById('regErrorMsg');

    if (!username || !password) {
      if (errBox) {
        errBox.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        errBox.style.display = 'block';
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName })
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem('thai_checkers_token', data.token);
        currentUser = data.user;
        playerStats.name = currentUser.displayName;
        updateUserHeaderUI(currentUser);
        updateHeaderRankUI();
        closeModal(authModal);
        showToast(`สมัครสมาชิกสำเร็จ! ได้รับ 🪙 1,000 เหรียญ และ 💎 50 เพชร!`);
      } else {
        if (errBox) {
          errBox.textContent = data.error || 'สมัครสมาชิกไม่สำเร็จ';
          errBox.style.display = 'block';
        }
      }
    } catch (e) {
      if (errBox) {
        errBox.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        errBox.style.display = 'block';
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem('thai_checkers_token');
    currentUser = null;
    updateUserHeaderUI(null);
    closeModal(profileModal);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  }

  function openProfileModal() {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    renderProfileView();
    openModal(profileModal);
  }

  function renderProfileView() {
    if (!currentUser) return;

    document.getElementById('profileBigIcon').textContent = getAvatarIcon(currentUser.avatar);
    document.getElementById('profileBigFrame').className = `profile-frame ${currentUser.frame || 'frame_wood'}`;
    document.getElementById('profileDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('profileLevelBadge').textContent = `Lv.${currentUser.level || 1}`;
    document.getElementById('profileCoins').textContent = (currentUser.coins || 0).toLocaleString();
    document.getElementById('profileGems').textContent = (currentUser.gems || 0).toLocaleString();

    const rank = getPlayerRank();
    document.getElementById('profileRankBadge').textContent = `${rank.badge} ${currentUser.stats?.mmr || rank.mmr} RP`;

    // EXP Bar
    const expNeeded = (currentUser.level || 1) * 200;
    const currentExp = currentUser.exp || 0;
    const expPercent = Math.min(100, Math.round((currentExp / expNeeded) * 100));
    document.getElementById('profileExpText').textContent = `${currentExp} / ${expNeeded}`;
    document.getElementById('profileExpBar').style.width = `${expPercent}%`;

    const nameInput = document.getElementById('inputEditDisplayName');
    if (nameInput) nameInput.value = currentUser.displayName || '';

    // Render owned avatars
    const avatarsGrid = document.getElementById('myAvatarsGrid');
    if (avatarsGrid) {
      const owned = currentUser.inventory?.avatars || ['cat_ninja'];
      avatarsGrid.innerHTML = (shopCatalog.avatars || []).map(a => {
        const isOwned = owned.includes(a.id);
        if (!isOwned) return '';
        const isEquipped = (currentUser.avatar === a.id);
        return `
          <div class="item-card ${isEquipped ? 'is-equipped' : ''}" onclick="equipItem('${a.id}', 'avatar')">
            <div class="item-card-preview">
              <span>${a.icon}</span>
            </div>
            <div class="item-card-name">${a.name}</div>
            <span class="item-rarity-pill rarity-${a.rarity}">${a.rarity}</span>
            <button class="item-action-btn ${isEquipped ? 'equipped' : 'equip'}">
              ${isEquipped ? '✓ กำลังใช้งาน' : 'สวมใส่'}
            </button>
          </div>
        `;
      }).join('');
    }

    // Render owned frames
    const framesGrid = document.getElementById('myFramesGrid');
    if (framesGrid) {
      const owned = currentUser.inventory?.frames || ['frame_wood'];
      framesGrid.innerHTML = (shopCatalog.frames || []).map(f => {
        const isOwned = owned.includes(f.id);
        if (!isOwned) return '';
        const isEquipped = (currentUser.frame === f.id);
        return `
          <div class="item-card ${isEquipped ? 'is-equipped' : ''}" onclick="equipItem('${f.id}', 'frame')">
            <div class="item-card-preview ${f.id}">
              <span>${getAvatarIcon(currentUser.avatar)}</span>
            </div>
            <div class="item-card-name">${f.name}</div>
            <span class="item-rarity-pill rarity-${f.rarity}">${f.rarity}</span>
            <button class="item-action-btn ${isEquipped ? 'equipped' : 'equip'}">
              ${isEquipped ? '✓ กำลังใช้งาน' : 'สวมใส่'}
            </button>
          </div>
        `;
      }).join('');
    }
  }

  window.equipItem = async function(itemId, itemType) {
    if (!currentUser) return;
    const token = localStorage.getItem('thai_checkers_token');
    const payload = (itemType === 'avatar') ? { avatar: itemId } : { frame: itemId };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success) {
        currentUser = data.user;
        updateUserHeaderUI(currentUser);
        renderProfileView();
        showToast('สวมใส่สำเร็จ!');
      }
    } catch (e) {
      console.error('Error equipping item:', e);
    }
  };

  async function saveNewDisplayName() {
    const input = document.getElementById('inputEditDisplayName');
    const newName = (input?.value || '').trim();
    if (!newName) {
      showToast('กรุณากรอกชื่อแสดง');
      return;
    }
    const token = localStorage.getItem('thai_checkers_token');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: newName })
      });
      const data = await res.json();
      if (data && data.success) {
        currentUser = data.user;
        playerStats.name = currentUser.displayName;
        updateUserHeaderUI(currentUser);
        renderProfileView();
        showToast(`เปลี่ยนชื่อเป็น "${newName}" สำเร็จ!`);
      }
    } catch (e) {
      console.error('Error saving name:', e);
    }
  }

  function openShopModal() {
    renderShopView();
    openModal(shopModal);
  }

  function renderShopView() {
    const coinsEl = document.getElementById('shopCoinsVal');
    const gemsEl = document.getElementById('shopGemsVal');
    if (coinsEl) coinsEl.textContent = (currentUser?.coins || 0).toLocaleString();
    if (gemsEl) gemsEl.textContent = (currentUser?.gems || 0).toLocaleString();

    // Avatars Catalog
    const avatarsGrid = document.getElementById('shopAvatarsGrid');
    if (avatarsGrid) {
      const owned = currentUser?.inventory?.avatars || [];
      avatarsGrid.innerHTML = (shopCatalog.avatars || []).map(a => {
        const isOwned = owned.includes(a.id);
        const isEquipped = (currentUser?.avatar === a.id);
        let btnHtml = '';
        if (isEquipped) {
          btnHtml = `<button class="item-action-btn equipped">✓ ใช้งานอยู่</button>`;
        } else if (isOwned) {
          btnHtml = `<button class="item-action-btn equip" onclick="equipItem('${a.id}', 'avatar')">สวมใส่</button>`;
        } else if (a.priceGems > 0) {
          btnHtml = `<button class="item-action-btn buy-gems" onclick="buyShopItem('${a.id}', 'avatar', 'gems')">💎 ${a.priceGems} เพชร</button>`;
        } else {
          btnHtml = `<button class="item-action-btn buy-coins" onclick="buyShopItem('${a.id}', 'avatar', 'coins')">🪙 ${a.priceCoins.toLocaleString()} เหรียญ</button>`;
        }

        return `
          <div class="item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="item-card-preview">
              <span>${a.icon}</span>
            </div>
            <div class="item-card-name">${a.name}</div>
            <span class="item-rarity-pill rarity-${a.rarity}">${a.rarity}</span>
            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.2;">${a.desc}</div>
            ${btnHtml}
          </div>
        `;
      }).join('');
    }

    // Frames Catalog
    const framesGrid = document.getElementById('shopFramesGrid');
    if (framesGrid) {
      const owned = currentUser?.inventory?.frames || [];
      framesGrid.innerHTML = (shopCatalog.frames || []).map(f => {
        const isOwned = owned.includes(f.id);
        const isEquipped = (currentUser?.frame === f.id);
        let btnHtml = '';
        if (isEquipped) {
          btnHtml = `<button class="item-action-btn equipped">✓ ใช้งานอยู่</button>`;
        } else if (isOwned) {
          btnHtml = `<button class="item-action-btn equip" onclick="equipItem('${f.id}', 'frame')">สวมใส่</button>`;
        } else if (f.priceGems > 0) {
          btnHtml = `<button class="item-action-btn buy-gems" onclick="buyShopItem('${f.id}', 'frame', 'gems')">💎 ${f.priceGems} เพชร</button>`;
        } else {
          btnHtml = `<button class="item-action-btn buy-coins" onclick="buyShopItem('${f.id}', 'frame', 'coins')">🪙 ${f.priceCoins.toLocaleString()} เหรียญ</button>`;
        }

        return `
          <div class="item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="item-card-preview ${f.id}">
              <span>${getAvatarIcon(currentUser?.avatar || 'cat_ninja')}</span>
            </div>
            <div class="item-card-name">${f.name}</div>
            <span class="item-rarity-pill rarity-${f.rarity}">${f.rarity}</span>
            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.2;">${f.desc}</div>
            ${btnHtml}
          </div>
        `;
      }).join('');
    }

    // Top-up Packages (Official System Request - Self top-up disabled)
    const topupGrid = document.getElementById('shopTopupGrid');
    if (topupGrid) {
      topupGrid.innerHTML = (shopCatalog.topupPackages || []).map(p => {
        return `
          <div class="topup-card">
            ${p.tag ? `<div class="topup-tag">${p.tag}</div>` : ''}
            <div style="font-size: 36px; margin-top: 4px;">💎</div>
            <div class="topup-gems-num">${p.gems} Gems</div>
            <div class="topup-bonus">+ แถมฟรี 🪙 ${p.bonusCoins.toLocaleString()} เหรียญ</div>
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 10px;">${p.name} (${p.priceBaht} บาท)</div>
            <button class="topup-btn" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);" onclick="requestOfficialTopup('${p.id}', '${p.name}', ${p.priceBaht}, ${p.gems}, ${p.bonusCoins})">
              <span>💬</span> แจ้งเติมเงินผ่านระบบ
            </button>
          </div>
        `;
      }).join('');
    }
  }

  window.buyShopItem = async function(itemId, itemType, currency) {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const token = localStorage.getItem('thai_checkers_token');
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, itemType, currency })
      });
      const data = await res.json();
      if (data && data.success) {
        currentUser = data.user;
        updateUserHeaderUI(currentUser);
        renderShopView();
        showToast(data.message || 'ซื้อสินค้าสำเร็จ!');
      } else {
        showToast(data.error || 'ซื้อสินค้าไม่สำเร็จ');
      }
    } catch (e) {
      console.error('Error buying item:', e);
    }
  };

  // Official topup notification - users CANNOT add money by themselves
  window.requestOfficialTopup = function(packageId, packName, priceBaht, gems, bonusCoins) {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const copyText = `แจ้งเติมเงิน Board Arena: ${packName} (${priceBaht} บาท) บัญชีผู้เล่น: ${currentUser.username}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).catch(() => {});
    }
    alert(
      `📋 ระบบเติมเงินผ่านผู้ดูแลระบบ (Admin Only)\n\n` +
      `แพ็กเกจ: ${packName} (${priceBaht} บาท)\n` +
      `จะได้รับ: 💎 ${gems} เพชร + 🪙 ${bonusCoins.toLocaleString()} เหรียญ\n` +
      `บัญชีของคุณ: ${currentUser.username} (${currentUser.displayName})\n\n` +
      `ระบบได้คัดลอกข้อมูลให้เรียบร้อยแล้ว กรุณาส่งสลิปหรือแจ้ง Username นี้ให้แอดมิน เพื่อให้ระบบเติมเงินเข้าบัญชีครับ!`
    );
    showToast(`คัดลอกข้อมูลเติมเงินสำหรับ ${currentUser.username} แล้ว!`);
  };

  // Setup Event Listeners
  function setupEventListeners() {
    // Header Buttons
    document.getElementById('btnOpenAuth')?.addEventListener('click', () => {
      openAuthModal('login');
    });

    document.getElementById('btnOpenProfile')?.addEventListener('click', () => {
      openProfileModal();
    });

    document.getElementById('shopBtn')?.addEventListener('click', () => {
      openShopModal();
    });

    // Auth Tabs
    const tabAuthLogin = document.getElementById('tabAuthLogin');
    const tabAuthRegister = document.getElementById('tabAuthRegister');
    const paneAuthLogin = document.getElementById('paneAuthLogin');
    const paneAuthRegister = document.getElementById('paneAuthRegister');

    tabAuthLogin?.addEventListener('click', () => {
      tabAuthLogin.classList.add('active');
      tabAuthRegister.classList.remove('active');
      if (paneAuthLogin) paneAuthLogin.style.display = 'block';
      if (paneAuthRegister) paneAuthRegister.style.display = 'none';
    });

    tabAuthRegister?.addEventListener('click', () => {
      tabAuthRegister.classList.add('active');
      tabAuthLogin.classList.remove('active');
      if (paneAuthRegister) paneAuthRegister.style.display = 'block';
      if (paneAuthLogin) paneAuthLogin.style.display = 'none';
    });

    document.getElementById('btnSubmitLogin')?.addEventListener('click', handleAuthLogin);
    document.getElementById('btnSubmitRegister')?.addEventListener('click', handleAuthRegister);

    // Profile Tabs
    const tabMyAvatars = document.getElementById('tabMyAvatars');
    const tabMyFrames = document.getElementById('tabMyFrames');
    const paneMyAvatars = document.getElementById('paneMyAvatars');
    const paneMyFrames = document.getElementById('paneMyFrames');

    tabMyAvatars?.addEventListener('click', () => {
      tabMyAvatars.classList.add('active');
      tabMyFrames.classList.remove('active');
      if (paneMyAvatars) paneMyAvatars.style.display = 'block';
      if (paneMyFrames) paneMyFrames.style.display = 'none';
    });

    tabMyFrames?.addEventListener('click', () => {
      tabMyFrames.classList.add('active');
      tabMyAvatars.classList.remove('active');
      if (paneMyFrames) paneMyFrames.style.display = 'block';
      if (paneMyAvatars) paneMyAvatars.style.display = 'none';
    });

    document.getElementById('btnSaveDisplayName')?.addEventListener('click', saveNewDisplayName);
    document.getElementById('btnGoShopFromProfile')?.addEventListener('click', () => {
      closeModal(profileModal);
      openShopModal();
    });
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);

    // Shop Tabs
    const tabShopAvatars = document.getElementById('tabShopAvatars');
    const tabShopFrames = document.getElementById('tabShopFrames');
    const tabShopTopup = document.getElementById('tabShopTopup');
    const paneShopAvatars = document.getElementById('paneShopAvatars');
    const paneShopFrames = document.getElementById('paneShopFrames');
    const paneShopTopup = document.getElementById('paneShopTopup');

    tabShopAvatars?.addEventListener('click', () => {
      tabShopAvatars.classList.add('active');
      tabShopFrames.classList.remove('active');
      tabShopTopup.classList.remove('active');
      if (paneShopAvatars) paneShopAvatars.style.display = 'block';
      if (paneShopFrames) paneShopFrames.style.display = 'none';
      if (paneShopTopup) paneShopTopup.style.display = 'none';
    });

    tabShopFrames?.addEventListener('click', () => {
      tabShopFrames.classList.add('active');
      tabShopAvatars.classList.remove('active');
      tabShopTopup.classList.remove('active');
      if (paneShopFrames) paneShopFrames.style.display = 'block';
      if (paneShopAvatars) paneShopAvatars.style.display = 'none';
      if (paneShopTopup) paneShopTopup.style.display = 'none';
    });

    tabShopTopup?.addEventListener('click', () => {
      tabShopTopup.classList.add('active');
      tabShopAvatars.classList.remove('active');
      tabShopFrames.classList.remove('active');
      if (paneShopTopup) paneShopTopup.style.display = 'block';
      if (paneShopAvatars) paneShopAvatars.style.display = 'none';
      if (paneShopFrames) paneShopFrames.style.display = 'none';
    });

    // Header
    const rankBtn = document.getElementById('rankBtn');
    if (rankBtn) {
      rankBtn.addEventListener('click', () => {
        renderRankModal();
        openModal(rankModal);
        fetchLeaderboard();
      });
    }

    // Rank Modal Tabs
    document.querySelectorAll('.rank-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rank-tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.rank-tab-pane').forEach(p => p.style.display = 'none');

        tab.classList.add('active');
        const targetTab = tab.dataset.tab;
        if (targetTab === 'my-stats') {
          document.getElementById('paneMyStats').style.display = 'block';
        } else if (targetTab === 'match-history') {
          document.getElementById('paneMatchHistory').style.display = 'block';
          renderMatchHistory();
        } else if (targetTab === 'leaderboard') {
          document.getElementById('paneLeaderboard').style.display = 'block';
          fetchLeaderboard();
        }
      });
    });

    // Save profile name
    const btnSaveName = document.getElementById('btnSaveProfileName');
    if (btnSaveName) {
      btnSaveName.addEventListener('click', () => {
        const inputName = document.getElementById('inputProfileName');
        const newName = (inputName?.value || '').trim();
        if (newName) {
          playerStats.name = newName;
          savePlayerStats(playerStats);
          updateHeaderRankUI();
          syncRankToServer();
          showToast(`บันทึกชื่อ "${newName}" เรียบร้อย!`);
          fetchLeaderboard();
        }
      });
    }

    const btnRefreshLb = document.getElementById('btnRefreshLeaderboard');
    if (btnRefreshLb) {
      btnRefreshLb.addEventListener('click', () => {
        fetchLeaderboard();
        showToast('อัปเดตตารางอันดับแล้ว');
      });
    }

    document.getElementById('logoBtn').addEventListener('click', () => {
      if (gameMode !== 'lobby') {
        if (confirm('ต้องการกลับสู่หน้าหลักหรือไม่?')) {
          if (gameMode === 'online' && socket && currentRoomId) {
            socket.emit('leave_room', { roomId: currentRoomId });
          }
          returnToLobby();
        }
      }
    });

    document.getElementById('themeBtn').addEventListener('click', () => {
      openModal(themeModal);
    });

    document.getElementById('quickRandomBtn').addEventListener('click', () => {
      randomizeEverything(true);
    });

    document.getElementById('soundBtn').addEventListener('click', () => {
      const muted = window.soundCtrl.toggleMute();
      document.getElementById('soundIcon').textContent = muted ? '🔇' : '🔊';
      showToast(muted ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว');
    });

    document.getElementById('rulesBtn').addEventListener('click', () => {
      const modalTitle = rulesModal.querySelector('.modal-title');
      const modalBody = rulesModal.querySelector('.modal-content > div:last-child');
      if (currentGameType === 'dokapon') {
        if (modalTitle) modalTitle.innerHTML = '🏰 กติกาโดกาปอง: สงครามมิตรภาพ (Dokapon Kingdom)';
        if (modalBody) {
          modalBody.innerHTML = `
            <p><strong>1. การผจญภัย & เคลื่อนที่:</strong> ทอยลูกเต๋า 1-6 และเดินตามเข็มนาฬิการอบอาณาจักร</p>
            <p><strong>2. ปราสาทหลวง (Castle):</strong> ฟื้นฟูเลือด HP เต็ม 100% ทันที พร้อมรับเบี้ยเลี้ยงสนับสนุนจากพระราชา</p>
            <p><strong>3. เมืองและหมู่บ้าน (Towns):</strong> สู้กับมอนสเตอร์เพื่อปลดปล่อยเมือง เมื่อครอบครองจะได้รับภาษีปันผลทุกรอบ หากคู่แข่งเดินมาเหยียบต้องจ่ายค่าผ่านทาง!</p>
            <p><strong>4. ระบบการต่อสู้สุดคลาสสิก (Combat System):</strong>
              <br>• <strong>ฝ่ายรุก:</strong> โจมตีปกติ (ชนะเคาน์เตอร์), ท่าไม้ตาย (ดาเมจ x2.5 แต่แพ้เคาน์เตอร์), เวทมนตร์ (ทะลุโล่), ใช้ยา HP
              <br>• <strong>ฝ่ายรับ:</strong> ป้องกัน (ลดดาเมจ 60%), เคาน์เตอร์ (สะท้อนท่าไม้ตาย 200%), กันเวทย์ (สะท้อนเวท), ยอมจำนน
            </p>
            <p><strong>5. ศึกดวลลูกผู้ชาย (PvP Duel):</strong> เมื่อหยุดที่ช่องเดียวกับศัตรู จะเกิดการต่อสู้ชิงความเป็นหนึ่ง! ผู้ชนะสามารถลงโทษผู้แพ้ได้: ขโมยเงินทั้งหมด, ยึดเมือง, หรือล้อเลียน!</p>
            <p><strong>6. แคมเปญ 20 รอบ & เงื่อนไขชัยชนะ:</strong> สะสมทรัพย์สินรวม (เงินสด + มูลค่าเมือง) ครบ 10,000G หรือยึดครองเมืองได้ครบทั้ง 5 เมือง หรือเมื่อครบ 20 รอบ ผู้เล่นที่มีทรัพย์สินรวมสูงสุดจะชนะเกมและครองราชย์แห่งโดกาปอง! 👑</p>
          `;
        }
      } else {
        if (modalTitle) modalTitle.innerHTML = '📖 กติกาการเล่น';
      }
      openModal(rulesModal);
    });

    roomPill.addEventListener('click', () => {
      openShareModal();
    });

    // Game Hub Selector Menu & Bar
    function setGameHubType(game) {
      if (gameMode !== 'lobby') {
        if (!confirm('ต้องการออกจากเกมปัจจุบันเพื่อเปลี่ยนเกมหรือไม่?')) {
          return;
        }
        if (gameMode === 'online' && socket && currentRoomId) {
          socket.emit('leave_room', { roomId: currentRoomId });
        }
        returnToLobby();
      }

      if (!game || !GAME_INFO[game]) game = 'checkers';
      currentGameType = game;
      const info = GAME_INFO[game] || GAME_INFO.checkers;
      const titleEl = document.getElementById('hubHeroTitle');
      const subEl = document.getElementById('hubHeroSubtitle');
      const iconEl = document.getElementById('hubHeroIcon');
      const tagEl = document.getElementById('hubHeroTag');
      const menuIconEl = document.getElementById('menuCurrentIcon');
      const menuTitleEl = document.getElementById('menuCurrentTitle');
      const tipEl = document.getElementById('hubHeroTip') || document.querySelector('.lobby-hero + .mode-grid + div');

      if (titleEl) titleEl.textContent = info.title;
      if (subEl) subEl.innerHTML = info.subtitle;
      if (iconEl) iconEl.textContent = info.emblemIcon;
      if (tagEl) tagEl.textContent = info.tag;
      if (menuIconEl) menuIconEl.textContent = info.emblemIcon;
      if (menuTitleEl) menuTitleEl.textContent = info.name;
      if (tipEl) tipEl.textContent = info.tip;

      // Sync Quick Pills
      document.querySelectorAll('.quick-game-pill').forEach(p => {
        if (p.dataset.game === game) {
          p.classList.add('active');
          try { p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (e) {}
        } else {
          p.classList.remove('active');
        }
      });

      // Sync Game Menu Cards
      document.querySelectorAll('.game-card-item').forEach(c => {
        if (c.dataset.game === game) c.classList.add('active');
        else c.classList.remove('active');
      });

      // Sync Create Room modal gameType pill
      const gamePills = document.querySelectorAll('#createGameTypeSelect .pill-option');
      gamePills.forEach(p => {
        if (p.dataset.game === game) p.classList.add('active');
        else p.classList.remove('active');
      });

      // Hide/show checkers rule select
      const ruleGroup = document.getElementById('ruleSelectGroup');
      if (ruleGroup) {
        ruleGroup.style.display = game === 'checkers' ? 'block' : 'none';
      }

      try {
        if (window.soundCtrl && window.soundCtrl.playClick) window.soundCtrl.playClick();
      } catch (e) {}

      fetchLobbyRooms();
    }

    // ========================================================
    // CATEGORIZED & EXTENSIBLE GAME MENU SYSTEM
    // ========================================================
    let activeMenuCategory = 'all';
    let menuSearchQuery = '';

    // Render Full Categorized Game Menu Modal
    function renderGameMenuModal() {
      const body = document.getElementById('gameMenuGrid');
      const tabsContainer = document.getElementById('gameCategoryTabs');
      const searchInput = document.getElementById('gameMenuSearchInput');
      const clearBtn = document.getElementById('btnClearGameSearch');
      if (!body) return;

      // 1. Render Category Filter Tabs
      if (tabsContainer) {
        tabsContainer.innerHTML = GAME_CATEGORIES.map(cat => {
          let count = 0;
          if (cat.id === 'all') {
            count = Object.keys(GAME_INFO).length;
          } else {
            count = Object.values(GAME_INFO).filter(g => g.category === cat.id).length;
          }
          const isActive = cat.id === activeMenuCategory;
          return `
            <button type="button" class="game-cat-pill ${isActive ? 'active' : ''}" data-cat="${cat.id}">
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
              <span class="game-cat-count">${count}</span>
            </button>
          `;
        }).join('');

        tabsContainer.querySelectorAll('.game-cat-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            activeMenuCategory = btn.dataset.cat;
            renderGameMenuModal();
          });
        });
      }

      // 2. Setup Search Controls
      if (searchInput && !searchInput.dataset.initialized) {
        searchInput.dataset.initialized = 'true';
        searchInput.addEventListener('input', (e) => {
          menuSearchQuery = e.target.value.trim().toLowerCase();
          if (clearBtn) clearBtn.style.display = menuSearchQuery ? 'block' : 'none';
          renderGameMenuModal();
        });
      }
      if (clearBtn && !clearBtn.dataset.initialized) {
        clearBtn.dataset.initialized = 'true';
        clearBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          menuSearchQuery = '';
          clearBtn.style.display = 'none';
          renderGameMenuModal();
        });
      }

      // Helper to render a single game card
      function renderGameCard(key, info) {
        const isCurrent = key === currentGameType;
        const card = document.createElement('div');
        card.className = `game-card-item ${isCurrent ? 'active' : ''}`;
        card.dataset.game = key;
        card.innerHTML = `
          <div class="game-card-icon-box">${info.emblemIcon}</div>
          <div class="game-card-meta">
            <div class="game-card-title-row">
              <div class="game-card-title">${info.name}</div>
              <span class="game-card-badge">${info.tag}</span>
            </div>
            <div class="game-card-sub">${info.subDesc}</div>
            <div class="game-card-bottom-row">
              <span class="game-card-players">👥 ${info.players || '2 ผู้เล่น'}</span>
              <span class="game-card-status-badge">
                ${isCurrent ? '✓ กำลังเล่น' : 'เลือกเล่น ▶'}
              </span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          setGameHubType(key);
          const modal = document.getElementById('gameMenuModal');
          if (modal) closeModal(modal);
        });
        return card;
      }

      body.innerHTML = '';

      // 3. Filter by search query if active
      if (menuSearchQuery) {
        const matches = Object.entries(GAME_INFO).filter(([key, info]) => {
          const text = `${info.name} ${info.title} ${info.subDesc} ${info.tag} ${info.category}`.toLowerCase();
          return text.includes(menuSearchQuery);
        });

        if (matches.length === 0) {
          body.innerHTML = `
            <div class="game-search-empty">
              <div style="font-size: 36px; margin-bottom: 8px;">🔍</div>
              <div style="font-weight: 700; font-size: 15px; color: #f8fafc;">ไม่พบเกมที่ค้นหา "${menuSearchQuery}"</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">ลองค้นหาด้วยคำอื่น หรือกดดูหมวดหมู่ทั้งหมด</div>
            </div>
          `;
          return;
        }

        const grid = document.createElement('div');
        grid.className = 'game-cards-grid';
        matches.forEach(([key, info]) => {
          grid.appendChild(renderGameCard(key, info));
        });
        body.appendChild(grid);
        return;
      }

      // 4. Render Grouped by Category (when 'all' is selected)
      if (activeMenuCategory === 'all') {
        const activeCategories = GAME_CATEGORIES.filter(c => c.id !== 'all');
        activeCategories.forEach(cat => {
          const gamesInCat = Object.entries(GAME_INFO).filter(([_, info]) => info.category === cat.id);
          if (gamesInCat.length === 0) return;

          const section = document.createElement('div');
          section.className = 'game-category-section';

          const header = document.createElement('div');
          header.className = 'game-category-header';
          header.innerHTML = `
            <div class="game-category-title-wrap">
              <span class="game-category-title-icon">${cat.icon}</span>
              <h3 class="game-category-title">${cat.name}</h3>
              <span class="game-cat-count">${gamesInCat.length}</span>
              <span class="game-category-desc">• ${cat.desc}</span>
            </div>
          `;
          section.appendChild(header);

          const grid = document.createElement('div');
          grid.className = 'game-cards-grid';
          gamesInCat.forEach(([key, info]) => {
            grid.appendChild(renderGameCard(key, info));
          });
          section.appendChild(grid);
          body.appendChild(section);
        });

        // Add "Coming Soon" card at the bottom
        const comingSoon = document.createElement('div');
        comingSoon.className = 'game-coming-soon-card';
        comingSoon.innerHTML = `
          <div class="coming-icon">✨</div>
          <div>
            <h4>เตรียมพบกับเกมกระดานใหม่ๆ เร็วๆ นี้!</h4>
            <p>ระบบพร้อมรองรับการเพิ่มเกมใหม่ได้ไม่จำกัด (เช่น บิงโก, สแครบเบิล, หมากฮอสสากล, เกมเศรษฐี ฯลฯ) เสนอแนะเกมที่อยากเล่นกับผู้พัฒนาได้เลย!</p>
          </div>
        `;
        body.appendChild(comingSoon);
      } else {
        // Specific category selected
        const cat = GAME_CATEGORIES.find(c => c.id === activeMenuCategory);
        const gamesInCat = Object.entries(GAME_INFO).filter(([_, info]) => info.category === activeMenuCategory);

        const section = document.createElement('div');
        section.className = 'game-category-section';

        const header = document.createElement('div');
        header.className = 'game-category-header';
        header.innerHTML = `
          <div class="game-category-title-wrap">
            <span class="game-category-title-icon">${cat.icon}</span>
            <h3 class="game-category-title">${cat.name}</h3>
            <span class="game-cat-count">${gamesInCat.length}</span>
            <span class="game-category-desc">• ${cat.desc}</span>
          </div>
        `;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'game-cards-grid';
        gamesInCat.forEach(([key, info]) => {
          grid.appendChild(renderGameCard(key, info));
        });
        section.appendChild(grid);
        body.appendChild(section);
      }
    }

    window.setGameHubType = setGameHubType;
    window.renderGameMenuModal = renderGameMenuModal;
    window.openGameMenuModal = function() {
      activeMenuCategory = 'all';
      menuSearchQuery = '';
      const searchInput = document.getElementById('gameMenuSearchInput');
      if (searchInput) searchInput.value = '';
      const clearBtn = document.getElementById('btnClearGameSearch');
      if (clearBtn) clearBtn.style.display = 'none';

      renderGameMenuModal();
      const modal = document.getElementById('gameMenuModal');
      if (modal) openModal(modal);
    };

    // ========================================================
    // NAVBAR FLOATING DROPDOWN SYSTEM (USER SCREENSHOT STYLE)
    // ========================================================
    let dropdownActiveCat = 'all';

    function renderNavbarDropdown(catId) {
      if (catId) dropdownActiveCat = catId;
      const catContainer = document.getElementById('dropdownCatTabs');
      const listContainer = document.getElementById('dropdownGamesList');
      if (!listContainer) return;

      // 1. Render Categories Filter Pills at Top of Dropdown
      if (catContainer) {
        catContainer.innerHTML = GAME_CATEGORIES.map(cat => {
          let count = 0;
          if (cat.id === 'all') count = Object.keys(GAME_INFO).length;
          else count = Object.values(GAME_INFO).filter(g => g.category === cat.id).length;

          const isActive = cat.id === dropdownActiveCat;
          return `
            <button type="button" class="nav-cat-pill ${isActive ? 'active' : ''}" data-cat="${cat.id}">
              <span>${cat.icon}</span> ${cat.name} (${count})
            </button>
          `;
        }).join('');

        catContainer.querySelectorAll('.nav-cat-pill').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderNavbarDropdown(btn.dataset.cat);
          });
        });
      }

      // 2. Render Vertical List of Games (Exact Screenshot Layout)
      let games = Object.entries(GAME_INFO);
      if (dropdownActiveCat !== 'all') {
        games = games.filter(([_, info]) => info.category === dropdownActiveCat);
      }

      listContainer.innerHTML = games.map(([key, info]) => {
        const isActive = key === currentGameType;
        return `
          <div class="dropdown-game-item ${isActive ? 'active' : ''}" data-game="${key}">
            <div class="dropdown-game-icon">${info.emblemIcon}</div>
            <div class="dropdown-game-info">
              <div class="dropdown-game-title-row">
                <span class="dropdown-game-title">${info.name}</span>
                <span class="dropdown-game-badge">${info.tag}</span>
              </div>
              <div class="dropdown-game-sub">${info.subDesc}</div>
            </div>
          </div>
        `;
      }).join('');

      listContainer.querySelectorAll('.dropdown-game-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const game = item.dataset.game;
          setGameHubType(game);
          closeNavDropdown();
        });
      });
    }

    function toggleNavDropdown() {
      const wrapper = document.getElementById('gameNavDropdownWrapper');
      const menu = document.getElementById('gameNavDropdownMenu');
      if (!wrapper || !menu) return;

      const isOpen = wrapper.classList.contains('open');
      if (isOpen) {
        closeNavDropdown();
      } else {
        openNavDropdown();
      }
    }

    function openNavDropdown() {
      const wrapper = document.getElementById('gameNavDropdownWrapper');
      const menu = document.getElementById('gameNavDropdownMenu');
      if (!wrapper || !menu) return;

      renderNavbarDropdown();
      wrapper.classList.add('open');
      menu.style.display = 'flex';
      try {
        if (window.soundCtrl && window.soundCtrl.playClick) window.soundCtrl.playClick();
      } catch (e) {}
    }

    function closeNavDropdown() {
      const wrapper = document.getElementById('gameNavDropdownWrapper');
      const menu = document.getElementById('gameNavDropdownMenu');
      if (wrapper) wrapper.classList.remove('open');
      if (menu) menu.style.display = 'none';
    }

    // Toggle Button Click
    document.getElementById('btnGameDropdownToggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNavDropdown();
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('gameNavDropdownWrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeNavDropdown();
      }
    });

    // Close Dropdown on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNavDropdown();
    });

    window.openNavDropdown = openNavDropdown;
    window.closeNavDropdown = closeNavDropdown;
    window.toggleNavDropdown = toggleNavDropdown;

    // Open Game Menu Button
    document.getElementById('btnOpenGameMenu')?.addEventListener('click', () => {
      toggleNavDropdown();
    });

    // Quick Game Pills
    document.querySelectorAll('.quick-game-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        setGameHubType(pill.dataset.game);
      });
    });

    // Initialize initial game view display
    setGameHubType(currentGameType || 'checkers');

    setupPillSelect('createGameTypeSelect');

    // Pass turn in Go
    document.getElementById('btnPassTurn')?.addEventListener('click', () => {
      if (currentGameType !== 'go') return;
      if (gameMode === 'online') {
        if (myRole !== currentTurn) {
          showToast('ยังไม่ถึงตาของคุณ');
          return;
        }
        socket.emit('make_move', { roomId: currentRoomId, move: { pass: true } });
      } else {
        executeLocalMove({ pass: true });
      }
    });

    // Count score and end Go game
    document.getElementById('btnCountScore')?.addEventListener('click', () => {
      if (currentGameType !== 'go') return;
      if (gameMode === 'online') {
        socket.emit('request_go_score', { roomId: currentRoomId });
      } else {
        const score = window.GoEngine.calculateScore(boardState, goCaptures);
        const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
        handleGameOver({
          isGameOver: true,
          winner: score.winner,
          reason: `นับแต้มตัดสิน: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`,
          goScore: score
        });
      }
    });

    // Lobby Mode Buttons
    document.getElementById('btnModeOnline').addEventListener('click', () => {
      openOnlineModal('create');
    });

    document.getElementById('btnModeAI').addEventListener('click', () => {
      openModal(aiModal);
    });

    document.getElementById('btnModePassPlay').addEventListener('click', () => {
      startPassAndPlayGame();
    });

    // Online Modal Tabs
    const tabCreate = document.getElementById('tabCreateRoom');
    const tabJoin = document.getElementById('tabJoinRoom');
    const paneCreate = document.getElementById('paneCreateRoom');
    const paneJoin = document.getElementById('paneJoinRoom');

    tabCreate.addEventListener('click', () => {
      tabCreate.classList.add('active');
      tabJoin.classList.remove('active');
      paneCreate.style.display = 'block';
      paneJoin.style.display = 'none';
    });

    tabJoin.addEventListener('click', () => {
      tabJoin.classList.add('active');
      tabCreate.classList.remove('active');
      paneJoin.style.display = 'block';
      paneCreate.style.display = 'none';
    });

    // Room Lock checkbox toggle
    const checkLock = document.getElementById('checkLockRoom');
    const roomPasswordBox = document.getElementById('roomPasswordBox');
    if (checkLock && roomPasswordBox) {
      checkLock.addEventListener('change', () => {
        roomPasswordBox.style.display = checkLock.checked ? 'block' : 'none';
        if (checkLock.checked) {
          document.getElementById('createRoomPassword')?.focus();
        }
      });
    }

    // Refresh Lobby Rooms Button
    const btnRefreshRooms = document.getElementById('btnRefreshLobbyRooms');
    if (btnRefreshRooms) {
      btnRefreshRooms.addEventListener('click', () => {
        fetchLobbyRooms();
        showToast('อัปเดตรายชื่อห้องแล้ว');
      });
    }

    // Submit Password in Password Prompt Modal
    let pendingPromptRoomId = null;

    function handlePromptPasswordSubmit() {
      const passInput = document.getElementById('inputPromptPassword');
      const errorMsg = document.getElementById('promptErrorMsg');
      const pass = (passInput?.value || '').trim();

      if (!pass) {
        if (errorMsg) {
          errorMsg.textContent = '⚠️ กรุณากรอกรหัสผ่านห้อง';
          errorMsg.style.display = 'block';
        }
        showToast('กรุณากรอกรหัสผ่านห้อง');
        passInput?.focus();
        return;
      }

      if (errorMsg) errorMsg.style.display = 'none';

      const playerName = currentUser?.displayName || playerStats.name || 'ผู้เล่น';
      socket.emit('join_room', { 
        roomId: pendingPromptRoomId, 
        playerName, 
        playerMmr: currentUser?.stats?.mmr || playerStats.mmr, 
        password: pass,
        avatar: currentUser?.avatar || 'cyber_fox',
        frame: currentUser?.frame || 'frame_wood',
        userId: currentUser?.id || null
      }, (res) => {
        if (res && res.success) {
          closeModal(passwordPromptModal);
          gameMode = 'online';
          currentRoomId = res.roomId;
          currentRoomPassword = pass || null;
          myRole = res.role;
          isBoardFlipped = (myRole === 'blue');
          ruleMode = res.gameState.ruleMode;
          closeModal(onlineModal);
          switchToGameView();
          updateOnlineGameState(res.gameState);
          showToast(`เข้าร่วมห้อง ${res.roomId} สำเร็จ!`);
        } else {
          if (errorMsg) {
            errorMsg.textContent = `❌ ${res?.error || 'รหัสผ่านไม่ถูกต้อง'}`;
            errorMsg.style.display = 'block';
          }
          showToast(res?.error || 'รหัสผ่านห้องไม่ถูกต้อง');
          passInput?.select();
        }
      });
    }

    const btnSubmitPromptPass = document.getElementById('btnSubmitPromptPassword');
    if (btnSubmitPromptPass) {
      btnSubmitPromptPass.addEventListener('click', handlePromptPasswordSubmit);
    }

    const inputPromptPass = document.getElementById('inputPromptPassword');
    if (inputPromptPass) {
      inputPromptPass.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlePromptPasswordSubmit();
        }
      });
    }

    const btnTogglePromptPass = document.getElementById('btnTogglePromptPass');
    if (btnTogglePromptPass && inputPromptPass) {
      btnTogglePromptPass.addEventListener('click', () => {
        const isPass = inputPromptPass.type === 'password';
        inputPromptPass.type = isPass ? 'text' : 'password';
        btnTogglePromptPass.textContent = isPass ? '🙈' : '👁️';
      });
    }

    const btnCancelPromptPass = document.getElementById('btnCancelPromptPassword');
    if (btnCancelPromptPass) {
      btnCancelPromptPass.addEventListener('click', () => {
        closeModal(passwordPromptModal);
      });
    }

    window.promptJoinRoom = function(roomId, hostName) {
      pendingPromptRoomId = roomId;
      const savedPass = getSavedRoomPassword(roomId);
      const isOwner = !!savedPass;

      const codeEl = document.getElementById('promptRoomCode');
      if (codeEl) {
        codeEl.innerHTML = `${roomId} ${isOwner ? '<span style="color:#facc15; font-size:13px; font-weight:800; margin-left:6px;">👑 (คุณคือเจ้าของห้อง)</span>' : ''}`;
      }
      document.getElementById('promptHostName').textContent = hostName || 'เจ้าของห้อง';
      const input = document.getElementById('inputPromptPassword');
      const errorMsg = document.getElementById('promptErrorMsg');

      if (isOwner && savedPass) {
        if (input) input.value = savedPass;
        if (errorMsg) {
          errorMsg.innerHTML = `💡 <b>คุณเป็นเจ้าของห้องนี้:</b> รหัสผ่านคือ <span style="color:#facc15; font-size:15px; font-family:monospace; font-weight:800; background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:4px;">${escapeHtml(savedPass)}</span>`;
          errorMsg.style.display = 'block';
        }
      } else {
        if (input) input.value = '';
        if (errorMsg) errorMsg.style.display = 'none';
      }
      openModal(passwordPromptModal);
      setTimeout(() => input?.focus(), 150);
    };

    window.directJoinRoom = function(roomId, password = null) {
      const pass = password || getSavedRoomPassword(roomId) || null;
      joinRoomWithCode(roomId, pass);
    };

    // Pill selectors
    setupPillSelect('ruleSelect');
    setupPillSelect('timerSelect');
    setupPillSelect('aiDifficultySelect');
    setupPillSelect('aiSideSelect');

    // Create Room Submit
    document.getElementById('btnSubmitCreateRoom').addEventListener('click', () => {
      const playerName = document.getElementById('createPlayerName').value.trim() || playerStats.name || 'ผู้เล่น 1';
      const ruleVal = document.querySelector('#ruleSelect .pill-option.active')?.dataset.rule || 'thai';
      const timeVal = Number(document.querySelector('#timerSelect .pill-option.active')?.dataset.time || 60);
      const isLocked = document.getElementById('checkLockRoom')?.checked;
      const password = isLocked ? (document.getElementById('createRoomPassword')?.value.trim() || null) : null;
      const gameType = document.querySelector('#createGameTypeSelect .pill-option.active')?.dataset.game || currentGameType || 'checkers';

      ruleMode = ruleVal;
      socket.emit('create_room', {
        playerName,
        playerMmr: currentUser?.stats?.mmr || playerStats.mmr,
        ruleMode: ruleVal,
        turnTimerLimit: timeVal,
        password,
        gameType,
        avatar: currentUser?.avatar || 'cat_ninja',
        frame: currentUser?.frame || 'frame_wood',
        userId: currentUser?.id || null
      }, (res) => {
        if (res && res.success) {
          gameMode = 'online';
          currentGameType = res.gameState.gameType || gameType;
          currentRoomId = res.roomId;
          currentRoomPassword = res.roomPassword || password || null;
          if (currentRoomPassword) {
            saveRoomPassword(currentRoomId, currentRoomPassword);
          }
          myRole = 'red';
          isBoardFlipped = false;
          closeModal(onlineModal);
          switchToGameView();
          updateOnlineGameState(res.gameState);
          openShareModal(); // Open share modal immediately so host can invite friend!
        }
      });
    });

    // Join Room Submit
    document.getElementById('btnSubmitJoinRoom').addEventListener('click', () => {
      const playerName = document.getElementById('joinPlayerName').value.trim() || playerStats.name || 'ผู้เล่น 2';
      const roomId = document.getElementById('inputRoomCode').value.trim().toUpperCase();
      const password = document.getElementById('joinRoomPassword')?.value.trim() || null;

      if (!roomId) {
        showToast('กรุณากรอกรหัสห้อง 6 หลัก');
        return;
      }

      joinRoomWithCode(roomId, password);
    });

    // AI Game Start
    document.getElementById('btnStartAIGame').addEventListener('click', () => {
      const diffVal = document.querySelector('#aiDifficultySelect .pill-option.active').dataset.diff;
      const sideVal = document.querySelector('#aiSideSelect .pill-option.active').dataset.side;

      closeModal(aiModal);
      startAIGame(diffVal, sideVal);
    });

    // In-game controls
    document.getElementById('btnSidebarTheme').addEventListener('click', () => {
      openModal(themeModal);
    });

    document.getElementById('btnSidebarRandom').addEventListener('click', () => {
      randomizeEverything(true);
    });

    document.getElementById('btnFlipBoard').addEventListener('click', () => {
      isBoardFlipped = !isBoardFlipped;
      renderBoard();
      updatePlayerBars();
    });

    document.getElementById('btnShareRoom').addEventListener('click', () => {
      openShareModal();
    });

    document.getElementById('btnOfferDraw').addEventListener('click', () => {
      if (gameMode === 'online') {
        socket.emit('offer_draw', { roomId: currentRoomId });
        showToast('ส่งคำขอเสมอแล้ว กำลังรอฝ่ายตรงข้ามตอบรับ...');
      } else {
        showToast('การขอเสมอใช้ได้ในโหมดออนไลน์');
      }
    });

    document.getElementById('btnResign').addEventListener('click', () => {
      if (confirm('คุณต้องการขอยอมแพ้ใช่หรือไม่?')) {
        if (gameMode === 'online') {
          socket.emit('resign', { roomId: currentRoomId });
        } else if (gameMode === 'ai' || gameMode === 'pass_play') {
          const winner = currentTurn === 'red' ? 'blue' : 'red';
          handleGameOver({
            winner,
            reason: `${currentTurn === 'red' ? 'สีแดง' : 'สีน้ำเงิน'} ขอยอมแพ้`,
            board: boardState
          });
        }
      }
    });

    document.getElementById('btnLeaveGame').addEventListener('click', () => {
      if (confirm('ต้องการออกจากเกมและกลับหน้าหลักหรือไม่? (หากกำลังแข่งจะถือว่าขอยอมแพ้)')) {
        if (gameMode === 'online' && socket && currentRoomId) {
          socket.emit('leave_room', { roomId: currentRoomId });
        }
        returnToLobby();
      }
    });

    const btnClaimWin = document.getElementById('btnClaimWin');
    if (btnClaimWin) {
      btnClaimWin.addEventListener('click', () => {
        if (gameMode === 'online' && socket && currentRoomId) {
          socket.emit('claim_win_disconnect', { roomId: currentRoomId });
          btnClaimWin.disabled = true;
          setTimeout(() => { btnClaimWin.disabled = false; }, 2000);
        }
      });
    }

    // Emoji Bar
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        spawnFloatingEmoji(emoji);
        if (gameMode === 'online' && socket) {
          socket.emit('send_chat', { roomId: currentRoomId, emoji });
        }
      });
    });

    // Share Modal Buttons
    document.getElementById('btnCopyCode').addEventListener('click', () => {
      copyToClipboard(currentRoomId, 'คัดลอกรหัสห้องแล้ว!');
    });

    document.getElementById('btnCopyPassword')?.addEventListener('click', () => {
      if (currentRoomPassword) {
        copyToClipboard(currentRoomPassword, 'คัดลอกรหัสผ่านห้องแล้ว!');
      }
    });

    document.getElementById('btnCopyLink').addEventListener('click', () => {
      const inviteUrl = getInviteLink();
      if (currentRoomPassword) {
        const fullInvite = `🎮 มาเล่นหมากฮอสออนไลน์ด้วยกัน!\nรหัสห้อง: ${currentRoomId}\n🔒 รหัสผ่าน: ${currentRoomPassword}\nลิงก์เข้าเล่น: ${inviteUrl}`;
        copyToClipboard(fullInvite, 'คัดลอกคำเชิญและรหัสผ่านเรียบร้อยแล้ว!');
      } else {
        copyToClipboard(inviteUrl, 'คัดลอกลิงก์ชวนเพื่อนแล้ว! ส่งให้เพื่อนเปิดเล่นได้ทันที');
      }
    });

    // Game Over Rematch
    document.getElementById('btnGameOverRematch').addEventListener('click', () => {
      if (gameMode === 'online') {
        socket.emit('request_rematch', { roomId: currentRoomId });
        showToast('ส่งคำขอเล่นอีกรอบแล้ว รอฝ่ายตรงข้ามยืนยัน...');
      } else if (gameMode === 'ai') {
        closeModal(gameOverModal);
        startAIGame(aiDifficulty, aiSide);
      } else if (gameMode === 'pass_play') {
        closeModal(gameOverModal);
        startPassAndPlayGame();
      }
    });

    document.getElementById('btnGameOverLobby').addEventListener('click', () => {
      closeModal(gameOverModal);
      returnToLobby();
    });

    // Close buttons for modals (any element with data-close or .close-btn)
    document.querySelectorAll('[data-close], .close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const target = modalId ? document.getElementById(modalId) : btn.closest('.modal-backdrop');
        if (target) closeModal(target);
      });
    });

    // Click outside to close modal
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop && backdrop.id !== 'gameOverModal') {
          closeModal(backdrop);
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => {
          if (m.id !== 'gameOverModal') closeModal(m);
        });
      }
    });
  }

  // --- THEMES & SKINS LOGIC ---
  function setupThemeCustomizer() {
    if (window.ambientArena) {
      window.ambientArena.init();
    }
    applyArena(currentArena, false);
    applyBoardTheme(currentBoardTheme, false);
    applyPieceSkin(currentPieceSkin, false);

    const checkAuto = document.getElementById('checkAutoRandom');
    if (checkAuto) {
      checkAuto.checked = autoRandomize;
      checkAuto.addEventListener('change', (e) => {
        autoRandomize = e.target.checked;
        localStorage.setItem('checkers_auto_random', autoRandomize);
        showToast(autoRandomize ? 'เปิดสุ่มสไตล์อัตโนมัติทุกเกมใหม่แล้ว' : 'ปิดระบบสุ่มอัตโนมัติ');
      });
    }

    // Arena cards click
    document.querySelectorAll('#arenasGrid .theme-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const arena = card.dataset.arena;
        applyArena(arena, true);
      });
    });

    // Board theme cards click
    document.querySelectorAll('#boardThemesGrid .theme-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        applyBoardTheme(theme, true);
      });
    });

    // Piece skin cards click
    document.querySelectorAll('#pieceSkinsGrid .theme-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const skin = card.dataset.skin;
        applyPieceSkin(skin, true);
      });
    });

    // Buttons inside modal
    const btnRandArena = document.getElementById('btnRandomArenaOnly');
    if (btnRandArena) {
      btnRandArena.addEventListener('click', () => {
        randomizeArenaOnly();
      });
    }

    document.getElementById('btnRandomThemeOnly').addEventListener('click', () => {
      randomizeThemeOnly();
    });

    document.getElementById('btnRandomSkinOnly').addEventListener('click', () => {
      randomizeSkinOnly();
    });

    document.getElementById('btnRandomBoth').addEventListener('click', () => {
      randomizeEverything(true);
    });
  }

  function applyArena(arenaName, showNotification = true) {
    if (!ARENAS.includes(arenaName)) arenaName = 'arena-dojo';
    currentArena = arenaName;
    localStorage.setItem('checkers_arena', arenaName);

    // Update body class
    ARENAS.forEach(a => document.body.classList.remove(a));
    document.body.classList.add(arenaName);

    // Update active card
    document.querySelectorAll('#arenasGrid .theme-option-card').forEach(card => {
      card.classList.toggle('active', card.dataset.arena === arenaName);
    });

    if (window.ambientArena) {
      window.ambientArena.setArena(arenaName);
    }

    if (showNotification) {
      showToast(`เปลี่ยนสนามประลอง: ${ARENA_NAMES[arenaName] || arenaName}`);
      window.soundCtrl.playNotify();
    }
  }

  function randomizeArenaOnly() {
    let nextArena;
    do {
      nextArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    } while (nextArena === currentArena && ARENAS.length > 1);
    applyArena(nextArena, true);
  }

  function randomizeEverything(showNotification = true) {
    let nextArena, nextTheme, nextSkin;
    do {
      nextArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    } while (nextArena === currentArena && ARENAS.length > 1);

    do {
      nextTheme = BOARD_THEMES[Math.floor(Math.random() * BOARD_THEMES.length)];
    } while (nextTheme === currentBoardTheme && BOARD_THEMES.length > 1);

    do {
      nextSkin = PIECE_SKINS[Math.floor(Math.random() * PIECE_SKINS.length)];
    } while (nextSkin === currentPieceSkin && PIECE_SKINS.length > 1);

    applyArena(nextArena, false);
    applyBoardTheme(nextTheme, false);
    applyPieceSkin(nextSkin, false);

    if (showNotification) {
      showToast(`🎲 สุ่มสนามและสไตล์ใหม่: ${ARENA_NAMES[nextArena]} + ${THEME_NAMES[nextTheme]} + ${SKIN_NAMES[nextSkin]}`);
      window.soundCtrl.playNotify();
    }
  }

  function applyBoardTheme(themeName, showNotification = true) {
    if (!BOARD_THEMES.includes(themeName)) themeName = 'theme-classic-wood';
    currentBoardTheme = themeName;
    localStorage.setItem('checkers_theme', themeName);

    // Update active card
    document.querySelectorAll('#boardThemesGrid .theme-option-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === themeName);
    });

    const wrapper = document.querySelector('.board-wrapper');
    if (wrapper) {
      BOARD_THEMES.forEach(t => wrapper.classList.remove(t));
      wrapper.classList.add(themeName);
    }

    if (showNotification) {
      showToast(`เปลี่ยนธีมกระดาน: ${THEME_NAMES[themeName] || themeName}`);
      window.soundCtrl.playNotify();
    }
  }

  function applyPieceSkin(skinName, showNotification = true) {
    if (!PIECE_SKINS.includes(skinName)) skinName = 'skin-modern-3d';
    currentPieceSkin = skinName;
    localStorage.setItem('checkers_skin', skinName);

    // Update active card
    document.querySelectorAll('#pieceSkinsGrid .theme-option-card').forEach(card => {
      card.classList.toggle('active', card.dataset.skin === skinName);
    });

    if (boardGrid) {
      PIECE_SKINS.forEach(s => boardGrid.classList.remove(s));
      boardGrid.classList.add(skinName);
    }

    if (boardState) {
      renderBoard();
    }

    if (showNotification) {
      showToast(`เปลี่ยนสไตล์หมาก: ${SKIN_NAMES[skinName] || skinName}`);
      window.soundCtrl.playNotify();
    }
  }

  function randomizeThemeOnly() {
    let nextTheme;
    do {
      nextTheme = BOARD_THEMES[Math.floor(Math.random() * BOARD_THEMES.length)];
    } while (nextTheme === currentBoardTheme && BOARD_THEMES.length > 1);
    applyBoardTheme(nextTheme, true);
  }

  function randomizeSkinOnly() {
    let nextSkin;
    do {
      nextSkin = PIECE_SKINS[Math.floor(Math.random() * PIECE_SKINS.length)];
    } while (nextSkin === currentPieceSkin && PIECE_SKINS.length > 1);
    applyPieceSkin(nextSkin, true);
  }

  function randomizeThemeAndSkin(showNotification = true) {
    let nextTheme, nextSkin;
    do {
      nextTheme = BOARD_THEMES[Math.floor(Math.random() * BOARD_THEMES.length)];
    } while (nextTheme === currentBoardTheme && BOARD_THEMES.length > 1);

    do {
      nextSkin = PIECE_SKINS[Math.floor(Math.random() * PIECE_SKINS.length)];
    } while (nextSkin === currentPieceSkin && PIECE_SKINS.length > 1);

    applyBoardTheme(nextTheme, false);
    applyPieceSkin(nextSkin, false);

    if (showNotification) {
      showToast(`🎲 สุ่มสไตล์ใหม่: ${THEME_NAMES[nextTheme]} + ${SKIN_NAMES[nextSkin]}`);
      window.soundCtrl.playNotify();
    }
  }

  function setupPillSelect(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const options = container.querySelectorAll('.pill-option');
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  }

  function openOnlineModal(tab = 'create') {
    openModal(onlineModal);
    if (tab === 'join') {
      document.getElementById('tabJoinRoom').click();
    } else {
      document.getElementById('tabCreateRoom').click();
    }
  }

  function openModal(modalEl) {
    if (modalEl) modalEl.style.display = 'flex';
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.style.display = 'none';
  }

  function showToast(message) {
    const toast = document.getElementById('toastContainer');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg);
  }

  function getInviteLink() {
    const origin = window.location.origin;
    return `${origin}/?room=${currentRoomId}`;
  }

  async function openShareModal() {
    if (!currentRoomId) return;
    document.getElementById('modalRoomCode').textContent = currentRoomId;

    const modalPassBox = document.getElementById('modalPasswordBox');
    const modalPassDigits = document.getElementById('modalRoomPassword');
    if (currentRoomPassword) {
      if (modalPassBox) modalPassBox.style.display = 'flex';
      if (modalPassDigits) modalPassDigits.textContent = currentRoomPassword;
    } else {
      if (modalPassBox) modalPassBox.style.display = 'none';
    }

    const inviteLink = getInviteLink();

    // Fetch and show QR code
    try {
      const res = await fetch(`/api/qrcode?text=${encodeURIComponent(inviteLink)}`);
      const data = await res.json();
      if (data && data.dataUrl) {
        document.getElementById('qrImage').src = data.dataUrl;
      }
    } catch (e) {
      console.error('Failed to load QR code:', e);
    }

    if (serverLanUrl && !serverLanUrl.includes('localhost') && !serverLanUrl.includes('127.0.0.1')) {
      document.getElementById('lanNotice').style.display = 'block';
    }

    openModal(shareModal);
  }

  function switchToGameView() {
    lobbyView.style.display = 'none';
    gameView.style.display = 'flex';

    const headerGameSel = document.getElementById('headerNavArea') || document.getElementById('headerGameSelector');
    if (headerGameSel) headerGameSel.style.display = 'none';
    closeNavDropdown();

    const btnPass = document.getElementById('btnPassTurn');
    if (btnPass) btnPass.style.display = (currentGameType === 'go') ? 'block' : 'none';

    const btnScore = document.getElementById('btnCountScore');
    if (btnScore) btnScore.style.display = (currentGameType === 'go') ? 'block' : 'none';

    const headerPassBadge = document.getElementById('headerPasswordBadge');
    const headerPassText = document.getElementById('headerRoomPassword');
    const sidebarPassBadge = document.getElementById('sidebarPasswordBadge');
    const sidebarPassText = document.getElementById('sidebarRoomPassword');

    if (currentRoomId) {
      roomPill.style.display = 'inline-flex';
      headerRoomCode.textContent = currentRoomId;
      sidebarRoomId.textContent = currentRoomId;

      if (currentRoomPassword) {
        if (headerPassBadge) {
          headerPassBadge.style.display = 'inline-flex';
          if (headerPassText) headerPassText.textContent = currentRoomPassword;
        }
        if (sidebarPassBadge) {
          sidebarPassBadge.style.display = 'inline';
          if (sidebarPassText) sidebarPassText.textContent = currentRoomPassword;
        }
      } else {
        if (headerPassBadge) headerPassBadge.style.display = 'none';
        if (sidebarPassBadge) sidebarPassBadge.style.display = 'none';
      }
    } else {
      roomPill.style.display = 'none';
      const gameName = GAME_INFO[currentGameType]?.title || 'เกม';
      sidebarRoomId.textContent = gameMode === 'ai' ? `${gameName} (สู้กับ AI)` : `${gameName} (2 คนเครื่องเดียว)`;
      if (headerPassBadge) headerPassBadge.style.display = 'none';
      if (sidebarPassBadge) sidebarPassBadge.style.display = 'none';
    }
  }

  function returnToLobby() {
    gameMode = 'lobby';
    currentRoomId = null;
    currentRoomPassword = null;
    selectedPiece = null;
    legalMoves = [];
    activePiece = null;
    lastMove = null;
    boardState = null;

    closeModal(shareModal);
    closeModal(gameOverModal);

    const headerPassBadge = document.getElementById('headerPasswordBadge');
    const sidebarPassBadge = document.getElementById('sidebarPasswordBadge');
    if (headerPassBadge) headerPassBadge.style.display = 'none';
    if (sidebarPassBadge) sidebarPassBadge.style.display = 'none';

    roomPill.style.display = 'none';
    gameView.style.display = 'none';
    lobbyView.style.display = 'block';

    const headerGameSel = document.getElementById('headerNavArea') || document.getElementById('headerGameSelector');
    if (headerGameSel) headerGameSel.style.display = 'flex';

    fetchLobbyRooms();

    // Clear URL param if present
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // --- LOBBY ROOMS BROWSER ---
  function joinRoomWithCode(roomId, password = null) {
    const playerName = currentUser?.displayName || playerStats.name || 'ผู้เล่น';
    socket.emit('join_room', { 
      roomId, 
      playerName, 
      playerMmr: currentUser?.stats?.mmr || playerStats.mmr, 
      password,
      avatar: currentUser?.avatar || 'cyber_fox',
      frame: currentUser?.frame || 'frame_wood',
      userId: currentUser?.id || null
    }, (res) => {
      if (res && res.success) {
        gameMode = 'online';
        currentRoomId = res.roomId;
        currentRoomPassword = password || null;
        myRole = res.role;
        isBoardFlipped = (myRole === 'blue');
        ruleMode = res.gameState.ruleMode;
        closeModal(onlineModal);
        switchToGameView();
        updateOnlineGameState(res.gameState);
        showToast(`เข้าร่วมห้อง ${roomId} สำเร็จ!`);
      } else {
        showToast(res.error || 'ไม่สามารถเข้าห้องได้');
        if (res && res.isLocked) {
          window.promptJoinRoom(roomId, '');
        }
      }
    });
  }

  async function fetchLobbyRooms() {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      renderLobbyRooms(data.rooms || []);
    } catch (e) {
      console.error('Error fetching rooms:', e);
    }
  }

  function renderLobbyRooms(roomsList) {
    const container = document.getElementById('lobbyRoomsList');
    const badge = document.getElementById('lobbyRoomCountBadge');
    if (!container) return;

    if (!roomsList || roomsList.length === 0) {
      if (badge) badge.textContent = '0 ห้อง';
      container.innerHTML = `
        <div class="lobby-rooms-empty">
          <span style="font-size: 32px; display: block; margin-bottom: 6px;">📭</span>
          ยังไม่มีห้องเปิดอยู่ กด "เล่นออนไลน์กับเพื่อน" เพื่อสร้างห้องแรกได้เลย!
        </div>
      `;
      return;
    }

    if (badge) badge.textContent = `${roomsList.length} ห้อง`;

    container.innerHTML = roomsList.map(r => {
      const isWaiting = r.status === 'waiting' && r.playerCount < 2;
      const statusLabel = isWaiting ? '🟢 รอผู้เล่น' : (r.status === 'playing' ? '⚔️ กำลังแข่ง' : '🔴 เต็มแล้ว');
      const statusClass = isWaiting ? 'waiting' : 'playing';
      const ruleLabel = r.ruleMode === 'thai' ? 'หมากฮอสไทย (8 ตัว)' : 'สากล (12 ตัว)';
      const timerLabel = r.turnTimerLimit > 0 ? `${r.turnTimerLimit} วิ/ตา` : 'ไม่จำกัดเวลา';

      const isMyRoom = r.isMyRoom || !!getSavedRoomPassword(r.id);
      const mySavedPass = r.password || getSavedRoomPassword(r.id);

      let actionBtnHtml = '';
      if (isMyRoom) {
        actionBtnHtml = `<button class="room-card-btn host-enter" onclick="directJoinRoom('${r.id}', '${escapeHtml(mySavedPass || '')}')"><span>👑</span> เข้าห้องของคุณ (ไม่ต้องใส่รหัส)</button>`;
      } else if (isWaiting) {
        if (r.hasPassword) {
          actionBtnHtml = `<button class="room-card-btn locked" onclick="promptJoinRoom('${r.id}', '${escapeHtml(r.hostName)}')"><span>🔒</span> ใส่รหัสเข้าเล่น</button>`;
        } else {
          actionBtnHtml = `<button class="room-card-btn join" onclick="directJoinRoom('${r.id}')"><span>🎮</span> เข้าเล่นทันที</button>`;
        }
      } else {
        if (r.hasPassword) {
          actionBtnHtml = `<button class="room-card-btn disabled" disabled><span>🔒</span> ห้องล็อค (แข่งอยู่)</button>`;
        } else {
          actionBtnHtml = `<button class="room-card-btn spectate" onclick="directJoinRoom('${r.id}')"><span>👁️</span> เข้าชมเกม (${r.spectatorCount})</button>`;
        }
      }

      const gType = r.gameType || 'checkers';
      const gameBadges = {
        checkers: '<span class="room-game-badge checkers">🔴 หมากฮอส</span>',
        makruk: '<span class="room-game-badge makruk">⚔️ หมากรุกไทย</span>',
        chess: '<span class="room-game-badge chess">♟️ หมากรุกสากล</span>',
        go: '<span class="room-game-badge go">⚫⚪ หมากล้อม</span>',
        othello: '<span class="room-game-badge othello">🟢⚪ โอเทลโล่</span>',
        gomoku: '<span class="room-game-badge gomoku">🎯 หมากเรียง 5</span>',
        connect4: '<span class="room-game-badge connect4">🟡🔴 หมากเรียง 4</span>',
        dokapon: '<span class="room-game-badge dokapon">🏰⚔️ โดกาปอง</span>'
      };
      const gameBadgeHtml = gameBadges[gType] || gameBadges.checkers;

      return `
        <div class="room-lobby-card ${r.hasPassword ? 'is-locked' : ''} ${isMyRoom ? 'is-my-room' : ''}">
          <div class="room-card-top">
            <div class="room-card-code" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="room-card-id">${r.id}</span>
              ${gameBadgeHtml}
              ${isMyRoom ? '<span class="room-my-badge">👑 ห้องของคุณ</span>' : ''}
              ${r.hasPassword ? '<span class="room-lock-tag" title="ห้องนี้ล็อคด้วยรหัสผ่าน">🔒 ล็อค</span>' : '<span class="room-public-tag">🔓 สาธารณะ</span>'}
            </div>
            <span class="room-status-badge ${statusClass}">${statusLabel}</span>
          </div>

          ${isMyRoom && r.hasPassword && mySavedPass ? `
            <div class="host-pass-info">
              <span>🔑 รหัสผ่านห้องของคุณ:</span>
              <b class="host-pass-code">${escapeHtml(mySavedPass)}</b>
            </div>
          ` : ''}

          <div class="room-card-host">
            <span class="host-avatar">${r.hostRankBadge || '🥉'}</span>
            <div style="flex: 1; overflow: hidden;">
              <div class="host-name" style="color: ${r.hostTierColor || '#fbbf24'}; font-weight: 700;">${escapeHtml(r.hostName)}</div>
              <div class="host-sub">${r.hostTierName} • ${r.hostMmr} RP</div>
            </div>
          </div>

          <div class="room-card-details">
            <span>📜 ${ruleLabel}</span>
            <span>⏱️ ${timerLabel}</span>
            <span>👥 ${r.playerCount}/2 คน</span>
          </div>

          <div class="room-card-action">
            ${actionBtnHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // --- ONLINE GAME STATE SYNC ---
  function updateOnlineGameState(state) {
    if (state.gameType) {
      currentGameType = state.gameType;
    }
    if (state.goCaptures) {
      goCaptures = state.goCaptures;
    }
    boardState = state.board;
    currentTurn = state.turn;
    activePiece = state.activePiece;
    lastMove = state.lastMove;
    ruleMode = state.ruleMode;
    legalMoves = state.legalMoves || [];

    const btnPass = document.getElementById('btnPassTurn');
    if (btnPass) btnPass.style.display = (currentGameType === 'go') ? 'block' : 'none';

    const btnScore = document.getElementById('btnCountScore');
    if (btnScore) btnScore.style.display = (currentGameType === 'go') ? 'block' : 'none';

    updatePlayerBars(state.players);
    updateMoveHistory(state.moveHistory);
    renderBoard();

    if (state.timerLeft > 0) {
      updateTimerDisplay(state.turn, state.timerLeft);
    }
  }

  function handleMoveResult(data) {
    const { gameState, move, crowned } = data;

    if (move && (move.isCapture || move.capture)) {
      window.soundCtrl.playCapture();
    } else {
      window.soundCtrl.playMove();
    }

    if (crowned) {
      window.soundCtrl.playKing();
      if (currentPieceSkin === 'skin-graveyard-ghosts') {
        showToast('🎃 เข้าฮอสแล้ว! (สวมหัวฟักทองผีสิง)');
      } else {
        showToast('👑 เข้าฮอสแล้ว!');
      }
    }

    updateOnlineGameState(gameState);

    if (gameState && gameState.gameType === 'chess' && window.ChessEngine && window.ChessEngine.isKingInCheck(gameState.board, gameState.turn)) {
      window.soundCtrl.playNotify();
      showToast('⚠️ รุก! (Check)');
    } else if (gameState && gameState.gameType === 'makruk' && window.MakrukEngine && window.MakrukEngine.isKingInCheck(gameState.board, gameState.turn)) {
      window.soundCtrl.playNotify();
      showToast('⚠️ รุก! (หมากรุกไทย)');
    }
  }

  function updateTimerDisplay(turn, seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    const isBottomTurn = (turn === myRole) || (gameMode === 'pass_play' && turn === (isBoardFlipped ? 'blue' : 'red'));

    if (isBottomTurn) {
      bottomTimerBox.textContent = timeStr;
      if (seconds <= 10) bottomTimerBox.classList.add('urgent');
      else bottomTimerBox.classList.remove('urgent');
    } else {
      topTimerBox.textContent = timeStr;
      if (seconds <= 10) topTimerBox.classList.add('urgent');
      else topTimerBox.classList.remove('urgent');
    }
  }

  function handleGameOver(data) {
    const banner = document.getElementById('disconnectBanner');
    if (banner) banner.style.display = 'none';

    const { winner, reason, board, rankChanges } = data;
    if (board) boardState = board;
    renderBoard();

    const isWinner = (winner === myRole);
    const isDraw = (winner === 'draw');

    if (isDraw) {
      document.getElementById('gameOverIcon').textContent = '🤝';
      document.getElementById('gameOverTitle').textContent = 'ผลการแข่งขัน: เสมอกัน';
      window.soundCtrl.playNotify();
    } else if (isWinner) {
      document.getElementById('gameOverIcon').textContent = '🏆';
      document.getElementById('gameOverTitle').textContent = 'ยินดีด้วย! คุณเป็นฝ่ายชนะ 🎉';
      window.soundCtrl.playWin();
    } else {
      document.getElementById('gameOverIcon').textContent = '💀';
      document.getElementById('gameOverTitle').textContent = `ฝ่าย ${winner === 'red' ? 'สีแดง' : 'สีน้ำเงิน'} เป็นฝ่ายชนะ`;
      window.soundCtrl.playLose();
    }

    document.getElementById('gameOverReason').textContent = reason || '';
    document.getElementById('rematchCount').textContent = '0';

    // Go Score Card Breakdown
    const isGo = (currentGameType === 'go');
    const goScoreCard = document.getElementById('goScoreCard');
    if (isGo && window.GoEngine) {
      const score = data.goScore || window.GoEngine.calculateScore(boardState, goCaptures);
      if (goScoreCard && score) {
        goScoreCard.style.display = 'block';
        document.getElementById('goScoreBlack').textContent = `${score.blackScore.toFixed(1)} แต้ม`;
        document.getElementById('goScoreWhite').textContent = `${score.whiteScore.toFixed(1)} แต้ม`;
        document.getElementById('goTerritoryBlack').textContent = score.territory?.B || 0;
        document.getElementById('goTerritoryWhite').textContent = score.territory?.W || 0;
        document.getElementById('goStonesBlack').textContent = score.stones?.B || 0;
        document.getElementById('goStonesWhite').textContent = score.stones?.W || 0;
        document.getElementById('goCapturesBlack').textContent = score.captures?.B || 0;
        document.getElementById('goCapturesWhite').textContent = score.captures?.W || 0;
      }
    } else if (goScoreCard) {
      goScoreCard.style.display = 'none';
    }

    // Rewards Display
    const rewardCard = document.getElementById('gameOverRewardCard');
    const coinsVal = document.getElementById('rewardCoinsVal');
    const gemsVal = document.getElementById('rewardGemsVal');
    const expVal = document.getElementById('rewardExpVal');
    const levelBanner = document.getElementById('rewardLevelUpBanner');
    const newLevelSpan = document.getElementById('rewardNewLevel');

    const myReward = data.rewards ? data.rewards[myRole] : null;
    if (myReward && rewardCard) {
      rewardCard.style.display = 'block';
      if (coinsVal) coinsVal.textContent = myReward.coinsEarned || 0;
      if (gemsVal) gemsVal.textContent = myReward.gemsEarned || 0;
      if (expVal) expVal.textContent = myReward.expEarned || 0;
      if (myReward.leveledUp && levelBanner) {
        levelBanner.style.display = 'block';
        if (newLevelSpan) newLevelSpan.textContent = myReward.newLevel;
      } else if (levelBanner) {
        levelBanner.style.display = 'none';
      }
      checkAuthSession();
    } else if (rewardCard) {
      rewardCard.style.display = 'none';
    }

    processGameOverRank(winner, rankChanges);
    openModal(gameOverModal);
  }

  function processGameOverRank(winner, serverRankChanges) {
    const isWinner = (winner === myRole);
    const isDraw = (winner === 'draw');
    const result = isWinner ? 'win' : (isDraw ? 'draw' : 'loss');

    // Stats updates
    playerStats.matches = (playerStats.matches || 0) + 1;
    if (isWinner) {
      playerStats.wins = (playerStats.wins || 0) + 1;
      playerStats.streak = (playerStats.streak || 0) + 1;
      if (playerStats.streak > (playerStats.bestStreak || 0)) {
        playerStats.bestStreak = playerStats.streak;
      }
    } else if (isDraw) {
      playerStats.draws = (playerStats.draws || 0) + 1;
      playerStats.streak = 0;
    } else {
      playerStats.losses = (playerStats.losses || 0) + 1;
      playerStats.streak = 0;
    }

    let deltaMmr = 0;
    let newMmr = playerStats.mmr || 1200;
    let oppName = 'คู่แข่ง';
    let modeText = 'แข่งออนไลน์';

    if (gameMode === 'online' && serverRankChanges && serverRankChanges[myRole]) {
      deltaMmr = serverRankChanges[myRole].change;
      newMmr = serverRankChanges[myRole].newMmr;
      oppName = myRole === 'red' ? (topPlayerName?.textContent || 'ผู้เล่น 2') : (topPlayerName?.textContent || 'ผู้เล่น 1');
    } else if (gameMode === 'ai') {
      modeText = `บอท AI (${aiDifficulty})`;
      oppName = `บอท AI (${aiDifficulty})`;
      deltaMmr = window.RankSystem.calculateMmrChange(playerStats.mmr, 1200, result, true, aiDifficulty);
      newMmr = Math.max(1000, (playerStats.mmr || 1200) + deltaMmr);
    } else {
      modeText = 'เล่น 2 คนในเครื่องเดียวกัน';
      deltaMmr = 0;
    }

    playerStats.mmr = newMmr;
    if (!playerStats.history) playerStats.history = [];
    playerStats.history.unshift({
      opponent: oppName,
      result,
      change: deltaMmr,
      mode: modeText,
      date: Date.now()
    });
    if (playerStats.history.length > 20) playerStats.history = playerStats.history.slice(0, 20);

    savePlayerStats(playerStats);
    updateHeaderRankUI();
    syncRankToServer();

    // Render rank card in GameOver Modal
    const rankBox = document.getElementById('gameOverRankBox');
    if (rankBox && (gameMode === 'online' || gameMode === 'ai')) {
      rankBox.style.display = 'block';
      const rankInfo = window.RankSystem.getRankFromMmr(newMmr);
      
      const badgeEl = document.getElementById('gameOverRankBadge');
      const tierEl = document.getElementById('gameOverRankTier');
      const mmrEl = document.getElementById('gameOverRankMmr');
      const deltaEl = document.getElementById('gameOverRankDelta');
      const barEl = document.getElementById('gameOverRankProgressBar');
      const labelEl = document.getElementById('gameOverRankProgressLabel');

      if (badgeEl) badgeEl.textContent = rankInfo.badge;
      if (tierEl) {
        tierEl.textContent = rankInfo.name;
        tierEl.style.color = rankInfo.color;
      }
      if (mmrEl) mmrEl.textContent = `${newMmr.toLocaleString()} RP`;
      if (deltaEl) {
        const isPositive = deltaMmr >= 0;
        deltaEl.textContent = `${isPositive ? '+' : ''}${deltaMmr} RP`;
        deltaEl.className = `rank-result-delta-pill ${isPositive ? 'plus' : 'minus'}`;
      }
      if (barEl) {
        barEl.style.width = '0%';
        setTimeout(() => {
          barEl.style.width = `${rankInfo.progress}%`;
        }, 150);
      }
      if (labelEl) {
        if (rankInfo.nextTierName === 'ระดับสูงสุด') {
          labelEl.textContent = '👑 ระดับสูงสุด (เซียนหมากฮอสสยาม)';
        } else {
          labelEl.textContent = `อีก ${rankInfo.neededMmr} RP เพื่อเลื่อนยศสู่ ${rankInfo.nextTierName}`;
        }
      }
    } else if (rankBox) {
      rankBox.style.display = 'none';
    }
  }

  // --- PASS & PLAY MODE ---
  function startPassAndPlayGame() {
    if (autoRandomize) {
      randomizeEverything(false);
    }
    gameMode = 'pass_play';
    ruleMode = 'thai';
    currentTurn = 'red';
    activePiece = null;
    selectedPiece = null;
    lastMove = null;
    myRole = 'red';
    isBoardFlipped = false;
    goConsecutivePasses = 0;
    goCaptures = { B: 0, W: 0 };
    goPrevHash = null;

    if (currentGameType === 'chess') {
      boardState = window.ChessEngine.createInitialBoard();
      legalMoves = window.ChessEngine.getAllLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'makruk') {
      boardState = window.MakrukEngine.createInitialBoard();
      legalMoves = window.MakrukEngine.getAllLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'go') {
      boardState = window.GoEngine.createInitialBoard(9);
      legalMoves = window.GoEngine.getLegalMoves(boardState, 'B', null);
    } else if (currentGameType === 'othello') {
      boardState = window.OthelloEngine.createInitialBoard();
      legalMoves = window.OthelloEngine.getLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'gomoku') {
      boardState = window.GomokuEngine.createInitialBoard(9);
      legalMoves = window.GomokuEngine.getLegalMoves(boardState);
    } else if (currentGameType === 'connect4') {
      boardState = window.Connect4Engine.createInitialBoard();
      legalMoves = window.Connect4Engine.getLegalColumns(boardState);
    } else if (currentGameType === 'dokapon') {
      boardState = window.DokaponEngine.createInitialState();
      legalMoves = ['roll'];
    } else {
      boardState = window.CheckersEngine.createInitialBoard(ruleMode);
      legalMoves = window.CheckersEngine.getAllLegalMoves(boardState, currentTurn, ruleMode, activePiece);
    }

    switchToGameView();
    updatePlayerBars({
      red: { name: 'ผู้เล่น 1 (สีแดง)', connected: true },
      blue: { name: 'ผู้เล่น 2 (สีน้ำเงิน)', connected: true }
    });
    updateMoveHistory([]);
    renderBoard();
    const gameLabel = GAME_INFO[currentGameType]?.title || 'หมากฮอส';
    showToast(`เริ่มเกม ${gameLabel} (2 คนในเครื่องเดียว)!`);
  }

  // --- AI GAME MODE ---
  function startAIGame(difficulty, chosenSide) {
    if (autoRandomize) {
      randomizeEverything(false);
    }
    gameMode = 'ai';
    aiDifficulty = difficulty;
    aiSide = chosenSide === 'red' ? 'blue' : 'red';
    myRole = chosenSide;
    isBoardFlipped = (myRole === 'blue');
    ruleMode = 'thai';
    currentTurn = 'red';
    activePiece = null;
    selectedPiece = null;
    lastMove = null;
    goConsecutivePasses = 0;
    goCaptures = { B: 0, W: 0 };
    goPrevHash = null;

    if (currentGameType === 'chess') {
      boardState = window.ChessEngine.createInitialBoard();
      legalMoves = window.ChessEngine.getAllLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'makruk') {
      boardState = window.MakrukEngine.createInitialBoard();
      legalMoves = window.MakrukEngine.getAllLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'go') {
      boardState = window.GoEngine.createInitialBoard(9);
      legalMoves = window.GoEngine.getLegalMoves(boardState, 'B', null);
    } else if (currentGameType === 'othello') {
      boardState = window.OthelloEngine.createInitialBoard();
      legalMoves = window.OthelloEngine.getLegalMoves(boardState, currentTurn);
    } else if (currentGameType === 'gomoku') {
      boardState = window.GomokuEngine.createInitialBoard(9);
      legalMoves = window.GomokuEngine.getLegalMoves(boardState);
    } else if (currentGameType === 'connect4') {
      boardState = window.Connect4Engine.createInitialBoard();
      legalMoves = window.Connect4Engine.getLegalColumns(boardState);
    } else if (currentGameType === 'dokapon') {
      boardState = window.DokaponEngine.createInitialState();
      legalMoves = ['roll'];
    } else {
      boardState = window.CheckersEngine.createInitialBoard(ruleMode);
      legalMoves = window.CheckersEngine.getAllLegalMoves(boardState, currentTurn, ruleMode, activePiece);
    }

    switchToGameView();
    updatePlayerBars({
      red: { name: chosenSide === 'red' ? 'คุณ (สีแดง)' : `บอท AI (${difficulty})`, connected: true },
      blue: { name: chosenSide === 'blue' ? 'คุณ (สีน้ำเงิน)' : `บอท AI (${difficulty})`, connected: true }
    });
    updateMoveHistory([]);
    renderBoard();

    const gameLabel = GAME_INFO[currentGameType]?.title || 'หมากฮอส';
    showToast(`เริ่มเกม ${gameLabel} กับ AI (${difficulty})!`);

    // If AI goes first
    if (currentTurn === aiSide) {
      triggerAIMove();
    }
  }

  function isAIDokaponTurn() {
    if (currentGameType !== 'dokapon' || !boardState) return false;
    const b = boardState.battle;
    if (boardState.phase === 'roll') {
      return currentTurn === aiSide;
    }
    if (boardState.phase === 'battle') {
      if (!b) return false;
      if (b.isPvP) {
        return (b.turnSide === 'attacker' && b.attacker === aiSide) ||
               (b.turnSide === 'defender' && b.defender === aiSide);
      } else {
        // PvE Against Monster: AI acts both when attacking and defending
        return b.attacker === aiSide;
      }
    }
    if (boardState.phase === 'punish') {
      return boardState.punish && boardState.punish.winner === aiSide;
    }
    if (boardState.phase === 'shop') {
      return boardState.shop && boardState.shop.player === aiSide;
    }
    return false;
  }

  function triggerAIMove() {
    if (isAITurnPending || gameMode !== 'ai') return;
    if (currentGameType === 'dokapon') {
      if (!isAIDokaponTurn()) return;
    } else {
      if (currentTurn !== aiSide) return;
    }
    isAITurnPending = true;

    // Small delay for natural human feel
    setTimeout(() => {
      try {
        if (currentGameType === 'dokapon') {
          const aiMove = window.DokaponEngine.getBestAIMove(boardState, aiSide);
          if (aiMove) {
            executeDokaponAction(aiMove);
          }
          return;
        }

        if (currentGameType === 'chess') {
          const bestMove = window.ChessEngine.getBestAIMove(boardState, currentTurn, aiDifficulty);
          if (!bestMove) {
            const check = window.ChessEngine.checkGameOver(boardState, currentTurn);
            handleGameOver({ isGameOver: true, winner: check.winner, reason: check.reason === 'checkmate' ? 'รุกจน (Checkmate)' : 'เสมอ (Stalemate)' });
            return;
          }
          executeLocalMove(bestMove);
          return;
        }

        if (currentGameType === 'makruk') {
          const bestMove = window.MakrukEngine.getBestAIMove(boardState, currentTurn, aiDifficulty);
          if (!bestMove) {
            const check = window.MakrukEngine.checkGameOver(boardState, currentTurn);
            handleGameOver({ isGameOver: true, winner: check.winner, reason: check.reason === 'checkmate' ? 'รุกจน (หมากรุกไทย)' : 'เสมอ' });
            return;
          }
          executeLocalMove(bestMove);
          return;
        }

        if (currentGameType === 'go') {
          const goColor = currentTurn === 'red' ? 'B' : 'W';
          const bestMove = window.GoEngine.getBestAIMove(boardState, goColor, goPrevHash, aiDifficulty);
          if (!bestMove) {
            executeLocalMove({ pass: true });
            return;
          }
          executeLocalMove({ r: bestMove.r, c: bestMove.c });
          return;
        }

        if (currentGameType === 'othello') {
          const bestMove = window.OthelloEngine.getBestAIMove(boardState, currentTurn, aiDifficulty);
          if (!bestMove) {
            // AI passes turn in othello
            currentTurn = currentTurn === 'red' ? 'blue' : 'red';
            const nextMoves = window.OthelloEngine.getLegalMoves(boardState, currentTurn);
            if (nextMoves.length === 0) {
              const over = window.OthelloEngine.checkGameOver(boardState);
              handleGameOver({ isGameOver: true, winner: over.winner, reason: over.reason });
            } else {
              renderBoard();
              updatePlayerBars();
            }
            return;
          }
          executeLocalMove({ r: bestMove.r, c: bestMove.c });
          return;
        }

        if (currentGameType === 'gomoku') {
          const bestMove = window.GomokuEngine.getBestAIMove(boardState, currentTurn, aiDifficulty);
          if (bestMove) {
            executeLocalMove({ r: bestMove.r, c: bestMove.c });
          }
          return;
        }

        if (currentGameType === 'connect4') {
          const bestCol = window.Connect4Engine.getBestAIMove(boardState, currentTurn, aiDifficulty);
          if (bestCol !== null && bestCol !== undefined) {
            executeLocalMove({ col: bestCol });
          }
          return;
        }

      // Checkers
      const bestMove = window.CheckersEngine.getBestAIMove(boardState, currentTurn, aiDifficulty, ruleMode, activePiece);
      if (!bestMove) {
        // AI has no moves -> Game over
        const status = window.CheckersEngine.checkGameStatus(boardState, currentTurn, ruleMode, activePiece);
        handleGameOver(status);
        return;
      }

      executeLocalMove(bestMove);
      } catch (err) {
        console.error('AI move error:', err);
      } finally {
        isAITurnPending = false;
      }
    }, 450);
  }

  // Execute move in local/AI mode
  function executeLocalMove(move) {
    if (currentGameType === 'chess') {
      boardState = window.ChessEngine.applyMove(boardState, move);
      lastMove = move;
      if (move.capture) window.soundCtrl.playCapture();
      else window.soundCtrl.playMove();

      const fromNot = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
      const toNot = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
      const moveText = `${currentTurn === 'red' ? 'ขาว' : 'ดำ'}: ${fromNot} ➜ ${toNot}${move.capture ? ' ⚔️' : ''}`;
      appendMoveHistory(moveText);

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      selectedPiece = null;
      legalMoves = window.ChessEngine.getAllLegalMoves(boardState, currentTurn);
      renderBoard();
      updatePlayerBars();

      const check = window.ChessEngine.checkGameOver(boardState, currentTurn);
      if (check.over) {
        handleGameOver({ isGameOver: true, winner: check.winner, reason: check.reason === 'checkmate' ? 'รุกจน (Checkmate)' : 'เสมอ (Stalemate)' });
        return;
      }

      if (window.ChessEngine.isKingInCheck(boardState, currentTurn)) {
        window.soundCtrl.playNotify();
        showToast('⚠️ รุก! (Check)');
      }

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    if (currentGameType === 'makruk') {
      boardState = window.MakrukEngine.applyMove(boardState, move);
      lastMove = move;
      if (move.capture) window.soundCtrl.playCapture();
      else window.soundCtrl.playMove();

      const fromNot = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
      const toNot = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
      const moveText = `${currentTurn === 'red' ? 'แดง' : 'น้ำเงิน'}: ${fromNot} ➜ ${toNot}${move.capture ? ' ⚔️' : ''}${move.promotion ? ' (หงาย)' : ''}`;
      appendMoveHistory(moveText);

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      selectedPiece = null;
      legalMoves = window.MakrukEngine.getAllLegalMoves(boardState, currentTurn);
      renderBoard();
      updatePlayerBars();

      const check = window.MakrukEngine.checkGameOver(boardState, currentTurn);
      if (check.over) {
        handleGameOver({ isGameOver: true, winner: check.winner, reason: check.reason === 'checkmate' ? 'รุกจน (หมากรุกไทย)' : 'เสมอ' });
        return;
      }

      if (window.MakrukEngine.isKingInCheck(boardState, currentTurn)) {
        window.soundCtrl.playNotify();
        showToast('⚠️ รุก! (หมากรุกไทย)');
      }

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    if (currentGameType === 'go') {
      const goColor = currentTurn === 'red' ? 'B' : 'W';
      if (move.pass) {
        goConsecutivePasses++;
        window.soundCtrl.playMove();
        appendMoveHistory(`${currentTurn === 'red' ? 'ดำ' : 'ขาว'}: ผ่านตาเดิน (Pass)`);
        currentTurn = currentTurn === 'red' ? 'blue' : 'red';
        renderBoard();
        updatePlayerBars();

        if (goConsecutivePasses >= 2) {
          const score = window.GoEngine.calculateScore(boardState, goCaptures);
          const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
          handleGameOver({
            isGameOver: true,
            winner: score.winner,
            reason: `จบเกมจากการผ่านทั้งคู่: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`,
            goScore: score
          });
          return;
        }

        if (gameMode === 'ai' && currentTurn === aiSide) {
          triggerAIMove();
        }
        return;
      }

      goConsecutivePasses = 0;
      const res = window.GoEngine.playMove(boardState, move.r, move.c, goColor, goPrevHash);
      if (!res.success) {
        showToast(res.reason === 'suicide' ? 'ห้ามลงจุดไม่มีลมหายใจ (ฆ่าตัวตาย)' : 'ไม่สามารถวางหมากตรงนี้ได้');
        return;
      }

      goPrevHash = res.hash;
      boardState = res.newBoard;
      lastMove = { to: { r: move.r, c: move.c } };

      if (res.captured.length > 0) {
        goCaptures[goColor] += res.captured.length;
        window.soundCtrl.playCapture();
      } else {
        window.soundCtrl.playMove();
      }

      const posNot = `${String.fromCharCode(65 + move.c)}${boardState.length - move.r}`;
      appendMoveHistory(`${currentTurn === 'red' ? 'ดำ' : 'ขาว'}: วางที่ ${posNot}${res.captured.length > 0 ? ` (กิน ${res.captured.length} เม็ด)` : ''}`);

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      legalMoves = window.GoEngine.getLegalMoves(boardState, currentTurn === 'red' ? 'B' : 'W', goPrevHash);
      renderBoard();
      updatePlayerBars();

      if (legalMoves.length === 0) {
        const score = window.GoEngine.calculateScore(boardState, goCaptures);
        const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
        handleGameOver({
          isGameOver: true,
          winner: score.winner,
          reason: `กระดานเต็ม: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`,
          goScore: score
        });
        return;
      }

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    if (currentGameType === 'othello') {
      const res = window.OthelloEngine.applyMove(boardState, move.r, move.c, currentTurn);
      if (!res.success) return;

      boardState = res.nextBoard;
      lastMove = { to: { r: move.r, c: move.c } };
      window.soundCtrl.playCapture();

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      legalMoves = window.OthelloEngine.getLegalMoves(boardState, currentTurn);

      // Check if next player must pass
      if (legalMoves.length === 0) {
        currentTurn = currentTurn === 'red' ? 'blue' : 'red';
        legalMoves = window.OthelloEngine.getLegalMoves(boardState, currentTurn);
        showToast('ฝ่ายตรงข้ามไม่มีตาเดิน ระบบทำการผ่านตาให้อัตโนมัติ!');
      }

      renderBoard();
      updatePlayerBars();

      const over = window.OthelloEngine.checkGameOver(boardState);
      if (over.over) {
        handleGameOver({ isGameOver: true, winner: over.winner, reason: over.reason });
        return;
      }

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    if (currentGameType === 'gomoku') {
      const res = window.GomokuEngine.applyMove(boardState, move.r, move.c, currentTurn);
      if (!res.success) return;

      boardState = res.nextBoard;
      lastMove = { to: { r: move.r, c: move.c } };
      window.soundCtrl.playMove();

      const over = window.GomokuEngine.checkGameOver(boardState);
      renderBoard();
      updatePlayerBars();

      if (over.over) {
        window.soundCtrl.playWin();
        handleGameOver({ isGameOver: true, winner: over.winner, reason: over.reason });
        return;
      }

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      legalMoves = window.GomokuEngine.getLegalMoves(boardState);

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    if (currentGameType === 'connect4') {
      const res = window.Connect4Engine.applyDrop(boardState, move.col, currentTurn);
      if (!res.success) return;

      boardState = res.nextBoard;
      lastMove = { to: { r: res.r, c: res.c } };
      window.soundCtrl.playMove();

      const over = window.Connect4Engine.checkGameOver(boardState);
      renderBoard();
      updatePlayerBars();

      if (over.over) {
        window.soundCtrl.playWin();
        handleGameOver({ isGameOver: true, winner: over.winner, reason: over.reason });
        return;
      }

      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
      legalMoves = window.Connect4Engine.getLegalColumns(boardState);

      if (gameMode === 'ai' && currentTurn === aiSide) {
        triggerAIMove();
      }
      return;
    }

    // Checkers (Default)
    const result = window.CheckersEngine.applyMove(boardState, move, ruleMode);
    boardState = result.nextBoard;
    lastMove = move;

    if (move.isCapture) {
      window.soundCtrl.playCapture();
    } else {
      window.soundCtrl.playMove();
    }

    if (result.crowned) {
      window.soundCtrl.playKing();
      if (currentPieceSkin === 'skin-graveyard-ghosts') {
        showToast('🎃 เข้าฮอสแล้ว! (สวมหัวฟักทองผีสิง)');
      } else {
        showToast('👑 เข้าฮอสแล้ว!');
      }
    }

    const fromNotation = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
    const toNotation = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
    const kingIcon = currentPieceSkin === 'skin-graveyard-ghosts' ? ' 🎃' : ' 👑';
    const moveText = `${currentTurn === 'red' ? 'แดง' : 'น้ำเงิน'}: ${fromNotation} ➜ ${toNotation}${move.isCapture ? ' (กิน)' : ''}${result.crowned ? kingIcon : ''}`;
    appendMoveHistory(moveText);

    if (result.canContinueJump) {
      activePiece = result.nextActivePiece;
    } else {
      activePiece = null;
      currentTurn = currentTurn === 'red' ? 'blue' : 'red';
    }

    selectedPiece = null;
    legalMoves = window.CheckersEngine.getAllLegalMoves(boardState, currentTurn, ruleMode, activePiece);

    renderBoard();
    updatePlayerBars();

    // Check game over
    const status = window.CheckersEngine.checkGameStatus(boardState, currentTurn, ruleMode, activePiece);
    if (status.isGameOver) {
      handleGameOver(status);
      return;
    }

    // Check if next turn belongs to AI
    if (gameMode === 'ai' && currentTurn === aiSide) {
      triggerAIMove();
    }
  }

  // --- CARTOON CHARACTER MODELS GENERATOR ---
  function isCartoonSkin(skin) {
    return ['skin-graveyard-ghosts', 'skin-nong-tk', 'skin-chibi-pets', 'skin-chibi-monsters', 'skin-chibi-ninjas'].includes(skin);
  }

  function getCartoonModelHtml(skin, color, isKing) {
    let svgContent = '';
    const crownHtml = isKing ? '<div class="cartoon-king-crown">👑</div>' : '';

    if (skin === 'skin-graveyard-ghosts') {
      const isRed = color === 'red';
      const bodyGrad1 = isRed ? '#fecdd3' : '#cffafe';
      const bodyGrad2 = isRed ? '#f43f5e' : '#06b6d4';
      const bodyGrad3 = isRed ? '#9f1239' : '#0e7490';
      const eyeColor = isRed ? '#ff0033' : '#00f0ff';
      const eyePupil = isRed ? '#ffe4e6' : '#ecfeff';
      const wispColor = isRed ? '#fb7185' : '#67e8f9';
      const kingShroud = isKing ? `
        <!-- Grim Reaper Shroud / Cloak -->
        <path d="M22,35 Q10,70 16,105 Q30,115 50,112 Q70,115 84,105 Q90,70 78,35 Z" fill="#090514" stroke="#4ade80" stroke-width="2.5"/>
        <path d="M26,38 Q16,68 22,98 Q50,105 78,98 Q84,68 74,38 Z" fill="#180e29"/>
      ` : '';

      // Pumpkin Head Jack-o'-lantern for Ghost King (แทนมงกุฎให้เข้ากับตรีมสุสานผี)
      const pumpkinHeadHtml = isKing ? `
        <div class="ghost-king-pumpkin">
          <svg viewBox="0 0 60 52" class="pumpkin-king-svg">
            <!-- Stem -->
            <path d="M28,14 Q32,4 38,6 L35,15 Z" fill="#15803d" stroke="#14532d" stroke-width="1.2"/>
            <!-- Pumpkin Lobes -->
            <ellipse cx="30" cy="32" rx="27" ry="19" fill="#ea580c"/>
            <ellipse cx="30" cy="32" rx="19" ry="20" fill="#f97316"/>
            <ellipse cx="30" cy="32" rx="9" ry="20.5" fill="#fb923c"/>
            <!-- Jack-O'-Lantern Carved Eyes with Eerie Yellow Glow -->
            <polygon points="19,26 25,26 22,20" fill="#fef08a"/>
            <polygon points="35,26 41,26 38,20" fill="#fef08a"/>
            <!-- Carved Nose -->
            <polygon points="30,27 28,31 32,31" fill="#fef08a"/>
            <!-- Carved Wicked Grin -->
            <path d="M17,35 Q30,46 43,35 L39,38 L36,35 L33,38 L30,35 L27,38 L24,35 L21,38 Z" fill="#fef08a" stroke="#7c2d12" stroke-width="0.8"/>
          </svg>
        </div>
      ` : '';

      return `
        <div class="ghost-character-wrapper">
          ${pumpkinHeadHtml}
          <svg viewBox="0 0 100 120" class="ghost-svg">
            <defs>
              <radialGradient id="ghostGrad_${color}" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="${bodyGrad1}"/>
                <stop offset="55%" stop-color="${bodyGrad2}"/>
                <stop offset="100%" stop-color="${bodyGrad3}"/>
              </radialGradient>
            </defs>

            <!-- Shadow underneath -->
            <ellipse cx="50" cy="114" rx="26" ry="6" fill="rgba(0,0,0,0.5)"/>

            ${kingShroud}

            <!-- Floating Wispy Ghost Body with Tail -->
            <path d="M24,55 C22,26 34,14 50,14 C66,14 78,26 76,55 C74,78 82,90 74,105 C68,116 56,104 50,112 C44,104 32,116 26,105 C18,90 26,78 24,55 Z" 
                  fill="url(#ghostGrad_${color})" 
                  stroke="rgba(255,255,255,0.4)" 
                  stroke-width="1.8"/>

            <!-- Ghost Hands floating -->
            <ellipse cx="20" cy="62" rx="7" ry="5" fill="${bodyGrad2}" transform="rotate(-25, 20, 62)"/>
            <ellipse cx="80" cy="62" rx="7" ry="5" fill="${bodyGrad2}" transform="rotate(25, 80, 62)"/>

            <!-- Big Glowing Soul Eyes -->
            <ellipse cx="40" cy="46" rx="6.5" ry="9" fill="#090514"/>
            <circle cx="40" cy="45" r="4.5" fill="${eyeColor}"/>
            <circle cx="38.5" cy="43" r="2" fill="${eyePupil}"/>

            <ellipse cx="60" cy="46" rx="6.5" ry="9" fill="#090514"/>
            <circle cx="60" cy="45" r="4.5" fill="${eyeColor}"/>
            <circle cx="58.5" cy="43" r="2" fill="${eyePupil}"/>

            <!-- Cheeks Blush -->
            <ellipse cx="32" cy="54" rx="4.5" ry="2.5" fill="${wispColor}" opacity="0.6"/>
            <ellipse cx="68" cy="54" rx="4.5" ry="2.5" fill="${wispColor}" opacity="0.6"/>

            <!-- Spooky Wavy Mouth -->
            <path d="M43,58 Q50,68 57,58 Q50,63 43,58 Z" fill="#090514"/>

            <!-- Mini floating will-o'-wisp sparks -->
            <circle cx="16" cy="38" r="3" fill="${wispColor}" opacity="0.8"/>
            <circle cx="84" cy="42" r="3" fill="${wispColor}" opacity="0.8"/>
            <circle cx="78" cy="85" r="2.5" fill="${wispColor}" opacity="0.7"/>
          </svg>
        </div>
      `;
    }

    if (skin === 'skin-nong-tk') {
      const primaryColor = color === 'red' ? '#dc2626' : '#2563eb';
      const secondaryColor = color === 'red' ? '#ef4444' : '#3b82f6';
      const darkColor = color === 'red' ? '#991b1b' : '#1e3a8a';
      const badgeText = color === 'red' ? '#dc2626' : '#2563eb';

      const capeSvg = isKing ? `
        <!-- Royal Hero Cape -->
        <path d="M20,68 Q8,105 18,114 Q50,120 82,114 Q92,105 80,68 Z" fill="${color === 'red' ? '#7f1d1d' : '#172554'}" stroke="#fbbf24" stroke-width="2.5"/>
        <path d="M25,70 Q14,104 23,110 Q50,116 77,110 Q86,104 75,70 Z" fill="${color === 'red' ? '#991b1b' : '#1e3a8a'}"/>
      ` : '';

      const tkCrown = isKing ? `<div class="nong-tk-crown">👑</div>` : '';

      return `
        <div class="nong-tk-wrapper">
          ${tkCrown}
          <svg viewBox="0 0 100 120" class="nong-tk-svg">
            <defs>
              <radialGradient id="tkHead_${color}" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#fff1ee"/>
                <stop offset="60%" stop-color="#fed7aa"/>
                <stop offset="100%" stop-color="#fdba74"/>
              </radialGradient>
              <linearGradient id="tkHoodie_${color}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${secondaryColor}"/>
                <stop offset="100%" stop-color="${darkColor}"/>
              </linearGradient>
            </defs>

            <!-- Shadow underneath -->
            <ellipse cx="50" cy="115" rx="30" ry="5.5" fill="rgba(0,0,0,0.5)"/>

            ${capeSvg}

            <!-- Sneakers / Shoes -->
            <ellipse cx="37" cy="111" rx="9" ry="5.5" fill="#0f172a"/>
            <ellipse cx="37" cy="110" rx="8" ry="3.5" fill="${secondaryColor}"/>
            <circle cx="37" cy="109" r="2" fill="#fff"/>
            <ellipse cx="63" cy="111" rx="9" ry="5.5" fill="#0f172a"/>
            <ellipse cx="63" cy="110" rx="8" ry="3.5" fill="${secondaryColor}"/>
            <circle cx="63" cy="109" r="2" fill="#fff"/>

            <!-- Legs / Streetwear Pants -->
            <rect x="32" y="94" width="10" height="15" rx="4" fill="#1e293b"/>
            <rect x="58" y="94" width="10" height="15" rx="4" fill="#1e293b"/>

            <!-- Torso / Hoodie -->
            <rect x="26" y="65" width="48" height="33" rx="10" fill="url(#tkHoodie_${color})"/>
            <!-- Hoodie Kangaroo Pocket -->
            <path d="M32,83 L68,83 L64,94 L36,94 Z" fill="${darkColor}"/>

            <!-- TK Brand Logo Plaque on Chest -->
            <rect x="35" y="69" width="30" height="12.5" rx="3.5" fill="#ffffff" stroke="${darkColor}" stroke-width="1.2"/>
            <text x="50" y="78.8" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="10" fill="${badgeText}" text-anchor="middle" letter-spacing="0.5">TK</text>

            <!-- Arms & Cute Hands -->
            <circle cx="21" cy="78" r="6.5" fill="#fed7aa"/>
            <circle cx="79" cy="78" r="6.5" fill="#fed7aa"/>

            <!-- Head -->
            <circle cx="50" cy="42" r="22.5" fill="url(#tkHead_${color})"/>

            <!-- Hair Strands -->
            <path d="M29,35 Q50,18 71,35 Q65,24 50,26 Q35,24 29,35 Z" fill="#78350f"/>

            <!-- Big Sparkling Anime Eyes -->
            <ellipse cx="41.5" cy="44" rx="4.8" ry="7" fill="#0f172a"/>
            <circle cx="40.5" cy="41.5" r="2.2" fill="#ffffff"/>
            <circle cx="43.5" cy="46" r="1.2" fill="${secondaryColor}"/>
            <ellipse cx="58.5" cy="44" rx="4.8" ry="7" fill="#0f172a"/>
            <circle cx="57.5" cy="41.5" r="2.2" fill="#ffffff"/>
            <circle cx="60.5" cy="46" r="1.2" fill="${secondaryColor}"/>

            <!-- Cheeks Blush -->
            <ellipse cx="34" cy="50" rx="4" ry="2.2" fill="#f43f5e" opacity="0.6"/>
            <ellipse cx="66" cy="50" rx="4" ry="2.2" fill="#f43f5e" opacity="0.6"/>

            <!-- Cute Confident Smile -->
            <path d="M45.5,51 Q50,56.5 54.5,51" fill="none" stroke="#7c2d12" stroke-width="2.2" stroke-linecap="round"/>

            <!-- Streetwear Cap with Visor -->
            <ellipse cx="50" cy="23" rx="19.5" ry="11" fill="${primaryColor}"/>
            <path d="M28,31 Q50,13 72,31 L68,36 Q50,23 32,36 Z" fill="${darkColor}"/>
            <!-- Cap Brim -->
            <path d="M31,31 Q50,21 69,31 Q50,27 31,31 Z" fill="#fbbf24"/>
            <!-- Cap TK Mini Logo -->
            <rect x="43.5" y="17" width="13" height="7.5" rx="2" fill="#ffffff"/>
            <text x="50" y="23" font-family="'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="5.5" fill="${primaryColor}" text-anchor="middle">TK</text>

            <!-- Gamer Headset with glowing pads -->
            <path d="M22,43 Q17,13 50,12 Q83,13 78,43" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
            <rect x="20" y="34" width="7" height="17" rx="3.5" fill="#fbbf24"/>
            <circle cx="23.5" cy="42.5" r="2.2" fill="${secondaryColor}"/>
            <rect x="73" y="34" width="7" height="17" rx="3.5" fill="#fbbf24"/>
            <circle cx="76.5" cy="42.5" r="2.2" fill="${secondaryColor}"/>
          </svg>
        </div>
      `;
    }

    if (skin === 'skin-chibi-pets') {
      if (color === 'red') {
        // Orange Neko Cat
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="catG" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#fdba74"/>
                <stop offset="60%" stop-color="#f97316"/>
                <stop offset="100%" stop-color="#ea580c"/>
              </radialGradient>
            </defs>
            <polygon points="18,36 10,12 36,22" fill="#c2410c"/>
            <polygon points="20,32 14,16 32,24" fill="#fda4af"/>
            <polygon points="82,36 90,12 64,22" fill="#c2410c"/>
            <polygon points="80,32 86,16 68,24" fill="#fda4af"/>
            <circle cx="50" cy="54" r="38" fill="url(#catG)"/>
            <ellipse cx="50" cy="64" rx="24" ry="16" fill="#fff7ed"/>
            <circle cx="36" cy="48" r="7" fill="#1e293b"/>
            <circle cx="34" cy="45" r="2.5" fill="#fff"/>
            <circle cx="38" cy="51" r="1.2" fill="#fff"/>
            <circle cx="64" cy="48" r="7" fill="#1e293b"/>
            <circle cx="62" cy="45" r="2.5" fill="#fff"/>
            <circle cx="66" cy="51" r="1.2" fill="#fff"/>
            <ellipse cx="26" cy="58" rx="5" ry="3.5" fill="#f43f5e" opacity="0.45"/>
            <ellipse cx="74" cy="58" rx="5" ry="3.5" fill="#f43f5e" opacity="0.45"/>
            <polygon points="50,57 46,53 54,53" fill="#e11d48"/>
            <path d="M44,62 Q48,66 50,62 Q52,66 56,62" fill="none" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="18" y1="56" x2="4" y2="52" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
            <line x1="18" y1="62" x2="4" y2="64" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
            <line x1="82" y1="56" x2="96" y2="52" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
            <line x1="82" y1="62" x2="96" y2="64" stroke="#c2410c" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      } else {
        // Shiba Inu Dog
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="shibaG" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="60%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#b45309"/>
              </radialGradient>
            </defs>
            <polygon points="18,38 12,14 36,26" fill="#92400e"/>
            <polygon points="20,34 16,18 32,26" fill="#fef3c7"/>
            <polygon points="82,38 88,14 64,26" fill="#92400e"/>
            <polygon points="80,34 84,18 68,26" fill="#fef3c7"/>
            <circle cx="50" cy="54" r="38" fill="url(#shibaG)"/>
            <ellipse cx="32" cy="62" rx="16" ry="14" fill="#fefce8"/>
            <ellipse cx="68" cy="62" rx="16" ry="14" fill="#fefce8"/>
            <ellipse cx="50" cy="64" rx="16" ry="14" fill="#fff"/>
            <circle cx="36" cy="46" r="6.5" fill="#1e293b"/>
            <circle cx="34" cy="44" r="2.2" fill="#fff"/>
            <circle cx="64" cy="46" r="6.5" fill="#1e293b"/>
            <circle cx="62" cy="44" r="2.2" fill="#fff"/>
            <circle cx="35" cy="35" r="3.5" fill="#fef9c3"/>
            <circle cx="65" cy="35" r="3.5" fill="#fef9c3"/>
            <ellipse cx="50" cy="58" rx="5.5" ry="4" fill="#1e293b"/>
            <path d="M47,65 Q50,75 53,65 Z" fill="#f43f5e"/>
          </svg>
        `;
      }
    } else if (skin === 'skin-chibi-monsters') {
      if (color === 'red') {
        // Fire Imp
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="fireImpG" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#fca5a5"/>
                <stop offset="50%" stop-color="#ef4444"/>
                <stop offset="100%" stop-color="#991b1b"/>
              </radialGradient>
            </defs>
            <path d="M26,32 Q14,8 32,14 Q30,26 35,30 Z" fill="#7f1d1d"/>
            <path d="M74,32 Q86,8 68,14 Q70,26 65,30 Z" fill="#7f1d1d"/>
            <circle cx="50" cy="54" r="38" fill="url(#fireImpG)"/>
            <ellipse cx="34" cy="49" rx="9" ry="12" fill="#450a0a"/>
            <circle cx="32" cy="44" r="4.5" fill="#fff"/>
            <circle cx="36" cy="54" r="2" fill="#f87171"/>
            <ellipse cx="66" cy="49" rx="9" ry="12" fill="#450a0a"/>
            <circle cx="64" cy="44" r="4.5" fill="#fff"/>
            <circle cx="68" cy="54" r="2" fill="#f87171"/>
            <ellipse cx="23" cy="59" rx="6" ry="4" fill="#b91c1c" opacity="0.6"/>
            <ellipse cx="77" cy="59" rx="6" ry="4" fill="#b91c1c" opacity="0.6"/>
            <path d="M43,62 Q50,71 57,62 Z" fill="#7f1d1d"/>
            <polygon points="46,62 49,62 47.5,66" fill="#fff"/>
          </svg>
        `;
      } else {
        // Frost Yeti
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="frostYetiG" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#bae6fd"/>
                <stop offset="50%" stop-color="#0ea5e9"/>
                <stop offset="100%" stop-color="#0369a1"/>
              </radialGradient>
            </defs>
            <polygon points="26,34 16,10 36,22" fill="#38bdf8"/>
            <polygon points="74,34 84,10 64,22" fill="#38bdf8"/>
            <circle cx="50" cy="54" r="38" fill="url(#frostYetiG)"/>
            <path d="M38,18 Q50,6 62,18 Q50,23 38,18 Z" fill="#f0f9ff"/>
            <ellipse cx="34" cy="49" rx="9" ry="12" fill="#082f49"/>
            <circle cx="32" cy="44" r="4.5" fill="#fff"/>
            <circle cx="36" cy="54" r="2" fill="#38bdf8"/>
            <ellipse cx="66" cy="49" rx="9" ry="12" fill="#082f49"/>
            <circle cx="64" cy="44" r="4.5" fill="#fff"/>
            <circle cx="68" cy="54" r="2" fill="#38bdf8"/>
            <ellipse cx="23" cy="59" rx="6" ry="4" fill="#0284c7" opacity="0.5"/>
            <ellipse cx="77" cy="59" rx="6" ry="4" fill="#0284c7" opacity="0.5"/>
            <path d="M43,62 Q50,71 57,62 Z" fill="#0c4a6e"/>
            <polygon points="46,62 49,62 47.5,66" fill="#fff"/>
          </svg>
        `;
      }
    } else if (skin === 'skin-chibi-ninjas') {
      if (color === 'red') {
        // Fire Ninja
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="ninjaRedG" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#f87171"/>
                <stop offset="50%" stop-color="#dc2626"/>
                <stop offset="100%" stop-color="#7f1d1d"/>
              </radialGradient>
            </defs>
            <path d="M78,32 Q96,28 92,45 Q84,36 78,38 Z" fill="#b91c1c"/>
            <circle cx="50" cy="54" r="38" fill="url(#ninjaRedG)"/>
            <rect x="22" y="40" width="56" height="20" rx="8" fill="#fde047"/>
            <ellipse cx="36" cy="50" rx="6" ry="5" fill="#1e293b"/>
            <circle cx="34" cy="48" r="2" fill="#fff"/>
            <ellipse cx="64" cy="50" rx="6" ry="5" fill="#1e293b"/>
            <circle cx="62" cy="48" r="2" fill="#fff"/>
            <line x1="28" y1="44" x2="42" y2="46" stroke="#854d0e" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="72" y1="44" x2="58" y2="46" stroke="#854d0e" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="50" cy="30" r="7" fill="#fbbf24"/>
            <circle cx="50" cy="30" r="4" fill="#d97706"/>
          </svg>
        `;
      } else {
        // Water Ninja
        svgContent = `
          <svg viewBox="0 0 100 100" class="cartoon-svg">
            <defs>
              <radialGradient id="ninjaBlueG" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#38bdf8"/>
                <stop offset="50%" stop-color="#0284c7"/>
                <stop offset="100%" stop-color="#075985"/>
              </radialGradient>
            </defs>
            <path d="M78,32 Q96,28 92,45 Q84,36 78,38 Z" fill="#0369a1"/>
            <circle cx="50" cy="54" r="38" fill="url(#ninjaBlueG)"/>
            <rect x="22" y="40" width="56" height="20" rx="8" fill="#bae6fd"/>
            <ellipse cx="36" cy="50" rx="6" ry="5" fill="#082f49"/>
            <circle cx="34" cy="48" r="2" fill="#fff"/>
            <ellipse cx="64" cy="50" rx="6" ry="5" fill="#082f49"/>
            <circle cx="62" cy="48" r="2" fill="#fff"/>
            <line x1="28" y1="44" x2="42" y2="46" stroke="#0369a1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="72" y1="44" x2="58" y2="46" stroke="#0369a1" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="50" cy="30" r="7" fill="#38bdf8"/>
            <circle cx="50" cy="30" r="4" fill="#0284c7"/>
          </svg>
        `;
      }
    }

    return `
      <div class="cartoon-pedestal"></div>
      <div class="cartoon-character-wrapper">
        ${crownHtml}
        ${svgContent}
      </div>
    `;
  }

  // --- BOARD RENDERING ---
  function renderBoard() {
    const wrapper = document.querySelector('.board-wrapper');
    if (wrapper) {
      BOARD_THEMES.forEach(t => wrapper.classList.remove(t));
      wrapper.classList.add(currentBoardTheme);
    }
    if (boardGrid) {
      PIECE_SKINS.forEach(s => boardGrid.classList.remove(s));
      boardGrid.classList.add(currentPieceSkin);
    }

    boardGrid.innerHTML = '';

    // ==========================================
    // 0. DOKAPON (โดกาปอง: สงครามมิตรภาพ)
    // ==========================================
    if (currentGameType === 'dokapon') {
      renderDokaponBoard();
      return;
    }

    // ==========================================
    // 1. CONNECT 4 (หมากเรียง 4) (6x7 Grid)
    // ==========================================
    if (currentGameType === 'connect4') {
      boardGrid.className = 'board connect4-mode';
      boardGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      boardGrid.style.gridTemplateRows = 'repeat(6, 1fr)';

      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          const square = document.createElement('div');
          square.className = 'square connect4-slot';
          square.dataset.r = r;
          square.dataset.c = c;

          if (lastMove && lastMove.to && lastMove.to.r === r && lastMove.to.c === c) {
            square.style.boxShadow = '0 0 14px #38bdf8';
          }

          const chip = boardState ? boardState[r][c] : null;
          if (chip) {
            const chipEl = document.createElement('div');
            const chipColor = (chip === 'R' || chip === 'red') ? 'red' : 'yellow';
            chipEl.className = `connect4-chip ${chipColor}`;
            square.appendChild(chipEl);
          }

          square.addEventListener('click', () => {
            onConnect4ColumnClick(c);
          });

          square.addEventListener('mouseenter', () => {
            document.querySelectorAll(`.connect4-slot[data-c="${c}"]`).forEach(el => el.classList.add('col-hover'));
          });
          square.addEventListener('mouseleave', () => {
            document.querySelectorAll(`.connect4-slot[data-c="${c}"]`).forEach(el => el.classList.remove('col-hover'));
          });

          boardGrid.appendChild(square);
        }
      }
      return;
    }

    // ==========================================
    // 2. OTHELLO (โอเทลโล่ / รีเวอร์ซี่) (8x8 Grid)
    // ==========================================
    if (currentGameType === 'othello') {
      boardGrid.className = 'board othello-mode';
      boardGrid.style.gridTemplateColumns = 'repeat(8, 1fr)';
      boardGrid.style.gridTemplateRows = 'repeat(8, 1fr)';

      const legalSet = new Set((legalMoves || []).map(m => `${m.r},${m.c}`));

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const square = document.createElement('div');
          square.className = 'square';
          square.dataset.r = r;
          square.dataset.c = c;

          if (lastMove && lastMove.to && lastMove.to.r === r && lastMove.to.c === c) {
            square.classList.add('last-move');
          }

          const disc = boardState ? boardState[r][c] : null;
          if (disc) {
            const discEl = document.createElement('div');
            discEl.className = `othello-disc ${disc === 'B' ? 'black' : 'white'}`;
            square.appendChild(discEl);
          } else if (legalSet.has(`${r},${c}`)) {
            const hint = document.createElement('div');
            hint.className = 'othello-hint-dot';
            square.appendChild(hint);

            square.addEventListener('click', () => {
              onOthelloSquareClick(r, c);
            });
          }

          boardGrid.appendChild(square);
        }
      }
      return;
    }

    // ==========================================
    // 3. GO & GOMOKU (9x9 Intersections)
    // ==========================================
    if (currentGameType === 'go' || currentGameType === 'gomoku') {
      const size = boardState ? boardState.length : 9;
      boardGrid.className = 'board go-mode';
      boardGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      boardGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`;

      const hoshiPoints = new Set(['2,2', '2,6', '6,2', '6,6', '4,4']);

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const square = document.createElement('div');
          square.className = 'square';
          square.dataset.r = r;
          square.dataset.c = c;

          // Hoshi (Star point)
          if (hoshiPoints.has(`${r},${c}`)) {
            square.classList.add('hoshi');
            const star = document.createElement('div');
            star.className = 'go-star-point';
            square.appendChild(star);
          }

          // Last move highlight
          if (lastMove && lastMove.to && lastMove.to.r === r && lastMove.to.c === c) {
            square.classList.add('last-move');
          }

          // Stone
          const stone = boardState ? boardState[r][c] : null;
          if (stone) {
            const stoneEl = document.createElement('div');
            stoneEl.className = `go-stone ${stone === 'B' ? 'black' : 'white'}`;
            square.appendChild(stoneEl);
          } else {
            // Empty intersection: click to place stone
            square.addEventListener('click', () => {
              if (currentGameType === 'go') {
                onGoIntersectionClick(r, c);
              } else {
                onGomokuIntersectionClick(r, c);
              }
            });
          }

          boardGrid.appendChild(square);
        }
      }
      return;
    }

    // ==========================================
    // 4. CHECKERS, CHESS, MAKRUK (8x8 Grid)
    // ==========================================
    boardGrid.className = `board ${currentPieceSkin || ''}`;
    boardGrid.style.gridTemplateColumns = 'repeat(8, 1fr)';
    boardGrid.style.gridTemplateRows = 'repeat(8, 1fr)';

    // Check if mandatory capture is forced (Checkers)
    const hasCaptures = legalMoves.some(m => m.isCapture);
    const capturePieces = new Set();
    if (hasCaptures && currentGameType === 'checkers') {
      legalMoves.forEach(m => {
        if (m.isCapture) capturePieces.add(`${m.from.r},${m.from.c}`);
      });
    }

    // Grid row/col iterations based on flip
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const r = isBoardFlipped ? (7 - i) : i;
        const c = isBoardFlipped ? (7 - j) : j;

        const isDarkSquare = (r + c) % 2 === 1;
        const square = document.createElement('div');
        square.className = `square ${isDarkSquare ? 'dark' : 'light'}`;
        square.dataset.r = r;
        square.dataset.c = c;

        // Last move highlight
        if (lastMove && lastMove.from && lastMove.to) {
          if ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c)) {
            square.classList.add('last-move');
          }
        }

        // Selected square highlight
        if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
          square.classList.add('selected');
        }

        // Render piece
        const rawPiece = boardState ? boardState[r][c] : null;

        // Check if King is in check highlight
        if (rawPiece) {
          if (currentGameType === 'chess' && window.ChessEngine && window.ChessEngine.isKingInCheck(boardState, currentTurn)) {
            const kingChar = currentTurn === 'red' ? 'K' : 'k';
            if (rawPiece === kingChar) square.classList.add('king-in-check');
          } else if (currentGameType === 'makruk' && window.MakrukEngine && window.MakrukEngine.isKingInCheck(boardState, currentTurn)) {
            const kingChar = currentTurn === 'red' ? 'K' : 'k';
            if (rawPiece === kingChar) square.classList.add('king-in-check');
          }
        }
        if (rawPiece) {
          if (currentGameType === 'chess') {
            const isWhite = rawPiece === rawPiece.toUpperCase();
            const pieceColor = isWhite ? 'red' : 'blue';
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${pieceColor}`;
            pieceEl.innerHTML = getChessPieceHtml(rawPiece);
            pieceEl.addEventListener('click', (e) => {
              e.stopPropagation();
              onPieceClick(r, c);
            });
            square.appendChild(pieceEl);
          } else if (currentGameType === 'makruk') {
            const isWhite = rawPiece === rawPiece.toUpperCase();
            const pieceColor = isWhite ? 'red' : 'blue';
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${pieceColor}`;
            pieceEl.innerHTML = getMakrukPieceHtml(rawPiece);
            pieceEl.addEventListener('click', (e) => {
              e.stopPropagation();
              onPieceClick(r, c);
            });
            square.appendChild(pieceEl);
          } else {
            // Checkers
            const piece = rawPiece;
            const pieceEl = document.createElement('div');
            pieceEl.className = `piece ${piece.color} ${piece.isKing ? 'king' : ''}`;
            
            if (capturePieces.has(`${r},${c}`)) {
              pieceEl.classList.add('must-capture');
            }

            if (isCartoonSkin(currentPieceSkin)) {
              pieceEl.innerHTML = getCartoonModelHtml(currentPieceSkin, piece.color, piece.isKing);
            } else {
              if (piece.isKing) {
                const crown = document.createElement('span');
                crown.className = 'crown-icon';
                if (currentPieceSkin === 'skin-crystal-gem') {
                  crown.textContent = '✨';
                } else if (currentPieceSkin === 'skin-ancient-coins') {
                  crown.textContent = '';
                } else {
                  crown.textContent = '👑';
                }
                pieceEl.appendChild(crown);
              }
            }

            pieceEl.addEventListener('click', (e) => {
              e.stopPropagation();
              onPieceClick(r, c);
            });

            square.appendChild(pieceEl);
          }
        }

        // Render valid move dot
        if (selectedPiece) {
          const validMove = legalMoves.find(m => 
            m.from && m.from.r === selectedPiece.r && m.from.c === selectedPiece.c &&
            m.to && m.to.r === r && m.to.c === c
          );

          if (validMove) {
            const dot = document.createElement('div');
            dot.className = `move-indicator ${validMove.isCapture || validMove.capture ? 'capture' : ''}`;
            square.appendChild(dot);

            square.addEventListener('click', () => {
              onSquareClick(r, c);
            });
          }
        }

        // Click empty square to deselect or move
        square.addEventListener('click', () => {
          onSquareClick(r, c);
        });

        boardGrid.appendChild(square);
      }
    }
  }

  // Go Intersection Click Handler
  function onGoIntersectionClick(r, c) {
    if (!boardState || boardState[r][c]) return;

    if (gameMode === 'online') {
      if (myRole !== currentTurn) {
        showToast('ยังไม่ถึงตาของคุณ');
        return;
      }
      socket.emit('make_move', { roomId: currentRoomId, move: { r, c } }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'ไม่สามารถวางหมากตรงนี้ได้');
        }
      });
    } else {
      executeLocalMove({ r, c });
    }
  }

  // Gomoku Intersection Click Handler
  function onGomokuIntersectionClick(r, c) {
    if (!boardState || boardState[r][c]) return;

    if (gameMode === 'online') {
      if (myRole !== currentTurn) {
        showToast('ยังไม่ถึงตาของคุณ');
        return;
      }
      socket.emit('make_move', { roomId: currentRoomId, move: { r, c } }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'ไม่สามารถวางหมากตรงนี้ได้');
        }
      });
    } else {
      executeLocalMove({ r, c });
    }
  }

  // Othello Square Click Handler
  function onOthelloSquareClick(r, c) {
    if (!boardState) return;

    if (gameMode === 'online') {
      if (myRole !== currentTurn) {
        showToast('ยังไม่ถึงตาของคุณ');
        return;
      }
      socket.emit('make_move', { roomId: currentRoomId, move: { r, c } }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'ไม่สามารถวางหมากตรงนี้ได้');
        }
      });
    } else {
      executeLocalMove({ r, c });
    }
  }

  // Connect 4 Column Click Handler
  function onConnect4ColumnClick(col) {
    if (!boardState) return;

    if (gameMode === 'online') {
      if (myRole !== currentTurn) {
        showToast('ยังไม่ถึงตาของคุณ');
        return;
      }
      socket.emit('make_move', { roomId: currentRoomId, move: { col } }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'แถวนี้เต็มแล้ว');
        }
      });
    } else {
      executeLocalMove({ col });
    }
  }

  // ==========================================
  // DOKAPON ACTIONS & BOARD RENDERING
  // ==========================================
  const DOKAPON_COORDS = [
    { r: 0, c: 0 }, // 0: ปราสาทหลวง
    { r: 0, c: 1 }, // 1: มอนสเตอร์ป่าก็อบลิน
    { r: 0, c: 2 }, // 2: เมืองโอ๊คแลนด์
    { r: 0, c: 3 }, // 3: หีบสมบัติ
    { r: 0, c: 4 }, // 4: ร้านค้าไอเทม
    { r: 1, c: 4 }, // 5: ถ้ำค้างคาวผี
    { r: 2, c: 4 }, // 6: เมืองซันเวล
    { r: 3, c: 4 }, // 7: สุสานต้องสาป
    { r: 4, c: 4 }, // 8: บึงพิษโคโบลด์
    { r: 4, c: 3 }, // 9: เมืองคริสตัล
    { r: 4, c: 2 }, // 10: หีบสมบัติโบราณ
    { r: 4, c: 1 }, // 11: ร้านอาวุธและยา
    { r: 4, c: 0 }, // 12: รังโกเลมหิน
    { r: 3, c: 0 }, // 13: เมืองเอเมอรัลด์
    { r: 2, c: 0 }, // 14: ยอดเขาไวเวิร์น
    { r: 1, c: 0 }  // 15: เมืองดราก้อนคีป
  ];

  function executeDokaponAction(action) {
    if (!boardState) return;

    if (gameMode === 'online') {
      socket.emit('make_move', { roomId: currentRoomId, move: action }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'ดำเนินการไม่สำเร็จ');
        }
      });
      return;
    }

    // Local or AI Mode
    const engine = window.DokaponEngine;
    let actor = currentTurn;
    if (action.type === 'battle_action' && boardState.battle) {
      const b = boardState.battle;
      actor = b.isPvP ? ((b.turnSide === 'attacker') ? b.attacker : b.defender) : b.attacker;
    } else if (action.type === 'punish' && boardState.punish) {
      actor = boardState.punish.winner;
    } else if (action.type === 'shop_buy' || action.type === 'shop_leave') {
      if (boardState.shop) actor = boardState.shop.player;
    }
    let res = { success: false };

    if (action.type === 'roll') {
      res = engine.rollSpinner(boardState, actor);
    } else if (action.type === 'battle_action') {
      res = engine.resolveBattleTurn(boardState, actor, action.action);
    } else if (action.type === 'punish') {
      res = engine.applyPunishment(boardState, actor, action.choice);
    } else if (action.type === 'shop_buy') {
      res = engine.buyShopItem(boardState, actor, action.itemId);
    } else if (action.type === 'shop_leave') {
      res = engine.leaveShop(boardState, actor);
    }

    if (!res.success) {
      if (res.error) showToast(res.error);
      return;
    }

    currentTurn = boardState.turn;
    window.soundCtrl.playMove();
    renderBoard();
    updatePlayerBars();

    // Check Victory
    if (boardState.phase === 'game_over') {
      window.soundCtrl.playWin();
      showToast(boardState.winReason);
      return;
    }

    // If AI Mode and AI needs to act:
    if (gameMode === 'ai' && currentGameType === 'dokapon') {
      if (isAIDokaponTurn()) {
        setTimeout(() => {
          triggerAIMove();
        }, 600);
      }
    }
  }

  function renderDokaponBoard() {
    boardGrid.className = 'board dokapon-mode';
    boardGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    boardGrid.style.gridTemplateRows = 'repeat(5, 1fr)';

    const state = boardState;
    if (!state || !state.players) return;

    const engine = window.DokaponEngine;
    const mapNodes = engine.MAP_NODES;

    // Render 16 Outer Track Tiles
    mapNodes.forEach((node, idx) => {
      const coord = DOKAPON_COORDS[idx];
      if (!coord) return;

      const tile = document.createElement('div');
      tile.className = `dokapon-tile tile-${node.type}`;
      tile.style.gridColumn = String(coord.c + 1);
      tile.style.gridRow = String(coord.r + 1);

      let ownerClass = '';
      let badgeText = '';
      if (node.type === 'town' && node.townId) {
        const town = state.towns[node.townId];
        if (town && town.owner) {
          ownerClass = `owned-${town.owner}`;
          tile.classList.add(ownerClass);
          badgeText = town.owner === 'red' ? '🔴 ครอง' : '🔵 ครอง';
        } else {
          badgeText = `${town.price}G`;
        }
      } else if (node.type === 'castle') {
        badgeText = 'HEAL';
      } else if (node.type === 'shop') {
        badgeText = 'SHOP';
      }

      // Icon & Name
      const icon = node.name.split(' ')[0] || '📍';
      const cleanName = node.name.replace(/^[^\s]+\s+/, '');

      tile.innerHTML = `
        <div class="dokapon-tile-icon">${icon}</div>
        <div class="dokapon-tile-name">${cleanName}</div>
        ${badgeText ? `<div class="dokapon-tile-badge">${badgeText}</div>` : ''}
      `;

      // Red Player Pawn
      if (state.players.red && state.players.red.pos === node.id) {
        const redPawn = document.createElement('div');
        redPawn.className = 'dokapon-pawn pawn-red';
        redPawn.textContent = getAvatarIcon(state.players.red.avatar || 'cat_ninja');
        redPawn.title = `${state.players.red.name} (HP: ${state.players.red.hp}/${state.players.red.maxHp})`;
        tile.appendChild(redPawn);
      }

      // Blue Player Pawn
      if (state.players.blue && state.players.blue.pos === node.id) {
        const bluePawn = document.createElement('div');
        bluePawn.className = 'dokapon-pawn pawn-blue';
        bluePawn.textContent = getAvatarIcon(state.players.blue.avatar || 'cyber_fox');
        bluePawn.title = `${state.players.blue.name} (HP: ${state.players.blue.hp}/${state.players.blue.maxHp})`;
        tile.appendChild(bluePawn);
      }

      tile.addEventListener('click', () => {
        showToast(`${node.name}: ${node.desc}`);
      });

      boardGrid.appendChild(tile);
    });

    // Render Center Stage (Inner 3x3)
    const center = document.createElement('div');
    center.className = 'dokapon-center-stage';
    center.style.gridColumn = '2 / span 3';
    center.style.gridRow = '2 / span 3';

    // Check my role permission
    const isMyTurn = (gameMode === 'online') ? (myRole === currentTurn) : (gameMode === 'ai' ? currentTurn !== aiSide : true);

    // 1. ROLL PHASE
    if (state.phase === 'roll') {
      const turnLabel = currentTurn === 'red' ? '🔴 ตาของผู้เล่นแดง' : '🔵 ตาของผู้เล่นน้ำเงิน';
      const pR = state.players.red;
      const pB = state.players.blue;
      center.innerHTML = `
        <div style="font-size: 11px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; margin-bottom: 2px;">
          🏰 DOKAPON • รอบที่ ${state.round} / ${state.maxRounds || 20}
        </div>
        <div style="font-size: 10px; color: #fde047; margin-bottom: 4px;">
          🎯 เป้าหมาย: ${ (state.targetGold || 10000).toLocaleString() }G หรือยึดครบ 5 เมือง
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">
          ${turnLabel}
        </div>
        ${state.lastRoll ? `<div style="font-size: 12px; color: #cbd5e1; margin-bottom: 4px;">ผลทอยลูกเต๋า: <strong style="font-size: 20px; color: #fde047;">${state.lastRoll}</strong></div>` : ''}
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; line-height: 1.3; max-height: 38px; overflow: hidden;">
          ${escapeHtml(state.eventMessage || '')}
        </div>
        <button class="btn-dokapon-spin" id="btnDokaponSpin" ${!isMyTurn ? 'disabled' : ''}>
          <span>🎲</span> หมุนวงล้อลูกเต๋า (SPIN)
        </button>
      `;

      center.querySelector('#btnDokaponSpin')?.addEventListener('click', () => {
        executeDokaponAction({ type: 'roll' });
      });
    }
    // 2. BATTLE PHASE
    else if (state.phase === 'battle' && state.battle) {
      const b = state.battle;
      const atkPlayer = state.players[b.attacker];
      const defTarget = b.isPvP ? state.players[b.defender] : b.monster;
      const defName = defTarget ? defTarget.name : 'ศัตรู';
      const defHp = defTarget ? defTarget.hp : 0;
      const defMaxHp = defTarget ? (defTarget.maxHp || 100) : 100;

      let isAttackerMe = false;
      let isDefenderMe = false;

      if (b.isPvP) {
        isAttackerMe = (gameMode === 'online') ? (myRole === b.attacker) : (gameMode === 'ai' ? b.attacker !== aiSide : currentTurn === b.attacker);
        isDefenderMe = (gameMode === 'online') ? (myRole === b.defender) : (gameMode === 'ai' ? b.defender !== aiSide : currentTurn === b.defender);
      } else {
        // PvE Against Monster
        const isPlayerTurn = (gameMode === 'online') ? (myRole === b.attacker) : (gameMode === 'ai' ? b.attacker !== aiSide : true);
        if (!b.monsterAttacking) {
          isAttackerMe = isPlayerTurn; // Player attacks
        } else {
          isDefenderMe = isPlayerTurn; // Player defends against monster!
        }
      }

      const waitingForOther = (b.turnSide === 'attacker' && !isAttackerMe) || (b.turnSide === 'defender' && !isDefenderMe);

      center.innerHTML = `
        <div class="dokapon-battle-box">
          <div style="font-size: 11px; font-weight: 800; color: ${b.monsterAttacking ? '#f59e0b' : '#f43f5e'}; text-transform: uppercase;">
            ${b.monsterAttacking ? '⚠️ [ฝ่ายรับ] ศัตรูกำลังสวนกลับ!' : `⚔️ BATTLE ARENA (ยกที่ ${b.round})`}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
            <div style="text-align: left; max-width: 48%;">
              <strong style="color: #f87171;">${escapeHtml(atkPlayer?.name || 'ฝ่ายรุก')}</strong>
              <div class="battle-hp-bar"><div class="battle-hp-fill" style="width: ${Math.max(0, Math.min(100, (atkPlayer?.hp || 0) * 100 / (atkPlayer?.maxHp || 100)))}%;"></div></div>
              <span style="font-size: 10px; color: #cbd5e1;">HP: ${atkPlayer?.hp}/${atkPlayer?.maxHp}</span>
            </div>
            <span style="font-size: 14px; font-weight: 800; color: #fbbf24;">VS</span>
            <div style="text-align: right; max-width: 48%;">
              <strong style="color: #60a5fa;">${escapeHtml(defName)}</strong>
              <div class="battle-hp-bar"><div class="battle-hp-fill" style="width: ${Math.max(0, Math.min(100, defHp * 100 / defMaxHp))}%;"></div></div>
              <span style="font-size: 10px; color: #cbd5e1;">HP: ${defHp}/${defMaxHp}</span>
            </div>
          </div>

          <div style="font-size: 10px; color: #e2e8f0; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; margin: 2px 0; max-height: 28px; overflow: hidden;">
            ${escapeHtml(b.log && b.log[0] ? b.log[0] : 'ประลองยุทธ์!')}
          </div>

          ${waitingForOther ? `
            <div style="font-size: 12px; color: #fbbf24; padding: 10px; font-weight: 700;">
              ⏳ รอ ${b.turnSide === 'attacker' ? atkPlayer?.name : defName} เลือกคำสั่งต่อสู้...
            </div>
          ` : (b.turnSide === 'attacker' ? `
            <div class="battle-cards-grid">
              <button class="battle-card-btn card-attack" data-act="attack"><span>⚔️</span>โจมตีปกติ</button>
              <button class="battle-card-btn card-strike" data-act="strike"><span>💥</span>ท่าไม้ตาย!</button>
              <button class="battle-card-btn card-magic" data-act="magic"><span>🔮</span>เวทมนตร์</button>
              <button class="battle-card-btn card-item" data-act="item"><span>🧪</span>ใช้ยา HP</button>
            </div>
          ` : `
            <div class="battle-cards-grid">
              <button class="battle-card-btn card-defend" data-act="defend"><span>🛡️</span>ยกโล่กัน</button>
              <button class="battle-card-btn card-counter" data-act="counter"><span>🔄</span>สวนกลับ!</button>
              <button class="battle-card-btn card-mgguard" data-act="mg_guard"><span>🪄</span>กันเวทย์</button>
              <button class="battle-card-btn card-surrender" data-act="surrender"><span>🏃</span>ยอมจำนน</button>
            </div>
          `)}
        </div>
      `;

      center.querySelectorAll('.battle-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          executeDokaponAction({ type: 'battle_action', action: btn.dataset.act });
        });
      });
    }
    // 3. SHOP PHASE
    else if (state.phase === 'shop' && state.shop) {
      const p = state.players[state.shop.player];
      const isShopMe = (gameMode === 'online') ? (myRole === state.shop.player) : (gameMode === 'ai' ? state.shop.player !== aiSide : true);

      center.innerHTML = `
        <div style="width: 100%;">
          <div style="font-size: 12px; font-weight: 800; color: #c084fc; margin-bottom: 4px;">
            🏪 ร้านค้าอาณาจักร (เงินของคุณ: ${p?.gold || 0}G)
          </div>
          <div class="dokapon-action-list" style="max-height: 120px; overflow-y: auto;">
            ${(state.shop.items || []).map(item => `
              <div class="dokapon-action-item">
                <div style="text-align: left;">
                  <strong style="font-size: 11px;">${item.name}</strong>
                  <div style="font-size: 9px; color: #94a3b8;">${item.desc}</div>
                </div>
                <button class="control-btn primary shop-buy-btn" data-id="${item.id}" ${(!isShopMe || (p && p.gold < item.price)) ? 'disabled' : ''} style="padding: 3px 8px; font-size: 11px;">
                  ${item.price}G
                </button>
              </div>
            `).join('')}
          </div>
          <button class="control-btn danger" id="btnLeaveShop" ${!isShopMe ? 'disabled' : ''} style="width: 100%; margin-top: 6px; padding: 5px;">
            🚪 ออกจากร้าน (เดินต่อ)
          </button>
        </div>
      `;

      center.querySelectorAll('.shop-buy-btn').forEach(b => {
        b.addEventListener('click', () => {
          executeDokaponAction({ type: 'shop_buy', itemId: b.dataset.id });
        });
      });

      center.querySelector('#btnLeaveShop')?.addEventListener('click', () => {
        executeDokaponAction({ type: 'shop_leave' });
      });
    }
    // 4. PUNISH PHASE
    else if (state.phase === 'punish' && state.punish) {
      const winner = state.players[state.punish.winner];
      const loser = state.players[state.punish.loser];
      const isWinnerMe = (gameMode === 'online') ? (myRole === state.punish.winner) : (gameMode === 'ai' ? state.punish.winner !== aiSide : true);

      center.innerHTML = `
        <div style="width: 100%;">
          <div style="font-size: 12px; font-weight: 800; color: #fbbf24; margin-bottom: 4px;">
            👑 ${escapeHtml(winner?.name)} ชนะการประลอง!
          </div>
          <div style="font-size: 10px; color: #e2e8f0; margin-bottom: 6px;">
            เลือกบทลงโทษผู้แพ้ (${escapeHtml(loser?.name)}):
          </div>
          <div class="dokapon-action-list">
            ${(state.punish.options || []).map(opt => `
              <div class="dokapon-action-item punish-opt-btn" data-choice="${opt.id}" style="${!isWinnerMe ? 'opacity: 0.5; pointer-events: none;' : ''}">
                <div style="text-align: left;">
                  <strong style="font-size: 11px; color: #fde047;">${opt.label}</strong>
                  <div style="font-size: 9px; color: #94a3b8;">${opt.desc}</div>
                </div>
                <span style="font-size: 14px;">⚡</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      center.querySelectorAll('.punish-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          executeDokaponAction({ type: 'punish', choice: btn.dataset.choice });
        });
      });
    }
    // 5. GAME OVER
    else if (state.phase === 'game_over') {
      const winP = state.players[state.winner];
      center.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 4px;">👑</div>
        <div style="font-size: 16px; font-weight: 800; color: #fde047; margin-bottom: 4px;">
          ${escapeHtml(winP?.name || 'ผู้ชนะ')} ครองราชย์แห่งโดกาปอง!
        </div>
        <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.4;">
          ${escapeHtml(state.winReason || 'สะสมทรัพย์สินครบตามเงื่อนไข')}
        </div>
        <button class="control-btn primary" id="btnDokaponRematch" style="padding: 6px 16px; font-size: 13px;">
          🔄 เล่นใหม่อีกรอบ
        </button>
      `;

      center.querySelector('#btnDokaponRematch')?.addEventListener('click', () => {
        if (gameMode === 'online') {
          socket.emit('request_rematch', { roomId: currentRoomId });
        } else if (gameMode === 'ai') {
          startAIGame(aiDifficulty, myRole);
        } else {
          startLocalGame();
        }
      });
    }

    boardGrid.appendChild(center);
  }

  // Piece Click Handler
  function onPieceClick(r, c) {
    if (!boardState) return;

    if (currentGameType === 'go' || currentGameType === 'gomoku' || currentGameType === 'othello' || currentGameType === 'connect4' || currentGameType === 'dokapon') return;

    // 1. If we already have a piece selected: Check if clicking (r, c) is a valid move (e.g. CAPTURING this piece!)
    if (selectedPiece && (selectedPiece.r !== r || selectedPiece.c !== c)) {
      const isLegalMove = legalMoves.some(m => 
        m.from && m.from.r === selectedPiece.r && m.from.c === selectedPiece.c &&
        m.to && m.to.r === r && m.to.c === c
      );
      if (isLegalMove) {
        onSquareClick(r, c);
        return;
      }
    }

    // 2. Toggle deselect: If clicking the currently selected piece, cancel selection
    if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
      selectedPiece = null;
      renderBoard();
      return;
    }

    let pieceColor = null;
    if (currentGameType === 'chess' || currentGameType === 'makruk') {
      const piece = boardState[r][c];
      if (!piece) return;
      pieceColor = piece === piece.toUpperCase() ? 'red' : 'blue';
    } else {
      const piece = boardState[r][c];
      if (!piece) return;
      pieceColor = piece.color;
    }

    // In online mode: only move your pieces
    if (gameMode === 'online') {
      if (myRole !== currentTurn) {
        showToast('ยังไม่ถึงตาของคุณ');
        return;
      }
      if (pieceColor !== myRole) {
        return;
      }
    } else if (gameMode === 'ai') {
      if (currentTurn === aiSide) return;
      if (pieceColor !== myRole) return;
    } else if (gameMode === 'pass_play') {
      if (pieceColor !== currentTurn) return;
    }

    // In multi-jump (Checkers):
    if (currentGameType === 'checkers' && activePiece && (activePiece.r !== r || activePiece.c !== c)) {
      showToast('ต้องกินต่อเนื่องด้วยตัวเดิมตามกติกา!');
      return;
    }

    // Check if this piece has legal moves
    const pieceMoves = legalMoves.filter(m => m.from && m.from.r === r && m.from.c === c);
    if (pieceMoves.length === 0) {
      if (currentGameType === 'checkers' && legalMoves.some(m => m.isCapture)) {
        showToast('กติกากินบังคับ: ต้องเดินตัวที่มีตากิน!');
      } else if (currentGameType === 'chess' && window.ChessEngine && window.ChessEngine.isKingInCheck(boardState, currentTurn)) {
        showToast('⚠️ ขุนกำลังถูกรุก! ต้องเดินเพื่อแก้รุกเท่านั้น');
      } else if (currentGameType === 'makruk' && window.MakrukEngine && window.MakrukEngine.isKingInCheck(boardState, currentTurn)) {
        showToast('⚠️ ขุนกำลังถูกรุก! ต้องเดินเพื่อแก้รุกเท่านั้น');
      } else {
        showToast('หมากตัวนี้ไม่มีตาเดินที่ถูกต้อง');
      }
      return;
    }

    selectedPiece = { r, c };
    renderBoard();
  }

  // Target Square Click Handler
  function onSquareClick(r, c) {
    if (!selectedPiece) return;

    const move = legalMoves.find(m => 
      m.from && m.from.r === selectedPiece.r && m.from.c === selectedPiece.c &&
      m.to && m.to.r === r && m.to.c === c
    );

    if (!move) {
      if (!boardState[r][c]) {
        selectedPiece = null;
        renderBoard();
      }
      return;
    }

    // Execute Move!
    if (gameMode === 'online') {
      socket.emit('make_move', { roomId: currentRoomId, move }, (res) => {
        if (res && !res.success) {
          showToast(res.error || 'เดินไม่สำเร็จ');
        }
      });
      selectedPiece = null;
      renderBoard();
    } else {
      executeLocalMove(move);
    }
  }

  // --- PLAYER BARS UPDATE ---
  function updatePlayerBars(playersData) {
    if (!boardState) return;

    if (currentGameType === 'dokapon') {
      const topIsBlue = !isBoardFlipped;
      const topColor = topIsBlue ? 'blue' : 'red';
      const bottomColor = topIsBlue ? 'red' : 'blue';
      const pTop = boardState.players ? boardState.players[topColor] : null;
      const pBot = boardState.players ? boardState.players[bottomColor] : null;

      if (pTop) {
        topPiecesCount.textContent = `Lv.${pTop.level || 1} | HP:${pTop.hp}/${pTop.maxHp} | 💰${pTop.gold}G | 🏰${pTop.towns.length}`;
      }
      if (pBot) {
        bottomPiecesCount.textContent = `Lv.${pBot.level || 1} | HP:${pBot.hp}/${pBot.maxHp} | 💰${pBot.gold}G | 🏰${pBot.towns.length}`;
      }

      // Active turn highlight
      if (currentTurn === topColor) {
        topPlayerBar.classList.add('active-turn');
        bottomPlayerBar.classList.remove('active-turn');
        topPlayerStatus.textContent = 'กำลังเดิน...';
        bottomPlayerStatus.textContent = 'รอคู่แข่ง';
      } else {
        bottomPlayerBar.classList.add('active-turn');
        topPlayerBar.classList.remove('active-turn');
        bottomPlayerStatus.textContent = 'ตาของคุณ!';
        topPlayerStatus.textContent = 'รอคู่แข่ง';
      }

      const topChip = document.getElementById('topPlayerRankChip');
      const botChip = document.getElementById('bottomPlayerRankChip');
      if (playersData) {
        const tP = playersData[topColor];
        const bP = playersData[bottomColor];
        if (tP) topPlayerName.textContent = tP.name;
        if (bP) bottomPlayerName.textContent = bP.name;
      }
      return;
    }

    let redCount = 0;
    let blueCount = 0;
    const numRows = boardState.length;
    const numCols = boardState[0] ? boardState[0].length : numRows;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const p = boardState[r][c];
        if (p) {
          if (currentGameType === 'chess' || currentGameType === 'makruk') {
            if (p === p.toUpperCase()) redCount++;
            else blueCount++;
          } else if (currentGameType === 'go' || currentGameType === 'gomoku' || currentGameType === 'othello') {
            if (p === 'B') redCount++;
            else blueCount++;
          } else if (currentGameType === 'connect4') {
            if (p === 'R' || p === 'red') redCount++;
            else blueCount++;
          } else {
            if (p.color === 'red') redCount++;
            else blueCount++;
          }
        }
      }
    }

    const topIsBlue = !isBoardFlipped;
    const topColor = topIsBlue ? 'blue' : 'red';
    const bottomColor = topIsBlue ? 'red' : 'blue';

    // Counts
    topPiecesCount.textContent = topColor === 'blue' ? blueCount : redCount;
    bottomPiecesCount.textContent = bottomColor === 'red' ? redCount : blueCount;

    // Active turn highlight
    if (currentTurn === topColor) {
      topPlayerBar.classList.add('active-turn');
      bottomPlayerBar.classList.remove('active-turn');
      topPlayerStatus.textContent = 'กำลังเดิน...';
      bottomPlayerStatus.textContent = 'รอคู่แข่ง';
    } else {
      bottomPlayerBar.classList.add('active-turn');
      topPlayerBar.classList.remove('active-turn');
      bottomPlayerStatus.textContent = 'ตาของคุณ!';
      topPlayerStatus.textContent = 'รอคู่แข่ง';
    }

    // Names & Rank Chips
    const topChip = document.getElementById('topPlayerRankChip');
    const botChip = document.getElementById('bottomPlayerRankChip');

    if (playersData) {
      const topP = playersData[topColor];
      const botP = playersData[bottomColor];
      if (topP) {
        topPlayerName.textContent = topP.name;
        if (topP.rank && topChip) {
          topChip.style.display = 'inline-flex';
          topChip.textContent = `${topP.rank.badge} ${topP.mmr}`;
          topChip.style.borderColor = topP.rank.color;
        }
        const topFrame = document.getElementById('topPlayerAvatarFrame');
        const topIcon = document.getElementById('topPlayerAvatarIcon');
        if (topFrame) topFrame.className = `in-game-avatar-frame ${topP.frame || 'frame_wood'}`;
        if (topIcon) topIcon.textContent = getAvatarIcon(topP.avatar || 'cyber_fox');
      }
      if (botP) {
        bottomPlayerName.textContent = botP.name;
        if (botP.rank && botChip) {
          botChip.textContent = `${botP.rank.badge} ${botP.mmr}`;
          botChip.style.borderColor = botP.rank.color;
        }
        const botFrame = document.getElementById('bottomPlayerAvatarFrame');
        const botIcon = document.getElementById('bottomPlayerAvatarIcon');
        if (botFrame) botFrame.className = `in-game-avatar-frame ${botP.frame || currentUser?.frame || 'frame_wood'}`;
        if (botIcon) botIcon.textContent = getAvatarIcon(botP.avatar || currentUser?.avatar || 'cat_ninja');
      }
    } else if (gameMode === 'ai') {
      const topFrame = document.getElementById('topPlayerAvatarFrame');
      const topIcon = document.getElementById('topPlayerAvatarIcon');
      if (topFrame) topFrame.className = 'in-game-avatar-frame frame_neon';
      if (topIcon) topIcon.textContent = '🤖';

      const botFrame = document.getElementById('bottomPlayerAvatarFrame');
      const botIcon = document.getElementById('bottomPlayerAvatarIcon');
      if (botFrame) botFrame.className = `in-game-avatar-frame ${currentUser?.frame || 'frame_wood'}`;
      if (botIcon) botIcon.textContent = getAvatarIcon(currentUser?.avatar || 'cat_ninja');
      if (topChip) {
        const aiRank = window.RankSystem.getRankFromMmr(aiDifficulty === 'hard' ? 1800 : (aiDifficulty === 'medium' ? 1400 : 1100));
        topChip.style.display = 'inline-flex';
        topChip.textContent = `${aiRank.badge} ${aiRank.mmr}`;
        topChip.style.borderColor = aiRank.color;
      }
      if (botChip) {
        const myRank = getPlayerRank();
        botChip.textContent = `${myRank.badge} ${myRank.mmr}`;
        botChip.style.borderColor = myRank.color;
      }
    }
  }

  // --- RANK & STATS UI HELPERS ---
  function getPlayerRank() {
    return window.RankSystem.getRankFromMmr(playerStats.mmr);
  }

  function updateHeaderRankUI() {
    const rank = getPlayerRank();
    const badgeEl = document.getElementById('headerRankBadge');
    const titleEl = document.getElementById('headerRankTitle');
    const rpEl = document.getElementById('headerRankRp');
    if (badgeEl) badgeEl.textContent = rank.badge;
    if (titleEl) titleEl.textContent = rank.name;
    if (rpEl) rpEl.textContent = `${rank.mmr.toLocaleString()} RP`;

    const botChip = document.getElementById('bottomPlayerRankChip');
    if (botChip) {
      botChip.textContent = `${rank.badge} ${rank.mmr}`;
      botChip.style.borderColor = rank.color;
    }
  }

  function renderRankModal() {
    const rank = getPlayerRank();
    const heroBadge = document.getElementById('myRankHeroBadge');
    const heroTier = document.getElementById('myRankHeroTier');
    const heroMmr = document.getElementById('myRankHeroMmr');
    const heroNext = document.getElementById('myRankHeroNextTier');
    const progressBar = document.getElementById('myTierProgressBar');
    const percentLabel = document.getElementById('tierBarPercentLabel');
    const inputName = document.getElementById('inputProfileName');

    if (heroBadge) heroBadge.textContent = rank.badge;
    if (heroTier) {
      heroTier.textContent = rank.name;
      heroTier.style.color = rank.color;
    }
    if (heroMmr) heroMmr.textContent = rank.mmr.toLocaleString();
    if (heroNext) {
      if (rank.nextTierName === 'ระดับสูงสุด') {
        heroNext.textContent = '🌟 คุณอยู่ในระดับสูงสุด (เซียนหมากฮอสสยาม)';
      } else {
        heroNext.textContent = `ต้องการอีก ${rank.neededMmr} RP เพื่อเลื่อนยศสู่ ${rank.nextTierName}`;
      }
    }
    if (progressBar) progressBar.style.width = `${rank.progress}%`;
    if (percentLabel) percentLabel.textContent = `${rank.progress}%`;
    if (inputName) inputName.value = playerStats.name;

    // Stats Cards
    const totalMatches = playerStats.matches || 0;
    const wins = playerStats.wins || 0;
    const losses = playerStats.losses || 0;
    const draws = playerStats.draws || 0;

    document.getElementById('statMatches').textContent = totalMatches;
    document.getElementById('statRecord').textContent = `${wins}W - ${losses}L`;
    document.getElementById('statDraws').textContent = draws;

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    document.getElementById('statWinRate').textContent = `${winRate}%`;
    document.getElementById('statStreak').textContent = playerStats.streak || 0;
    document.getElementById('statBestStreak').textContent = playerStats.bestStreak || 0;
    document.getElementById('statPiecesCaptured').textContent = playerStats.piecesCaptured || 0;
    document.getElementById('statKingsCrowned').textContent = playerStats.kingsCrowned || 0;

    renderMatchHistory();
  }

  function renderMatchHistory() {
    const listEl = document.getElementById('matchHistoryList');
    if (!listEl) return;
    if (!playerStats.history || playerStats.history.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 30px;">ยังไม่มีประวัติการแข่งขัน เริ่มเล่นเลย!</div>';
      return;
    }

    listEl.innerHTML = playerStats.history.map(item => {
      const isWin = item.result === 'win';
      const isDraw = item.result === 'draw';
      const deltaStr = item.change > 0 ? `+${item.change} RP` : `${item.change} RP`;
      const badgeClass = isWin ? 'win' : (isDraw ? 'draw' : 'loss');
      const badgeText = isWin ? '🏆 ชนะ' : (isDraw ? '🤝 เสมอ' : '💀 แพ้');
      const timeStr = item.date ? new Date(item.date).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="history-card ${badgeClass}">
          <div class="history-left">
            <span class="history-badge ${badgeClass}">${badgeText}</span>
            <div>
              <div class="history-opponent">${item.opponent || 'คู่แข่ง'}</div>
              <div class="history-time">${timeStr} • ${item.mode || 'แข่งทั่วไป'}</div>
            </div>
          </div>
          <div class="history-right ${badgeClass}">
            ${deltaStr}
          </div>
        </div>
      `;
    }).join('');
  }

  async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">กำลังโหลด...</td></tr>';
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (!data.leaderboard || data.leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">ไม่มีข้อมูลอันดับ</td></tr>';
        return;
      }

      tbody.innerHTML = data.leaderboard.map(p => {
        const isMe = p.name.toLowerCase() === playerStats.name.toLowerCase();
        let rankMedal = `#${p.rankNum}`;
        if (p.rankNum === 1) rankMedal = '🥇';
        else if (p.rankNum === 2) rankMedal = '🥈';
        else if (p.rankNum === 3) rankMedal = '🥉';

        return `
          <tr class="${isMe ? 'leaderboard-my-row' : ''}">
            <td style="text-align: center; font-weight: 700;">${rankMedal}</td>
            <td>
              <span class="leaderboard-player-name">${p.name} ${isMe ? '<span class="you-tag">(คุณ)</span>' : ''}</span>
            </td>
            <td style="text-align: center;">
              <span class="tier-pill" style="border-color: ${p.tierColor}; color: ${p.tierColor};">
                ${p.tierBadge} ${p.tierCode}
              </span>
            </td>
            <td style="text-align: right; font-weight: 700; color: #fbbf24;">${p.mmr.toLocaleString()} RP</td>
            <td style="text-align: right; font-size: 13px; color: var(--text-secondary);">
              ${p.wins}W / ${p.totalMatches} (${p.winRate}%)
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #f87171;">ไม่สามารถโหลดตารางอันดับได้</td></tr>';
    }
  }

  function syncRankToServer() {
    if (!playerStats.name || playerStats.name.startsWith('ผู้เล่น ')) return;
    fetch('/api/sync-rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: playerStats.name,
        mmr: playerStats.mmr,
        wins: playerStats.wins,
        losses: playerStats.losses,
        draws: playerStats.draws
      })
    }).catch(() => {});
  }

  // --- MOVE HISTORY ---
  function updateMoveHistory(history) {
    historyList.innerHTML = '';
    if (!history || history.length === 0) {
      historyList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 12px;">เริ่มเกมใหม่ เดินได้ทันที</div>';
      return;
    }

    history.forEach((text, idx) => {
      const item = document.createElement('div');
      item.className = `history-item ${idx === history.length - 1 ? 'latest' : ''}`;
      item.textContent = `${idx + 1}. ${text}`;
      historyList.appendChild(item);
    });

    historyList.scrollTop = historyList.scrollHeight;
  }

  function appendMoveHistory(text) {
    const items = historyList.querySelectorAll('.history-item');
    items.forEach(i => i.classList.remove('latest'));

    const item = document.createElement('div');
    item.className = 'history-item latest';
    item.textContent = `${items.length + 1}. ${text}`;
    historyList.appendChild(item);
    historyList.scrollTop = historyList.scrollHeight;
  }

  // --- FLOATING EMOJI ---
  function spawnFloatingEmoji(emoji) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;

    // Random horizontal position near center
    const x = Math.floor(window.innerWidth * 0.35 + Math.random() * (window.innerWidth * 0.3));
    const y = Math.floor(window.innerHeight * 0.55);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.body.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2600);
  }

  // Start
  window.addEventListener('DOMContentLoaded', init);

})();
