/**
 * Othello / Reversi (โอเทลโล่) Engine
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OthelloEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 8;
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  // Pieces: 'B' (Black / Red/Player 1), 'W' (White / Blue/Player 2)
  function createInitialBoard() {
    const board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(null));
    board[3][3] = 'W';
    board[3][4] = 'B';
    board[4][3] = 'B';
    board[4][4] = 'W';
    return board;
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function isInBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  // Get flipped stones if a move is made at (r, c)
  function getFlipsForMove(board, r, c, color) {
    if (!isInBounds(r, c) || board[r][c]) return [];
    const opponent = color === 'B' ? 'W' : 'B';
    const totalFlips = [];

    for (const [dr, dc] of DIRS) {
      const dirFlips = [];
      let nr = r + dr;
      let nc = c + dc;

      while (isInBounds(nr, nc) && board[nr][nc] === opponent) {
        dirFlips.push({ r: nr, c: nc });
        nr += dr;
        nc += dc;
      }

      if (isInBounds(nr, nc) && board[nr][nc] === color && dirFlips.length > 0) {
        totalFlips.push(...dirFlips);
      }
    }

    return totalFlips;
  }

  function getLegalMoves(board, turnColor) {
    const color = turnColor === 'red' || turnColor === 'B' ? 'B' : 'W';
    const moves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const flips = getFlipsForMove(board, r, c, color);
        if (flips.length > 0) {
          moves.push({ r, c, flipsCount: flips.length, flips });
        }
      }
    }
    return moves;
  }

  function applyMove(board, r, c, turnColor) {
    const color = turnColor === 'red' || turnColor === 'B' ? 'B' : 'W';
    const flips = getFlipsForMove(board, r, c, color);
    if (flips.length === 0) return { success: false };

    const newBoard = cloneBoard(board);
    newBoard[r][c] = color;
    for (const pos of flips) {
      newBoard[pos.r][pos.c] = color;
    }

    return {
      success: true,
      nextBoard: newBoard,
      flippedCount: flips.length
    };
  }

  function countDiscs(board) {
    let B = 0;
    let W = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 'B') B++;
        else if (board[r][c] === 'W') W++;
      }
    }
    return { B, W, total: B + W };
  }

  function checkGameOver(board) {
    const bMoves = getLegalMoves(board, 'B');
    const wMoves = getLegalMoves(board, 'W');
    const counts = countDiscs(board);

    if (bMoves.length === 0 && wMoves.length === 0) {
      let winner = 'draw';
      if (counts.B > counts.W) winner = 'red';
      else if (counts.W > counts.B) winner = 'blue';

      return {
        over: true,
        winner,
        counts,
        reason: `จบเกม! ดำ: ${counts.B} เม็ด vs ขาว: ${counts.W} เม็ด`
      };
    }
    return { over: false, counts };
  }

  // Positional weights table for AI
  const WEIGHTS = [
    [100, -20,  10,   5,   5,  10, -20, 100],
    [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
    [ 10,  -2,   1,   1,   1,   1,  -2,  10],
    [  5,  -2,   1,   0,   0,   1,  -2,   5],
    [  5,  -2,   1,   0,   0,   1,  -2,   5],
    [ 10,  -2,   1,   1,   1,   1,  -2,  10],
    [-20, -50,  -2,  -2,  -2,  -2, -50, -20],
    [100, -20,  10,   5,   5,  10, -20, 100]
  ];

  function getBestAIMove(board, turnColor, difficulty = 'medium') {
    const color = turnColor === 'red' || turnColor === 'B' ? 'B' : 'W';
    const moves = getLegalMoves(board, color);
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Score moves with positional weights and flip counts
    moves.sort((a, b) => {
      const scoreA = WEIGHTS[a.r][a.c] + a.flipsCount * (difficulty === 'hard' ? 2 : 1);
      const scoreB = WEIGHTS[b.r][b.c] + b.flipsCount * (difficulty === 'hard' ? 2 : 1);
      return scoreB - scoreA;
    });

    return moves[0];
  }

  return {
    BOARD_SIZE,
    createInitialBoard,
    cloneBoard,
    isInBounds,
    getFlipsForMove,
    getLegalMoves,
    applyMove,
    countDiscs,
    checkGameOver,
    getBestAIMove
  };
});
