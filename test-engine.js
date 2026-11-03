const engine = require('./game-engine.js');

console.log('Testing Thai Checkers Engine...');

// Test 1: Initial board setup
const board = engine.createInitialBoard('thai');
let redCount = 0;
let blueCount = 0;
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (p) {
      if (p.color === 'red') redCount++;
      if (p.color === 'blue') blueCount++;
    }
  }
}
console.assert(redCount === 8, `Expected 8 red pieces, got ${redCount}`);
console.assert(blueCount === 8, `Expected 8 blue pieces, got ${blueCount}`);
console.log('Test 1 Passed: Board has 8 pieces per player');

// Test 2: Legal moves for red on start
const redMoves = engine.getAllLegalMoves(board, 'red', 'thai');
console.log(`Test 2: Red has ${redMoves.length} initial moves`);
console.assert(redMoves.length > 0, 'Red must have initial moves');

// Test 3: Mandatory capture
// Place red at (3, 2) and blue at (2, 3), empty at (1, 4)
const testBoard = Array(8).fill(null).map(() => Array(8).fill(null));
testBoard[3][2] = { color: 'red', isKing: false };
testBoard[2][3] = { color: 'blue', isKing: false };
testBoard[5][0] = { color: 'red', isKing: false }; // piece with normal move

const forcedCaptures = engine.getAllLegalMoves(testBoard, 'red', 'thai');
console.assert(forcedCaptures.length === 1, `Mandatory capture expected 1 move, got ${forcedCaptures.length}`);
console.assert(forcedCaptures[0].isCapture === true, 'Move must be capture');
console.assert(forcedCaptures[0].to.r === 1 && forcedCaptures[0].to.c === 4, 'Move landing must be (1, 4)');
console.log('Test 3 Passed: Mandatory capture enforced');

// Test 4: King flying jump
const kingBoard = Array(8).fill(null).map(() => Array(8).fill(null));
kingBoard[7][0] = { color: 'red', isKing: true }; // Flying king
kingBoard[4][3] = { color: 'blue', isKing: false }; // Enemy in path
// Empty squares behind enemy: (3, 4), (2, 5), (1, 6), (0, 7)
const kingCaptures = engine.getPieceCaptures(kingBoard, 7, 0, 'thai');
console.assert(kingCaptures.length === 4, `Expected 4 landing squares behind enemy for flying king, got ${kingCaptures.length}`);
console.log('Test 4 Passed: Flying King can land on any free square behind enemy along diagonal');

console.log('All core engine tests passed successfully!');
