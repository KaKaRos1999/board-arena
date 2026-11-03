const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const QRCode = require('qrcode');
const engine = require('./game-engine.js');
const chessEngine = require('./chess-engine.js');
const makrukEngine = require('./makruk-engine.js');
const goEngine = require('./go-engine.js');
const othelloEngine = require('./othello-engine.js');
const gomokuEngine = require('./gomoku-engine.js');
const connect4Engine = require('./connect4-engine.js');
const dokaponEngine = require('./dokapon-engine.js');
const rankSystem = require('./rank-system.js');
const userSystem = require('./user-system.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static frontend files
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.svg')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/game-engine.js', express.static(path.join(__dirname, 'game-engine.js')));
app.use('/chess-engine.js', express.static(path.join(__dirname, 'chess-engine.js')));
app.use('/makruk-engine.js', express.static(path.join(__dirname, 'makruk-engine.js')));
app.use('/go-engine.js', express.static(path.join(__dirname, 'go-engine.js')));
app.use('/othello-engine.js', express.static(path.join(__dirname, 'othello-engine.js')));
app.use('/gomoku-engine.js', express.static(path.join(__dirname, 'gomoku-engine.js')));
app.use('/connect4-engine.js', express.static(path.join(__dirname, 'connect4-engine.js')));
app.use('/dokapon-engine.js', express.static(path.join(__dirname, 'dokapon-engine.js')));
app.use('/rank-system.js', express.static(path.join(__dirname, 'rank-system.js')));

// Leaderboard Persistence File
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Error reading leaderboard.json:', e);
  }
  return [
    { name: 'เซียนโอ๋ บางแค', mmr: 2280, wins: 142, losses: 18, draws: 9 },
    { name: 'อาจารย์เดชา', mmr: 2150, wins: 118, losses: 24, draws: 12 },
    { name: 'KingOfCheckers', mmr: 1980, wins: 95, losses: 31, draws: 8 },
    { name: 'น้องน้ำหวาน_Pro', mmr: 1860, wins: 78, losses: 26, draws: 5 },
    { name: 'สายฟ้าแลบ_TH', mmr: 1740, wins: 64, losses: 30, draws: 7 },
    { name: 'สิงห์สนามหลวง', mmr: 1620, wins: 53, losses: 28, draws: 4 },
    { name: 'CheckerMaster99', mmr: 1540, wins: 41, losses: 22, draws: 6 },
    { name: 'นักเดินกระดานดำ', mmr: 1480, wins: 36, losses: 25, draws: 3 },
    { name: 'มือใหม่หัดฮอส', mmr: 1320, wins: 22, losses: 19, draws: 2 }
  ];
}

function saveLeaderboard(list) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving leaderboard.json:', e);
  }
}

let leaderboard = loadLeaderboard();

function recordMatchToLeaderboard(playerName, result, mmrChange, newMmr) {
  if (!playerName || playerName.startsWith('ผู้เล่น ') || playerName.startsWith('บอท AI')) return;
  
  let entry = leaderboard.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (!entry) {
    entry = { name: playerName, mmr: newMmr, wins: 0, losses: 0, draws: 0 };
    leaderboard.push(entry);
  } else {
    entry.mmr = newMmr;
  }

  if (result === 'win') entry.wins = (entry.wins || 0) + 1;
  else if (result === 'loss') entry.losses = (entry.losses || 0) + 1;
  else if (result === 'draw') entry.draws = (entry.draws || 0) + 1;

  leaderboard.sort((a, b) => b.mmr - a.mmr);
  saveLeaderboard(leaderboard);
}

// Leaderboard API endpoint
app.get('/api/leaderboard', (req, res) => {
  const formatted = leaderboard.slice(0, 50).map((player, idx) => {
    const rankInfo = rankSystem.getRankFromMmr(player.mmr);
    const total = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
    const winRate = total > 0 ? Math.round(((player.wins || 0) / total) * 100) : 0;
    return {
      rankNum: idx + 1,
      name: player.name,
      mmr: player.mmr,
      tierName: rankInfo.name,
      tierCode: rankInfo.code,
      tierBadge: rankInfo.badge,
      tierColor: rankInfo.color,
      wins: player.wins || 0,
      losses: player.losses || 0,
      draws: player.draws || 0,
      totalMatches: total,
      winRate
    };
  });
  res.json({ leaderboard: formatted });
});

// Active Rooms List API endpoint
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getPublicRoomList() });
});

app.post('/api/sync-rank', express.json(), (req, res) => {
  const { name, mmr, wins, losses, draws } = req.body || {};
  if (!name || !mmr) return res.status(400).json({ error: 'Missing name or mmr' });
  let entry = leaderboard.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!entry) {
    entry = { name, mmr: Number(mmr) || 1200, wins: Number(wins) || 0, losses: Number(losses) || 0, draws: Number(draws) || 0 };
    leaderboard.push(entry);
  } else {
    entry.mmr = Math.max(entry.mmr, Number(mmr) || 1200);
    if (wins !== undefined) entry.wins = Math.max(entry.wins || 0, Number(wins) || 0);
    if (losses !== undefined) entry.losses = Math.max(entry.losses || 0, Number(losses) || 0);
    if (draws !== undefined) entry.draws = Math.max(entry.draws || 0, Number(draws) || 0);
  }
  leaderboard.sort((a, b) => b.mmr - a.mmr);
  saveLeaderboard(leaderboard);
  res.json({ success: true, entry });
});

// QR code generation API
app.get('/api/qrcode', async (req, res) => {
  try {
    const text = req.query.text || '';
    if (!text) return res.status(400).send('Missing text query parameter');
    const qrDataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    res.json({ dataUrl: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server info endpoint (LAN IP)
app.get('/api/server-info', (req, res) => {
  const lanIps = getLanIpAddresses();
  res.json({
    port: PORT,
    lanIps,
    suggestedUrl: lanIps.length > 0 ? `http://${lanIps[0]}:${PORT}` : `http://localhost:${PORT}`
  });
});

// ==========================================
// USER AUTH & SHOP API ENDPOINTS
// ==========================================
app.get('/api/shop/catalog', (req, res) => {
  res.json({
    avatars: userSystem.AVATAR_CATALOG,
    frames: userSystem.FRAME_CATALOG,
    topupPackages: userSystem.TOPUP_PACKAGES
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName } = req.body || {};
  const result = userSystem.registerUser(username, password, displayName);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = userSystem.loginUser(username, password);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || null);
  const user = userSystem.findUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  res.json({ success: true, user: userSystem.sanitizeUser(user) });
});

app.post('/api/user/profile', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.body?.token || null);
  const user = userSystem.findUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const result = userSystem.updateProfile(user.id, req.body || {});
  res.json(result);
});

app.post('/api/shop/buy', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.body?.token || null);
  const user = userSystem.findUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { itemId, itemType, currency } = req.body || {};
  const result = userSystem.buyShopItem(user.id, itemId, itemType, currency);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Public top-up is strictly disabled - funds can ONLY be added through the system / admin
app.post('/api/shop/topup', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'ไม่อนุญาตให้เติมเงินด้วยตนเอง กรุณาติดต่อแอดมินหรือทำรายการผ่านระบบ'
  });
});

// Admin System-Only Funds Management API
const ADMIN_SECRET = process.env.ADMIN_KEY || 'boardarena_admin_2026';

app.post('/api/admin/funds', (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!adminKey || adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Key' });
  }

  const { action, username, coins, gems } = req.body || {};
  if (!username) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุ username' });
  }

  let result;
  if (action === 'set') {
    result = userSystem.adminSetFunds(username, coins, gems);
  } else {
    // default: add
    result = userSystem.adminAddFunds(username, coins, gems);
  }

  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

function getLanIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Generate unique 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In-memory room store
const rooms = new Map();

function createRoom(roomId, hostSocketId, hostName, ruleMode = 'thai', turnTimerLimit = 60, hostMmr = 1200, password = null, gameType = 'checkers', hostAvatar = 'cat_ninja', hostFrame = 'frame_wood', hostUserId = null) {
  let initialBoard;
  if (gameType === 'chess') {
    initialBoard = chessEngine.createInitialBoard();
  } else if (gameType === 'makruk') {
    initialBoard = makrukEngine.createInitialBoard();
  } else if (gameType === 'go') {
    initialBoard = goEngine.createInitialBoard(9);
  } else if (gameType === 'othello') {
    initialBoard = othelloEngine.createInitialBoard();
  } else if (gameType === 'gomoku') {
    initialBoard = gomokuEngine.createInitialBoard(9);
  } else if (gameType === 'connect4') {
    initialBoard = connect4Engine.createInitialBoard();
  } else if (gameType === 'dokapon') {
    initialBoard = dokaponEngine.createInitialState();
  } else {
    initialBoard = engine.createInitialBoard(ruleMode);
  }

  const room = {
    id: roomId,
    gameType: gameType || 'checkers', // 'checkers' | 'makruk' | 'chess' | 'go' | 'dokapon'
    dokaponState: (gameType === 'dokapon') ? initialBoard : null,
    password: password ? String(password).trim() : null,
    ruleMode, // 'thai' or 'international'
    turnTimerLimit: Number(turnTimerLimit) || 0,
    board: initialBoard,
    turn: 'red', // Red always goes first (or White/Black)
    activePiece: null, // For continuous multi-jumps in checkers
    lastMove: null,
    moveCount: 0,
    status: 'waiting', // 'waiting' | 'playing' | 'ended'
    winner: null,
    winReason: '',
    drawOffer: null,
    rematchVotes: new Set(),
    timerLeft: Number(turnTimerLimit) || 0,
    timerInterval: null,
    disconnectTimer: null,
    disconnectedRole: null,
    disconnectSecondsLeft: 0,
    autoExpireTimer: null,
    prevBoardHash: null,
    goCaptures: { B: 0, W: 0 },
    consecutivePasses: 0,
    players: {
      red: {
        id: hostSocketId,
        name: hostName || 'ผู้เล่น 1 (สีแดง)',
        mmr: Number(hostMmr) || 1200,
        avatar: hostAvatar || 'cat_ninja',
        frame: hostFrame || 'frame_wood',
        userId: hostUserId || null,
        connected: true
      },
      blue: null
    },
    spectators: [],
    moveHistory: []
  };

  // Auto-delete waiting rooms after 3 minutes if no opponent joins (prevents spam/trolls)
  room.autoExpireTimer = setTimeout(() => {
    const r = rooms.get(roomId);
    if (r && r.status === 'waiting' && !r.players.blue) {
      console.log(`[Auto-Clean] Deleted abandoned waiting room: ${roomId}`);
      rooms.delete(roomId);
      broadcastRoomList();
    }
  }, 3 * 60 * 1000);

  rooms.set(roomId, room);
  return room;
}

function getPublicRoomList(forSocketId = null) {
  const list = [];
  for (const [id, room] of rooms.entries()) {
    if (room.status === 'ended') continue;

    const host = room.players.red;
    // CRITICAL: Do NOT show room if host is not connected or has left
    if (!host || !host.connected) continue;

    const blue = room.players.blue;
    const hostRank = rankSystem.getRankFromMmr(host.mmr || 1200);
    const blueRank = blue ? rankSystem.getRankFromMmr(blue.mmr || 1200) : null;
    const isHost = forSocketId && (host.id === forSocketId);

    list.push({
      id: room.id,
      gameType: room.gameType || 'checkers',
      ruleMode: room.ruleMode,
      turnTimerLimit: room.turnTimerLimit,
      status: room.status, // 'waiting' | 'playing'
      hasPassword: !!room.password,
      password: isHost ? room.password : undefined, // ONLY return password to the host
      isMyRoom: !!isHost,
      hostName: host.name,
      hostAvatar: host.avatar || 'cat_ninja',
      hostFrame: host.frame || 'frame_wood',
      hostMmr: host.mmr || 1200,
      hostRankBadge: hostRank ? hostRank.badge : '🥉',
      hostTierName: hostRank ? hostRank.name : 'ทองแดง III',
      hostTierColor: hostRank ? hostRank.color : '#cd7f32',
      blueName: blue ? blue.name : null,
      blueAvatar: blue ? (blue.avatar || 'cyber_fox') : null,
      blueFrame: blue ? (blue.frame || 'frame_wood') : null,
      blueRankBadge: blueRank ? blueRank.badge : null,
      playerCount: (host.connected ? 1 : 0) + (blue && blue.connected ? 1 : 0),
      spectatorCount: (room.spectators || []).length
    });
  }
  return list;
}

function broadcastRoomList() {
  if (io.sockets && io.sockets.sockets) {
    io.sockets.sockets.forEach((s) => {
      s.emit('room_list_updated', getPublicRoomList(s.id));
    });
  }
}

function endGame(room, winner, reason) {
  if (!room || room.status === 'ended') return;

  room.status = 'ended';
  room.winner = winner;
  room.winReason = reason;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.disconnectTimer) {
    clearInterval(room.disconnectTimer);
    room.disconnectTimer = null;
  }
  room.disconnectedRole = null;

  // Calculate MMR changes
  let rankChanges = null;
  if (room.players.red && room.players.blue) {
    const redMmr = Number(room.players.red.mmr) || 1200;
    const blueMmr = Number(room.players.blue.mmr) || 1200;

    let redResult = 'draw';
    let blueResult = 'draw';
    if (winner === 'red') {
      redResult = 'win';
      blueResult = 'loss';
    } else if (winner === 'blue') {
      redResult = 'loss';
      blueResult = 'win';
    }

    const redChange = rankSystem.calculateMmrChange(redMmr, blueMmr, redResult);
    const blueChange = rankSystem.calculateMmrChange(blueMmr, redMmr, blueResult);

    const newRedMmr = Math.max(1000, redMmr + redChange);
    const newBlueMmr = Math.max(1000, blueMmr + blueChange);

    room.players.red.mmr = newRedMmr;
    room.players.blue.mmr = newBlueMmr;

    rankChanges = {
      red: {
        change: redChange,
        newMmr: newRedMmr,
        rankInfo: rankSystem.getRankFromMmr(newRedMmr)
      },
      blue: {
        change: blueChange,
        newMmr: newBlueMmr,
        rankInfo: rankSystem.getRankFromMmr(newBlueMmr)
      }
    };

    recordMatchToLeaderboard(room.players.red.name, redResult, redChange, newRedMmr);
    recordMatchToLeaderboard(room.players.blue.name, blueResult, blueChange, newBlueMmr);

    // Record user account rewards & EXP for logged-in players
    let rewards = {};
    if (room.players.red && room.players.red.userId) {
      const rRew = userSystem.recordGameRewards(room.players.red.userId, redResult, redChange);
      if (rRew) rewards.red = rRew;
    }
    if (room.players.blue && room.players.blue.userId) {
      const bRew = userSystem.recordGameRewards(room.players.blue.userId, blueResult, blueChange);
      if (bRew) rewards.blue = bRew;
    }
    room.rewards = rewards;
  }

  broadcastRoomList();

  io.to(room.id).emit('game_over', {
    winner: room.winner,
    reason: room.winReason,
    board: room.board,
    rankChanges,
    rewards: room.rewards || {},
    goScore: room.goScore || null
  });
}

function startDisconnectCountdown(room, role) {
  if (room.disconnectTimer) {
    clearInterval(room.disconnectTimer);
    room.disconnectTimer = null;
  }

  // If game is playing, pause turn timer
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  const disconnectedName = room.players[role]?.name || (role === 'red' ? 'สีแดง' : 'สีน้ำเงิน');
  room.disconnectedRole = role;
  room.disconnectSecondsLeft = 15; // 15 seconds grace period

  io.to(room.id).emit('opponent_disconnected', {
    role,
    name: disconnectedName,
    secondsLeft: room.disconnectSecondsLeft
  });

  room.disconnectTimer = setInterval(() => {
    if (room.status !== 'playing' || !room.disconnectedRole) {
      clearInterval(room.disconnectTimer);
      room.disconnectTimer = null;
      return;
    }

    room.disconnectSecondsLeft--;
    io.to(room.id).emit('disconnect_countdown_tick', {
      role: room.disconnectedRole,
      secondsLeft: room.disconnectSecondsLeft
    });

    if (room.disconnectSecondsLeft <= 0) {
      clearInterval(room.disconnectTimer);
      room.disconnectTimer = null;

      // Forfeit by disconnect!
      const winner = role === 'red' ? 'blue' : 'red';
      endGame(room, winner, `${disconnectedName} ขาดการเชื่อมต่อหรือออกจากเกม (ชนะผ่าน!)`);
    }
  }, 1000);
}

function startTurnTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  if (room.turnTimerLimit <= 0 || room.status !== 'playing') {
    return;
  }

  room.timerLeft = room.turnTimerLimit;

  room.timerInterval = setInterval(() => {
    if (room.status !== 'playing') {
      clearInterval(room.timerInterval);
      return;
    }

    room.timerLeft--;
    io.to(room.id).emit('timer_tick', {
      turn: room.turn,
      timerLeft: room.timerLeft
    });

    if (room.timerLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      // Time-out forfeit!
      const timedOutPlayer = room.turn;
      const winner = timedOutPlayer === 'red' ? 'blue' : 'red';
      const timedOutName = room.players[timedOutPlayer]?.name || (timedOutPlayer === 'red' ? 'สีแดง' : 'สีน้ำเงิน');
      
      endGame(room, winner, `${timedOutName} หมดเวลาเดิน!`);
    }
  }, 1000);
}

function sanitizeRoomState(room) {
  let legalMoves = [];
  if (room.status === 'playing') {
    if (room.gameType === 'chess') {
      legalMoves = chessEngine.getAllLegalMoves(room.board, room.turn);
    } else if (room.gameType === 'makruk') {
      legalMoves = makrukEngine.getAllLegalMoves(room.board, room.turn);
    } else if (room.gameType === 'go') {
      const goColor = room.turn === 'red' ? 'B' : 'W';
      legalMoves = goEngine.getLegalMoves(room.board, goColor, room.prevBoardHash);
    } else if (room.gameType === 'othello') {
      legalMoves = othelloEngine.getLegalMoves(room.board, room.turn);
    } else if (room.gameType === 'gomoku') {
      legalMoves = gomokuEngine.getLegalMoves(room.board);
    } else if (room.gameType === 'connect4') {
      legalMoves = connect4Engine.getLegalColumns(room.board);
    } else if (room.gameType === 'dokapon') {
      legalMoves = ['roll'];
    } else {
      legalMoves = engine.getAllLegalMoves(room.board, room.turn, room.ruleMode, room.activePiece);
    }
  }

  return {
    id: room.id,
    gameType: room.gameType || 'checkers',
    hasPassword: !!room.password,
    ruleMode: room.ruleMode,
    turnTimerLimit: room.turnTimerLimit,
    board: room.board,
    turn: room.turn,
    activePiece: room.activePiece,
    lastMove: room.lastMove,
    moveCount: room.moveCount,
    status: room.status,
    winner: room.winner,
    winReason: room.winReason,
    drawOffer: room.drawOffer,
    timerLeft: room.timerLeft,
    goCaptures: room.goCaptures || { B: 0, W: 0 },
    consecutivePasses: room.consecutivePasses || 0,
    players: {
      red: room.players.red ? { 
        name: room.players.red.name, 
        connected: room.players.red.connected,
        mmr: room.players.red.mmr || 1200,
        avatar: room.players.red.avatar || 'cat_ninja',
        frame: room.players.red.frame || 'frame_wood',
        userId: room.players.red.userId || null,
        rank: rankSystem.getRankFromMmr(room.players.red.mmr || 1200)
      } : null,
      blue: room.players.blue ? { 
        name: room.players.blue.name, 
        connected: room.players.blue.connected,
        mmr: room.players.blue.mmr || 1200,
        avatar: room.players.blue.avatar || 'cyber_fox',
        frame: room.players.blue.frame || 'frame_wood',
        userId: room.players.blue.userId || null,
        rank: rankSystem.getRankFromMmr(room.players.blue.mmr || 1200)
      } : null
    },
    spectatorCount: room.spectators.length,
    legalMoves,
    moveHistory: room.moveHistory.slice(-15)
  };
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let playerRole = null; // 'red' | 'blue' | 'spectator'

  // Fetch active rooms for lobby
  socket.on('get_room_list', (callback) => {
    if (typeof callback === 'function') {
      callback(getPublicRoomList(socket.id));
    }
  });

  // Create room
  socket.on('create_room', ({ playerName, ruleMode, turnTimerLimit, playerMmr, password, gameType, avatar, frame, userId }, callback) => {
    let roomId = generateRoomCode();
    while (rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const room = createRoom(roomId, socket.id, playerName, ruleMode, turnTimerLimit, playerMmr, password, gameType, avatar, frame, userId);
    currentRoomId = roomId;
    playerRole = 'red';

    socket.join(roomId);
    broadcastRoomList();

    if (typeof callback === 'function') {
      callback({
        success: true,
        roomId,
        role: 'red',
        roomPassword: room.password || null,
        gameState: sanitizeRoomState(room)
      });
    }
  });

  // Join room
  socket.on('join_room', ({ roomId, playerName, playerMmr, password, avatar, frame, userId }, callback) => {
    const code = (roomId || '').trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'ไม่พบห้องนี้ หรือห้องถูกปิดแล้ว' });
      }
      return;
    }

    // Check room password if protected
    const isReconnectingRed = room.players.red && !room.players.red.connected && room.players.red.id === socket.id;
    const isReconnectingBlue = room.players.blue && !room.players.blue.connected && room.players.blue.id === socket.id;

    if (room.password && !isReconnectingRed && !isReconnectingBlue) {
      const inputPass = (password || '').toString().trim();
      if (inputPass !== room.password) {
        if (typeof callback === 'function') {
          callback({ success: false, isLocked: true, error: 'รหัสผ่านห้องไม่ถูกต้อง' });
        }
        return;
      }
    }

    currentRoomId = code;
    socket.join(code);

    // Reconnection check for existing player who refreshed or dropped
    if (room.players.red && !room.players.red.connected && (!room.players.blue || room.players.blue.id !== socket.id)) {
      playerRole = 'red';
      room.players.red.id = socket.id;
      room.players.red.connected = true;
      if (room.disconnectedRole === 'red') {
        if (room.disconnectTimer) {
          clearInterval(room.disconnectTimer);
          room.disconnectTimer = null;
        }
        room.disconnectedRole = null;
        io.to(code).emit('opponent_reconnected', {
          role: 'red',
          name: room.players.red.name
        });
        if (room.status === 'playing') {
          startTurnTimer(room);
        }
      }
      broadcastRoomList();
      if (typeof callback === 'function') {
        callback({ success: true, roomId: code, role: 'red', gameState: sanitizeRoomState(room) });
      }
      return;
    }

    if (room.players.blue && !room.players.blue.connected && (!room.players.red || room.players.red.id !== socket.id)) {
      playerRole = 'blue';
      room.players.blue.id = socket.id;
      room.players.blue.connected = true;
      if (room.disconnectedRole === 'blue') {
        if (room.disconnectTimer) {
          clearInterval(room.disconnectTimer);
          room.disconnectTimer = null;
        }
        room.disconnectedRole = null;
        io.to(code).emit('opponent_reconnected', {
          role: 'blue',
          name: room.players.blue.name
        });
        if (room.status === 'playing') {
          startTurnTimer(room);
        }
      }
      broadcastRoomList();
      if (typeof callback === 'function') {
        callback({ success: true, roomId: code, role: 'blue', gameState: sanitizeRoomState(room) });
      }
      return;
    }

    // Assign role
    if (!room.players.blue) {
      // Slot 2 available
      if (room.autoExpireTimer) {
        clearTimeout(room.autoExpireTimer);
        room.autoExpireTimer = null;
      }

      room.players.blue = {
        id: socket.id,
        name: playerName || 'ผู้เล่น 2 (สีน้ำเงิน)',
        mmr: Number(playerMmr) || 1200,
        avatar: avatar || 'cyber_fox',
        frame: frame || 'frame_wood',
        userId: userId || null,
        connected: true
      };
      playerRole = 'blue';
      room.status = 'playing';

      startTurnTimer(room);
      broadcastRoomList();

      io.to(code).emit('game_started', {
        gameState: sanitizeRoomState(room),
        message: `${room.players.blue.name} เข้าร่วมห้องแล้ว! เริ่มการแข่งขัน`
      });

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomId: code,
          role: 'blue',
          gameState: sanitizeRoomState(room)
        });
      }
    } else if (room.players.red.id === socket.id) {
      playerRole = 'red';
      room.players.red.connected = true;
      if (typeof callback === 'function') {
        callback({ success: true, roomId: code, role: 'red', gameState: sanitizeRoomState(room) });
      }
    } else if (room.players.blue.id === socket.id) {
      playerRole = 'blue';
      room.players.blue.connected = true;
      if (typeof callback === 'function') {
        callback({ success: true, roomId: code, role: 'blue', gameState: sanitizeRoomState(room) });
      }
    } else {
      // Room is full -> Spectator
      playerRole = 'spectator';
      room.spectators.push({ id: socket.id, name: playerName || `ผู้ชม #${room.spectators.length + 1}` });
      broadcastRoomList();

      io.to(code).emit('spectator_joined', {
        spectatorCount: room.spectators.length,
        name: playerName || 'ผู้ชม'
      });

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomId: code,
          role: 'spectator',
          gameState: sanitizeRoomState(room)
        });
      }
    }
  });

  // Make move
  socket.on('make_move', ({ roomId, move }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.status !== 'playing') {
      if (typeof callback === 'function') callback({ success: false, error: 'เกมยังไม่เริ่มหรือจบแล้ว' });
      return;
    }

    if (playerRole !== room.turn) {
      if (typeof callback === 'function') callback({ success: false, error: 'ยังไม่ถึงตาเดินของคุณ' });
      return;
    }

    // Dispatch move according to game type
    if (room.gameType === 'chess') {
      const legalMoves = chessEngine.getAllLegalMoves(room.board, room.turn);
      const isValid = legalMoves.some(m => 
        m.from.r === move.from.r && m.from.c === move.from.c &&
        m.to.r === move.to.r && m.to.c === move.to.c
      );
      if (!isValid) {
        if (typeof callback === 'function') callback({ success: false, error: 'ตาเดินไม่ถูกต้องตามกติกาสากล' });
        return;
      }
      room.board = chessEngine.applyMove(room.board, move, move.promotionChoice);
      room.lastMove = move;
      room.moveCount++;
      const fromNot = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
      const toNot = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
      room.moveHistory.push(`${room.turn === 'red' ? 'ขาว' : 'ดำ'}: ${fromNot} ➜ ${toNot}${move.capture ? ' ⚔️' : ''}`);
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      const status = chessEngine.checkGameOver(room.board, room.turn);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });
      if (status.over) {
        endGame(room, status.winner, status.reason === 'checkmate' ? 'รุกจน (Checkmate)' : 'เสมอ (Stalemate)');
      }
      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'makruk') {
      const legalMoves = makrukEngine.getAllLegalMoves(room.board, room.turn);
      const isValid = legalMoves.some(m => 
        m.from.r === move.from.r && m.from.c === move.from.c &&
        m.to.r === move.to.r && m.to.c === move.to.c
      );
      if (!isValid) {
        if (typeof callback === 'function') callback({ success: false, error: 'ตาเดินไม่ถูกต้องตามกติกาหมากรุกไทย' });
        return;
      }
      room.board = makrukEngine.applyMove(room.board, move);
      room.lastMove = move;
      room.moveCount++;
      const fromNot = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
      const toNot = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
      room.moveHistory.push(`${room.turn === 'red' ? 'แดง' : 'น้ำเงิน'}: ${fromNot} ➜ ${toNot}${move.capture ? ' ⚔️' : ''}${move.promotion ? ' (หงาย)' : ''}`);
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      const status = makrukEngine.checkGameOver(room.board, room.turn);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });
      if (status.over) {
        endGame(room, status.winner, status.reason === 'checkmate' ? 'รุกจน (หมากรุกไทย)' : 'เสมอ');
      }
      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'go') {
      const goColor = room.turn === 'red' ? 'B' : 'W';
      if (move.pass) {
        room.consecutivePasses = (room.consecutivePasses || 0) + 1;
        room.moveHistory.push(`${room.turn === 'red' ? 'ดำ' : 'ขาว'}: ผ่าน (Pass)`);
        room.turn = room.turn === 'red' ? 'blue' : 'red';
        startTurnTimer(room);
        io.to(roomId).emit('game_updated', {
          gameState: sanitizeRoomState(room),
          move: { pass: true }
        });
        if (room.consecutivePasses >= 2) {
          const score = goEngine.calculateScore(room.board, room.goCaptures || { B: 0, W: 0 });
          room.goScore = score;
          const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
          endGame(room, score.winner, `จบเกมจากการผ่านทั้งคู่: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`);
        }
        if (typeof callback === 'function') callback({ success: true });
        return;
      }

      room.consecutivePasses = 0;
      const res = goEngine.playMove(room.board, move.r, move.c, goColor, room.prevBoardHash);
      if (!res.success) {
        const errMsg = res.reason === 'suicide' ? 'ห้ามลงจุดไม่มีลมหายใจ (ฆ่าตัวตาย)' : 'ไม่สามารถวางหมากตรงนี้ได้';
        if (typeof callback === 'function') callback({ success: false, error: errMsg });
        return;
      }

      room.prevBoardHash = res.hash;
      room.board = res.newBoard;
      room.lastMove = { to: { r: move.r, c: move.c } };
      room.moveCount++;
      if (!room.goCaptures) room.goCaptures = { B: 0, W: 0 };
      room.goCaptures[goColor] += res.captured.length;
      const posNot = `${String.fromCharCode(65 + move.c)}${room.board.length - move.r}`;
      room.moveHistory.push(`${room.turn === 'red' ? 'ดำ' : 'ขาว'}: วางที่ ${posNot}${res.captured.length > 0 ? ` (กิน ${res.captured.length} เม็ด)` : ''}`);

      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });

      // Check if board has no legal moves left
      const nextMoves = goEngine.getLegalMoves(room.board, room.turn === 'red' ? 'B' : 'W', room.prevBoardHash);
      if (nextMoves.length === 0) {
        const score = goEngine.calculateScore(room.board, room.goCaptures || { B: 0, W: 0 });
        room.goScore = score;
        const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
        endGame(room, score.winner, `กระดานเต็ม: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`);
      }

      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'othello') {
      const res = othelloEngine.applyMove(room.board, move.r, move.c, room.turn);
      if (!res.success) {
        if (typeof callback === 'function') callback({ success: false, error: 'ไม่สามารถวางหมากตรงนี้ได้' });
        return;
      }
      room.board = res.nextBoard;
      room.lastMove = { to: { r: move.r, c: move.c } };
      room.moveCount++;
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      // Check if next player has moves, if not auto-pass
      let nextMoves = othelloEngine.getLegalMoves(room.board, room.turn);
      if (nextMoves.length === 0) {
        room.turn = room.turn === 'red' ? 'blue' : 'red';
        startTurnTimer(room);
        nextMoves = othelloEngine.getLegalMoves(room.board, room.turn);
      }

      const over = othelloEngine.checkGameOver(room.board);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });
      if (over.over) {
        endGame(room, over.winner, over.reason);
      }
      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'gomoku') {
      const res = gomokuEngine.applyMove(room.board, move.r, move.c, room.turn);
      if (!res.success) {
        if (typeof callback === 'function') callback({ success: false, error: 'ช่องนี้มีหมากแล้ว' });
        return;
      }
      room.board = res.nextBoard;
      room.lastMove = { to: { r: move.r, c: move.c } };
      room.moveCount++;
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      const over = gomokuEngine.checkGameOver(room.board);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });
      if (over.over) {
        endGame(room, over.winner, over.reason);
      }
      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'connect4') {
      const res = connect4Engine.applyDrop(room.board, move.col, room.turn);
      if (!res.success) {
        if (typeof callback === 'function') callback({ success: false, error: 'แถวนี้เต็มแล้ว' });
        return;
      }
      room.board = res.nextBoard;
      room.lastMove = { to: { r: res.r, c: res.c } };
      room.moveCount++;
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);

      const over = connect4Engine.checkGameOver(room.board);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move: { r: res.r, c: res.c, col: move.col }
      });
      if (over.over) {
        endGame(room, over.winner, over.reason);
      }
      if (typeof callback === 'function') callback({ success: true });
      return;
    }

    if (room.gameType === 'dokapon') {
      const dState = room.dokaponState || room.board;
      let res = { success: false, error: 'คำสั่งไม่ถูกต้อง' };

      if (move.type === 'roll') {
        res = dokaponEngine.rollSpinner(dState, playerRole);
      } else if (move.type === 'battle_action') {
        res = dokaponEngine.resolveBattleTurn(dState, playerRole, move.action);
      } else if (move.type === 'punish') {
        res = dokaponEngine.applyPunishment(dState, playerRole, move.choice);
      } else if (move.type === 'shop_buy') {
        res = dokaponEngine.buyShopItem(dState, playerRole, move.itemId);
      } else if (move.type === 'shop_leave') {
        res = dokaponEngine.leaveShop(dState, playerRole);
      }

      if (!res.success) {
        if (typeof callback === 'function') callback({ success: false, error: res.error || 'ดำเนินการไม่สำเร็จ' });
        return;
      }

      room.board = dState;
      room.dokaponState = dState;
      room.turn = dState.turn;
      room.moveCount++;
      startTurnTimer(room);

      const hasWon = dokaponEngine.checkVictory(dState);
      io.to(roomId).emit('game_updated', {
        gameState: sanitizeRoomState(room),
        move
      });

      if (hasWon) {
        endGame(room, dState.winner, dState.winReason);
      }
      if (typeof callback === 'function') callback({ success: true, ...res });
      return;
    }

    // Checkers (Default)
    // Validate move against legal moves
    const legalMoves = engine.getAllLegalMoves(room.board, room.turn, room.ruleMode, room.activePiece);
    const isValid = legalMoves.some(m => 
      m.from.r === move.from.r && m.from.c === move.from.c &&
      m.to.r === move.to.r && m.to.c === move.to.c
    );

    if (!isValid) {
      if (typeof callback === 'function') callback({ success: false, error: 'ตาเดินไม่ถูกต้องตามกติกา' });
      return;
    }

    // Apply move
    const result = engine.applyMove(room.board, move, room.ruleMode);
    room.board = result.nextBoard;
    room.lastMove = move;
    room.moveCount++;

    const fromNotation = `${String.fromCharCode(65 + move.from.c)}${8 - move.from.r}`;
    const toNotation = `${String.fromCharCode(65 + move.to.c)}${8 - move.to.r}`;
    const moveText = `${room.turn === 'red' ? 'แดง' : 'น้ำเงิน'}: ${fromNotation} ➜ ${toNotation}${move.isCapture ? ' (กิน)' : ''}${result.crowned ? ' 👑 (เข้าฮอส)' : ''}`;
    room.moveHistory.push(moveText);

    if (result.canContinueJump) {
      // Keep turn on same player for multi-jump
      room.activePiece = result.nextActivePiece;
    } else {
      // Turn ends, switch to other player
      room.activePiece = null;
      room.turn = room.turn === 'red' ? 'blue' : 'red';
      startTurnTimer(room);
    }

    // Check game status
    const status = engine.checkGameStatus(room.board, room.turn, room.ruleMode, room.activePiece);

    io.to(roomId).emit('game_updated', {
      gameState: sanitizeRoomState(room),
      move,
      crowned: result.crowned,
      canContinueJump: result.canContinueJump
    });

    if (status.isGameOver) {
      endGame(room, status.winner, status.reason);
    }

    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  // Request Go Score calculation & end game
  socket.on('request_go_score', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing' || room.gameType !== 'go') return;
    const score = goEngine.calculateScore(room.board, room.goCaptures || { B: 0, W: 0 });
    room.goScore = score;
    const winName = score.winner === 'red' ? 'ฝ่ายดำ (Black)' : 'ฝ่ายขาว (White)';
    endGame(room, score.winner, `นับแต้มตัดสิน: ${winName} ชนะด้วยคะแนนนำ ${score.margin.toFixed(1)} แต้ม!`);
  });

  // Resign (ยอมแพ้)
  socket.on('resign', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    if (playerRole !== 'red' && playerRole !== 'blue') return;

    const winner = playerRole === 'red' ? 'blue' : 'red';
    const loserName = room.players[playerRole]?.name || playerRole;

    endGame(room, winner, `${loserName} ขอยอมแพ้`);
  });

  // Offer draw (ขอเสมอ)
  socket.on('offer_draw', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    if (playerRole !== 'red' && playerRole !== 'blue') return;

    room.drawOffer = playerRole;
    socket.to(roomId).emit('draw_offered', {
      by: playerRole,
      byName: room.players[playerRole]?.name
    });
  });

  // Respond draw
  socket.on('respond_draw', ({ roomId, accept }) => {
    const room = rooms.get(roomId);
    if (!room || !room.drawOffer) return;

    if (accept) {
      endGame(room, 'draw', 'ทั้งสองฝ่ายตกลงเสมอกัน');
    } else {
      const declinerName = room.players[playerRole]?.name || playerRole;
      room.drawOffer = null;
      io.to(roomId).emit('draw_declined', {
        message: `${declinerName} ปฏิเสธการขอเสมอ`
      });
    }
  });

  // Request rematch (ขอเล่นใหม่)
  socket.on('request_rematch', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.rematchVotes.add(socket.id);

    const neededVotes = (room.players.red && room.players.blue) ? 2 : 1;
    io.to(roomId).emit('rematch_voted', {
      voterName: room.players[playerRole]?.name || 'ผู้เล่น',
      count: room.rematchVotes.size,
      needed: neededVotes
    });

    if (room.rematchVotes.size >= neededVotes) {
      // Reset board and start new game!
      // Swap colors for fairness
      const prevRed = room.players.red;
      const prevBlue = room.players.blue;

      if (room.gameType === 'chess') {
        room.board = chessEngine.createInitialBoard();
      } else if (room.gameType === 'makruk') {
        room.board = makrukEngine.createInitialBoard();
      } else if (room.gameType === 'go') {
        room.board = goEngine.createInitialBoard(9);
        room.goCaptures = { B: 0, W: 0 };
        room.consecutivePasses = 0;
      } else if (room.gameType === 'othello') {
        room.board = othelloEngine.createInitialBoard();
      } else if (room.gameType === 'gomoku') {
        room.board = gomokuEngine.createInitialBoard(9);
      } else if (room.gameType === 'connect4') {
        room.board = connect4Engine.createInitialBoard();
      } else if (room.gameType === 'dokapon') {
        room.board = dokaponEngine.createInitialState();
        room.dokaponState = room.board;
      } else {
        room.board = engine.createInitialBoard(room.ruleMode);
      }
      room.turn = 'red';
      room.activePiece = null;
      room.lastMove = null;
      room.status = 'playing';
      room.winner = null;
      room.winReason = '';
      room.drawOffer = null;
      room.rematchVotes.clear();
      room.moveHistory = [];
      room.timerLeft = room.turnTimerLimit;

      // Swap players if both present
      if (prevRed && prevBlue) {
        room.players.red = prevBlue;
        room.players.blue = prevRed;
      }

      startTurnTimer(room);
      broadcastRoomList();

      io.to(roomId).emit('rematch_started', {
        gameState: sanitizeRoomState(room),
        swapped: true
      });
    }
  });

  // Claim win due to opponent disconnect
  socket.on('claim_win_disconnect', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;
    if (!room.disconnectedRole) return;
    if (playerRole === room.disconnectedRole) return;

    const disconnectedName = room.players[room.disconnectedRole]?.name || 'ฝ่ายตรงข้าม';
    endGame(room, playerRole, `${disconnectedName} หลุดการเชื่อมต่อ (คุณกดเคลมชัยชนะทันที! 🏆)`);
  });

  // Explicit leave room (concede / forfeit / cancel waiting room)
  socket.on('leave_room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.status === 'waiting' && playerRole === 'red') {
      // Host cancelled waiting room -> delete immediately!
      if (room.autoExpireTimer) clearTimeout(room.autoExpireTimer);
      if (room.timerInterval) clearInterval(room.timerInterval);
      if (room.disconnectTimer) clearInterval(room.disconnectTimer);
      rooms.delete(roomId);
      broadcastRoomList();
      return;
    }

    if (room.status === 'playing' && (playerRole === 'red' || playerRole === 'blue')) {
      const winner = playerRole === 'red' ? 'blue' : 'red';
      const leaverName = room.players[playerRole]?.name || (playerRole === 'red' ? 'สีแดง' : 'สีน้ำเงิน');
      endGame(room, winner, `${leaverName} ออกจากการแข่งขัน (ยอมแพ้)`);
    }
  });

  // Chat message & floating emoji
  socket.on('send_chat', ({ roomId, message, emoji }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const senderName = room.players[playerRole]?.name || (playerRole === 'spectator' ? 'ผู้ชม' : 'ผู้เล่น');
    io.to(roomId).emit('chat_received', {
      sender: senderName,
      role: playerRole,
      message,
      emoji,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (playerRole === 'red') {
      if (room.status === 'waiting') {
        // Host disconnected while waiting -> delete room immediately so no spam rooms exist!
        if (room.autoExpireTimer) clearTimeout(room.autoExpireTimer);
        if (room.timerInterval) clearInterval(room.timerInterval);
        if (room.disconnectTimer) clearInterval(room.disconnectTimer);
        rooms.delete(currentRoomId);
        broadcastRoomList();
        return;
      }

      if (room.players.red) {
        room.players.red.connected = false;
        if (room.status === 'playing') {
          startDisconnectCountdown(room, 'red');
        } else {
          io.to(currentRoomId).emit('player_disconnected', {
            role: 'red',
            name: room.players.red.name
          });
        }
      }
    } else if (playerRole === 'blue' && room.players.blue) {
      room.players.blue.connected = false;
      if (room.status === 'playing') {
        startDisconnectCountdown(room, 'blue');
      } else {
        io.to(currentRoomId).emit('player_disconnected', {
          role: 'blue',
          name: room.players.blue.name
        });
      }
    } else if (playerRole === 'spectator') {
      room.spectators = room.spectators.filter(s => s.id !== socket.id);
      io.to(currentRoomId).emit('spectator_left', {
        spectatorCount: room.spectators.length
      });
    }

    // If both players have left or disconnected -> Clean up immediately!
    const hasActivePlayers = (room.players.red && room.players.red.connected) || (room.players.blue && room.players.blue.connected);
    if (!hasActivePlayers) {
      if (room.autoExpireTimer) clearTimeout(room.autoExpireTimer);
      if (room.timerInterval) clearInterval(room.timerInterval);
      if (room.disconnectTimer) clearInterval(room.disconnectTimer);
      rooms.delete(currentRoomId);
    }

    broadcastRoomList();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIps = getLanIpAddresses();
  console.log(`=================================================`);
  console.log(`🎲 Board Arena (กระดานเซียนออนไลน์) พร้อมใช้งาน!`);
  console.log(`🌐 เข้าเล่นบนเครื่องนี้:  http://localhost:${PORT}`);
  if (lanIps.length > 0) {
    lanIps.forEach(ip => {
      console.log(`📱 ชวนเพื่อนเล่นในเน็ต/Wi-Fi เดียวกัน: http://${ip}:${PORT}`);
    });
  }
  console.log(`=================================================`);
});
