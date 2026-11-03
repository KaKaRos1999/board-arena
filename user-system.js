/**
 * User, Authentication, Avatar & Economy System
 * Supports User Accounts, Login/Register, Avatars, Frames, Inventory, and Shop/Monetization.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, 'users.json');

// --- SHOP CATALOG DEFINITIONS ---
const AVATAR_CATALOG = [
  { id: 'cat_ninja', name: 'เหมียวนินจา', icon: '🐱', rarity: 'common', priceCoins: 0, priceGems: 0, desc: 'นินจาแมวผู้เงียบเชียบและว่องไว' },
  { id: 'cyber_fox', name: 'จิ้งจอกไซเบอร์', icon: '🦊', rarity: 'common', priceCoins: 0, priceGems: 0, desc: 'จิ้งจอกเจ้าเล่ห์พร้อมแว่นไซเบอร์' },
  { id: 'panda_master', name: 'แพนด้ากังฟู', icon: '🐼', rarity: 'common', priceCoins: 0, priceGems: 0, desc: 'เซียนหมากสายสุขุม หนักแน่นดุจภูผา' },
  { id: 'white_tiger', name: 'พยัคฆ์ขาวคำราม', icon: '🐯', rarity: 'rare', priceCoins: 600, priceGems: 0, desc: 'เสือขาวทรงพลัง บุกตะลุยทุกตาราง' },
  { id: 'thunder_hero', name: 'สายฟ้าวายุ', icon: '⚡', rarity: 'rare', priceCoins: 800, priceGems: 0, desc: 'เจ้าแห่งความเร็ว เดินหมากรวดเร็วดั่งอัสนี' },
  { id: 'grand_wizard', name: 'มหาจอมเวทย์', icon: '🧙‍♂️', rarity: 'epic', priceCoins: 1500, priceGems: 15, desc: 'ผู้หยั่งรู้ทุกกลยุทธ์บนกระดาน' },
  { id: 'mecha_knight', name: 'หุ่นรบไซบอร์ก', icon: '🤖', rarity: 'epic', priceCoins: 2000, priceGems: 20, desc: 'เกราะเหล็กกล้า คำนวณตากินล่วงหน้า 10 ตา' },
  { id: 'sakura_moon', name: 'ซากุระจันทรา', icon: '🌸', rarity: 'epic', priceCoins: 2200, priceGems: 20, desc: 'ความงดงามที่แฝงด้วยเพลงดาบพิฆาต' },
  { id: 'golden_dragon', name: 'มังกรทองสวรรค์', icon: '🐉', rarity: 'legendary', priceCoins: 3500, priceGems: 35, desc: 'มังกรทองในตำนาน เจ้าแห่งกระดานหมากทั้งปวง' },
  { id: 'celestial_unicorn', name: 'ยูนิคอร์นแสงดาว', icon: '🦄', rarity: 'legendary', priceCoins: 4000, priceGems: 40, desc: 'สัญลักษณ์แห่งโชคลาภและปัญญาอันบริสุทธิ์' },
  { id: 'demon_lord', name: 'จอมมารแห่งเงามืด', icon: '💀', rarity: 'legendary', priceCoins: 4500, priceGems: 45, desc: 'พลังแห่งความมืด บดขยี้ฝ่ายตรงข้ามอย่างไร้ปรานี' },
  { id: 'chess_king', name: 'ราชันย์ไร้พ่าย (VIP)', icon: '👑', rarity: 'mythic', priceCoins: 6000, priceGems: 60, desc: 'อวตารเกียรติยศสูงสุดของผู้ปกครองทุกกระดาน' }
];

const FRAME_CATALOG = [
  { id: 'frame_wood', name: 'กรอบไม้คลาสสิก', rarity: 'common', priceCoins: 0, priceGems: 0, desc: 'กรอบไม้แท้เรียบหรู' },
  { id: 'frame_silver', name: 'กรอบเงินประกาย', rarity: 'rare', priceCoins: 400, priceGems: 0, desc: 'ขอบเงินขัดเงางามสะดุดตา' },
  { id: 'frame_gold', name: 'กรอบทองคำจักรพรรดิ', rarity: 'epic', priceCoins: 1200, priceGems: 10, desc: 'กรอบทองคำอร่าม เรืองรองสง่างาม' },
  { id: 'frame_neon', name: 'กรอบนีออนไซเบอร์', rarity: 'epic', priceCoins: 1800, priceGems: 18, desc: 'เส้นแสงนีออนเรืองแสงกระพริบสไตล์ไซเบอร์' },
  { id: 'frame_fire', name: 'กรอบเพลิงสุริยัน', rarity: 'legendary', priceCoins: 3000, priceGems: 30, desc: 'เปลวไฟโชติช่วงรอบรูปโปรไฟล์ ดุดันสมจริง' },
  { id: 'frame_diamond', name: 'กรอบเพชร 7 ประกาย', rarity: 'mythic', priceCoins: 5000, priceGems: 50, desc: 'กรอบเพชรพรีเมียม ส่องแสงระยิบระยับระดับ VIP' }
];

const TOPUP_PACKAGES = [
  { id: 'pack_starter', name: 'ถุงเพชรเริ่มต้น', gems: 100, bonusCoins: 500, priceBaht: 29, tag: 'คุ้มค่า' },
  { id: 'pack_warrior', name: 'หีบเพชรจอมยุทธ์', gems: 500, bonusCoins: 3000, priceBaht: 129, tag: 'ยอดนิยม 🔥' },
  { id: 'pack_king', name: 'คลังเพชรราชันย์', gems: 1200, bonusCoins: 8000, priceBaht: 299, tag: 'สุดคุ้ม 💎' }
];

// --- STORAGE HELPERS ---
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Error reading users.json:', e);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users.json:', e);
  }
}

let users = loadUsers();

// Password hashing
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

// Find user
function findUserByUsername(username) {
  if (!username) return null;
  return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
}

function findUserByToken(token) {
  if (!token) return null;
  return users.find(u => u.token === token);
}

function findUserById(id) {
  if (!id) return null;
  return users.find(u => u.id === id);
}

// Register
function registerUser(username, password, displayName) {
  username = (username || '').trim();
  password = (password || '').trim();
  displayName = (displayName || username).trim();

  if (!username || username.length < 3 || username.length > 20) {
    return { success: false, error: 'ชื่อผู้ใช้ต้องมีความยาว 3 - 20 ตัวอักษร' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { success: false, error: 'ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ เท่านั้น' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' };
  }

  if (findUserByUsername(username)) {
    return { success: false, error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const token = generateToken();

  const newUser = {
    id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    username,
    passwordHash,
    salt,
    displayName: displayName || username,
    avatar: 'cat_ninja',
    frame: 'frame_wood',
    coins: 1000, // Welcome gift 1,000 coins!
    gems: 50,    // Welcome gift 50 gems!
    level: 1,
    exp: 0,
    stats: {
      mmr: 1200,
      wins: 0,
      losses: 0,
      draws: 0,
      matchCount: 0
    },
    inventory: {
      avatars: ['cat_ninja', 'cyber_fox', 'panda_master'],
      frames: ['frame_wood', 'frame_silver']
    },
    token,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, user: sanitizeUser(newUser), token };
}

// Login
function loginUser(username, password) {
  username = (username || '').trim();
  password = (password || '').trim();

  const user = findUserByUsername(username);
  if (!user) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ กรุณาตรวจสอบหรือสมัครใหม่' };
  }

  const testHash = hashPassword(password, user.salt);
  if (testHash !== user.passwordHash) {
    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  user.token = generateToken();
  user.lastLogin = new Date().toISOString();
  saveUsers(users);

  return { success: true, user: sanitizeUser(user), token: user.token };
}

// Update profile (Avatar, Frame, Display Name)
function updateProfile(userId, { avatar, frame, displayName }) {
  const user = findUserById(userId);
  if (!user) return { success: false, error: 'ไม่พบผู้ใช้' };

  if (displayName && displayName.trim().length >= 2 && displayName.trim().length <= 25) {
    user.displayName = displayName.trim();
  }

  if (avatar && user.inventory.avatars.includes(avatar)) {
    user.avatar = avatar;
  }

  if (frame && user.inventory.frames.includes(frame)) {
    user.frame = frame;
  }

  saveUsers(users);
  return { success: true, user: sanitizeUser(user) };
}

// Buy Item from Shop
function buyShopItem(userId, itemId, itemType, currency) {
  const user = findUserById(userId);
  if (!user) return { success: false, error: 'ไม่พบผู้ใช้' };

  let item = null;
  if (itemType === 'avatar') {
    item = AVATAR_CATALOG.find(a => a.id === itemId);
    if (!item) return { success: false, error: 'ไม่พบอวตารนี้ในร้านค้า' };
    if (user.inventory.avatars.includes(itemId)) {
      return { success: false, error: 'คุณเป็นเจ้าของอวตารนี้แล้ว' };
    }
  } else if (itemType === 'frame') {
    item = FRAME_CATALOG.find(f => f.id === itemId);
    if (!item) return { success: false, error: 'ไม่พบกรอบนี้ในร้านค้า' };
    if (user.inventory.frames.includes(itemId)) {
      return { success: false, error: 'คุณเป็นเจ้าของกรอบนี้แล้ว' };
    }
  } else {
    return { success: false, error: 'หมวดหมู่สินค้าไม่ถูกต้อง' };
  }

  // Deduct coins or gems
  if (currency === 'gems') {
    if (!item.priceGems || item.priceGems <= 0) {
      return { success: false, error: 'สินค้านี้ไม่สามารถซื้อด้วยเพชรได้' };
    }
    if ((user.gems || 0) < item.priceGems) {
      return { success: false, error: `เพชรไม่พอ (ต้องการ ${item.priceGems} เพชร, มีอยู่ ${user.gems} เพชร)` };
    }
    user.gems -= item.priceGems;
  } else {
    // Coins
    if (item.priceCoins > 0 && (user.coins || 0) < item.priceCoins) {
      return { success: false, error: `เหรียญทองไม่พอ (ต้องการ ${item.priceCoins} เหรียญ, มีอยู่ ${user.coins} เหรียญ)` };
    }
    user.coins -= item.priceCoins;
  }

  // Add to inventory
  if (itemType === 'avatar') {
    user.inventory.avatars.push(itemId);
    user.avatar = itemId; // Auto equip
  } else if (itemType === 'frame') {
    user.inventory.frames.push(itemId);
    user.frame = itemId; // Auto equip
  }

  saveUsers(users);
  return { success: true, user: sanitizeUser(user), message: `ซื้อและสวมใส่ ${item.name} สำเร็จ!` };
}

// Top-up gems (Mock checkout - DEPRECATED / DISABLED for direct player use)
function topupPackage(userId, packageId) {
  return { 
    success: false, 
    error: 'ระบบปิดการเติมเงินด้วยตนเอง กรุณาติดต่อแอดมินหรือทำรายการผ่านระบบ' 
  };
}

// Admin & System-Only Funds Management
function adminAddFunds(identifier, coinsToAdd = 0, gemsToAdd = 0) {
  const users = loadUsers();
  const user = users.find(u => u.username === identifier || u.id === identifier);
  if (!user) return { success: false, error: `ไม่พบผู้ใช้: ${identifier}` };

  user.coins = Math.max(0, (user.coins || 0) + Number(coinsToAdd || 0));
  user.gems = Math.max(0, (user.gems || 0) + Number(gemsToAdd || 0));

  saveUsers(users);
  return { 
    success: true, 
    user: sanitizeUser(user), 
    message: `เพิ่มเงินให้ผู้ใช้ ${user.username} สำเร็จ (+🪙 ${coinsToAdd}, +💎 ${gemsToAdd}) ยอดคงเหลือ: 🪙 ${user.coins.toLocaleString()}, 💎 ${user.gems.toLocaleString()}` 
  };
}

function adminSetFunds(identifier, coinsToSet, gemsToSet) {
  const users = loadUsers();
  const user = users.find(u => u.username === identifier || u.id === identifier);
  if (!user) return { success: false, error: `ไม่พบผู้ใช้: ${identifier}` };

  if (coinsToSet !== undefined && coinsToSet !== null) user.coins = Math.max(0, Number(coinsToSet));
  if (gemsToSet !== undefined && gemsToSet !== null) user.gems = Math.max(0, Number(gemsToSet));

  saveUsers(users);
  return { 
    success: true, 
    user: sanitizeUser(user), 
    message: `กำหนดเงินผู้ใช้ ${user.username} เป็น 🪙 ${user.coins.toLocaleString()}, 💎 ${user.gems.toLocaleString()} สำเร็จ` 
  };
}

// Record match rewards and level progression
function recordGameRewards(userId, result, mmrChange = 0) {
  const user = findUserById(userId);
  if (!user) return null;

  let coinsEarned = 0;
  let gemsEarned = 0;
  let expEarned = 0;

  if (result === 'win') {
    coinsEarned = 120;
    gemsEarned = 3;
    expEarned = 150;
    user.stats.wins = (user.stats.wins || 0) + 1;
  } else if (result === 'loss') {
    coinsEarned = 40;
    gemsEarned = 0;
    expEarned = 50;
    user.stats.losses = (user.stats.losses || 0) + 1;
  } else {
    // Draw
    coinsEarned = 70;
    gemsEarned = 1;
    expEarned = 80;
    user.stats.draws = (user.stats.draws || 0) + 1;
  }

  user.coins = (user.coins || 0) + coinsEarned;
  user.gems = (user.gems || 0) + gemsEarned;
  user.exp = (user.exp || 0) + expEarned;
  user.stats.matchCount = (user.stats.matchCount || 0) + 1;
  user.stats.mmr = Math.max(1000, (user.stats.mmr || 1200) + mmrChange);

  // Level progression (100 exp * level per level)
  const expNeeded = user.level * 200;
  let leveledUp = false;
  if (user.exp >= expNeeded) {
    user.level += 1;
    user.exp -= expNeeded;
    leveledUp = true;
    user.coins += user.level * 100;
    user.gems += 5;
  }

  saveUsers(users);

  return {
    coinsEarned,
    gemsEarned,
    expEarned,
    leveledUp,
    newLevel: user.level,
    user: sanitizeUser(user)
  };
}

module.exports = {
  AVATAR_CATALOG,
  FRAME_CATALOG,
  TOPUP_PACKAGES,
  registerUser,
  loginUser,
  findUserByToken,
  findUserById,
  findUserByUsername,
  updateProfile,
  buyShopItem,
  topupPackage,
  adminAddFunds,
  adminSetFunds,
  recordGameRewards,
  sanitizeUser
};
