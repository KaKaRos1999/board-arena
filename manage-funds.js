/**
 * Admin CLI: Manage User Funds (Coins & Gems)
 * Usage:
 *   node manage-funds.js add <username> <coins> <gems>    - เพิ่มเงินให้ผู้เล่น
 *   node manage-funds.js set <username> <coins> <gems>    - กำหนดเงินให้ผู้เล่น
 *   node manage-funds.js reset <username>                - รีเซ็ตเงินผู้เล่นเป็นค่าเริ่มต้น (1,000 เหรียญ / 50 เพชร)
 *   node manage-funds.js list                            - ดูรายชื่อและยอดเงินทุกคนในระบบ
 */
const userSystem = require('./user-system.js');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = (args[0] || '').toLowerCase();
const username = args[1];

if (command === 'list') {
  const usersPath = path.join(__dirname, 'users.json');
  if (!fs.existsSync(usersPath)) {
    console.log('ยังไม่มีข้อมูลผู้เล่นในระบบ');
    process.exit(0);
  }
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  console.log('====================================================');
  console.log('       📋 รายชื่อผู้เล่นและยอดเงินในระบบทั้งหมด        ');
  console.log('====================================================');
  if (users.length === 0) {
    console.log('ไม่มีผู้เล่น');
  } else {
    users.forEach((u, idx) => {
      console.log(`${idx + 1}. [${u.username}] ${u.displayName} | 🪙 เหรียญ: ${(u.coins || 0).toLocaleString()} | 💎 เพชร: ${(u.gems || 0).toLocaleString()} | Lv.${u.level || 1} (${u.stats?.mmr || 1200} RP)`);
    });
  }
  console.log('====================================================');
  process.exit(0);
}

if (!command || !username) {
  console.log(`
====================================================
        🛠️ คำสั่งจัดการเงินผู้เล่น (Admin Funds CLI)
====================================================
  node manage-funds.js add <username> <coins> <gems>
    -> เพิ่มเหรียญและเพชรให้ผู้เล่น เช่น:
       node manage-funds.js add mena1156 500 50

  node manage-funds.js set <username> <coins> <gems>
    -> กำหนดยอดเงินที่แน่นอนให้ผู้เล่น เช่น:
       node manage-funds.js set mena1156 1000 50

  node manage-funds.js reset <username>
    -> รีเซ็ตเงินกลับเป็นค่าเริ่มต้น (1,000 เหรียญ / 50 เพชร)

  node manage-funds.js list
    -> แสดงรายชื่อและยอดเงินผู้เล่นทุกคน
====================================================
  `);
  process.exit(0);
}

if (command === 'add') {
  const coins = parseInt(args[2], 10) || 0;
  const gems = parseInt(args[3], 10) || 0;
  const res = userSystem.adminAddFunds(username, coins, gems);
  console.log(res.message || res.error);
} else if (command === 'set') {
  const coins = parseInt(args[2], 10) || 0;
  const gems = parseInt(args[3], 10) || 0;
  const res = userSystem.adminSetFunds(username, coins, gems);
  console.log(res.message || res.error);
} else if (command === 'reset') {
  const res = userSystem.adminSetFunds(username, 1000, 50);
  console.log(res.message || `รีเซ็ตเงินผู้ใช้ ${username} เรียบร้อย: 🪙 1,000 เหรียญ / 💎 50 เพชร`);
} else {
  console.log('❌ คำสั่งไม่ถูกต้อง กรุณาใช้ add, set, reset หรือ list');
}
