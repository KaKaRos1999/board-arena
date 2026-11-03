/**
 * Gomoku / Five-in-a-Row (หมากเรียง 5) Engine
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GomokuEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 9; // 9x9 fast play grid

  function createInitialBoard(size = BOARD_SIZE) {
    return Array.from({ length: size }, () => new Array(size).fill(null));
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function isInBounds(r, c, size = BOARD_SIZE) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  const DIRS = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Main diagonal
    [1, -1]   // Anti diagonal
  ];

  function checkWinFromPoint(board, r, c) {
    const color = board[r][c];
    if (!color) return false;
    const size = board.length;

    for (const [dr, dc] of DIRS) {
      let count = 1;

      // Positive direction
      let nr = r + dr;
      let nc = c + dc;
      while (isInBounds(nr, nc, size) && board[nr][nc] === color) {
        count++;
        nr += dr;
        nc += dc;
      }

      // Negative direction
      nr = r - dr;
      nc = c - dc;
      while (isInBounds(nr, nc, size) && board[nr][nc] === color) {
        count++;
        nr -= dr;
        nc -= dc;
      }

      if (count >= 5) {
        return true;
      }
    }
    return false;
  }

  function applyMove(board, r, c, turnColor) {
    const size = board.length;
    if (!isInBounds(r, c, size) || board[r][c]) {
      return { success: false };
    }

    const color = turnColor === 'red' || turnColor === 'B' ? 'B' : 'W';
    const newBoard = cloneBoard(board);
    newBoard[r][c] = color;

    const isWin = checkWinFromPoint(newBoard, r, c);
    return {
      success: true,
      nextBoard: newBoard,
      isWin,
      winner: isWin ? (color === 'B' ? 'red' : 'blue') : null
    };
  }

  function checkGameOver(board) {
    const size = board.length;
    let hasEmpty = false;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c]) {
          if (checkWinFromPoint(board, r, c)) {
            return {
              over: true,
              winner: board[r][c] === 'B' ? 'red' : 'blue',
              reason: `หมากเรียง 5 ติดต่อกัน! ${board[r][c] === 'B' ? 'ฝ่ายดำ (แดง)' : 'ฝ่ายขาว (น้ำเงิน)'} ชนะ`
            };
          }
        } else {
          hasEmpty = true;
        }
      }
    }

    if (!hasEmpty) {
      return { over: true, winner: 'draw', reason: 'กระดานเต็ม เสมอกัน!' };
    }

    return { over: false };
  }

  function getLegalMoves(board) {
    const size = board.length;
    const moves = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) moves.push({ r, c });
      }
    }
    return moves;
  }

  // AI with threat evaluation (consecutive streaks & block opponent)
  function getBestAIMove(board, turnColor, difficulty = 'medium') {
    const size = board.length;
    const myColor = turnColor === 'red' || turnColor === 'B' ? 'B' : 'W';
    const oppColor = myColor === 'B' ? 'W' : 'B';

    const legal = getLegalMoves(board);
    if (legal.length === 0) return null;

    if (difficulty === 'easy') {
      return legal[Math.floor(Math.random() * legal.length)];
    }

    const center = Math.floor(size / 2);
    let bestMove = legal[0];
    let bestScore = -Infinity;

    for (const { r, c } of legal) {
      let score = 0;

      // Center proximity bonus
      score += (size - Math.abs(r - center) - Math.abs(c - center)) * 2;

      // Evaluate win / streaks for self
      const testSelf = cloneBoard(board);
      testSelf[r][c] = myColor;
      if (checkWinFromPoint(testSelf, r, c)) {
        return { r, c }; // WIN immediately!
      }

      // Evaluate block opponent win
      const testOpp = cloneBoard(board);
      testOpp[r][c] = oppColor;
      if (checkWinFromPoint(testOpp, r, c)) {
        score += 50000; // MUST BLOCK!
      }

      // Count streak lengths
      for (const [dr, dc] of DIRS) {
        let selfCount = 1;
        let oppCount = 1;
        for (let step = 1; step <= 3; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (isInBounds(nr, nc, size)) {
            if (board[nr][nc] === myColor) selfCount++;
            if (board[nr][nc] === oppColor) oppCount++;
          }
        }
        score += selfCount * 10 + oppCount * 8;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = { r, c };
      }
    }

    return bestMove;
  }

  return {
    BOARD_SIZE,
    createInitialBoard,
    cloneBoard,
    isInBounds,
    applyMove,
    checkGameOver,
    getLegalMoves,
    getBestAIMove
  };
});
