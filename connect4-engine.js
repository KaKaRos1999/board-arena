/**
 * Connect Four (หมากเรียง 4) Engine
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Connect4Engine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROWS = 6;
  const COLS = 7;

  // Pieces: 'R' (Red / Player 1), 'Y' (Yellow / Blue / Player 2)
  function createInitialBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function isInBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  // Find lowest available row in a column
  function getDropRow(board, col) {
    if (col < 0 || col >= COLS) return -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) return r;
    }
    return -1; // Column full
  }

  function getLegalColumns(board) {
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      if (!board[0][c]) cols.push(c);
    }
    return cols;
  }

  const DIRS = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal down-right
    [1, -1]  // Diagonal down-left
  ];

  function checkWinFromPoint(board, r, c) {
    const piece = board[r][c];
    if (!piece) return false;

    for (const [dr, dc] of DIRS) {
      let count = 1;

      // Positive
      let nr = r + dr;
      let nc = c + dc;
      while (isInBounds(nr, nc) && board[nr][nc] === piece) {
        count++;
        nr += dr;
        nc += dc;
      }

      // Negative
      nr = r - dr;
      nc = c - dc;
      while (isInBounds(nr, nc) && board[nr][nc] === piece) {
        count++;
        nr -= dr;
        nc -= dc;
      }

      if (count >= 4) return true;
    }
    return false;
  }

  function applyDrop(board, col, turnColor) {
    const r = getDropRow(board, col);
    if (r === -1) return { success: false };

    const color = turnColor === 'red' || turnColor === 'R' ? 'R' : 'Y';
    const newBoard = cloneBoard(board);
    newBoard[r][col] = color;

    const isWin = checkWinFromPoint(newBoard, r, col);
    return {
      success: true,
      r,
      c: col,
      nextBoard: newBoard,
      isWin,
      winner: isWin ? (color === 'R' ? 'red' : 'blue') : null
    };
  }

  function checkGameOver(board) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] && checkWinFromPoint(board, r, c)) {
          return {
            over: true,
            winner: board[r][c] === 'R' ? 'red' : 'blue',
            reason: `เรียง 4 สำเร็จ! ฝ่าย${board[r][c] === 'R' ? 'สีแดง' : 'สีเหลือง (น้ำเงิน)'} ชนะ`
          };
        }
      }
    }

    if (getLegalColumns(board).length === 0) {
      return { over: true, winner: 'draw', reason: 'กระดานเต็ม เสมอกัน!' };
    }

    return { over: false };
  }

  // Connect 4 AI
  function getBestAIMove(board, turnColor, difficulty = 'medium') {
    const legalCols = getLegalColumns(board);
    if (legalCols.length === 0) return null;

    const myColor = turnColor === 'red' || turnColor === 'R' ? 'R' : 'Y';
    const oppColor = myColor === 'R' ? 'Y' : 'R';

    if (difficulty === 'easy') {
      return legalCols[Math.floor(Math.random() * legalCols.length)];
    }

    // 1. Immediate win
    for (const col of legalCols) {
      const r = getDropRow(board, col);
      const test = cloneBoard(board);
      test[r][col] = myColor;
      if (checkWinFromPoint(test, r, col)) {
        return col;
      }
    }

    // 2. Immediate block opponent win
    for (const col of legalCols) {
      const r = getDropRow(board, col);
      const test = cloneBoard(board);
      test[r][col] = oppColor;
      if (checkWinFromPoint(test, r, col)) {
        return col;
      }
    }

    // 3. Center preference & strategic streaks
    const centerOrder = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerOrder) {
      if (legalCols.includes(col)) {
        const r = getDropRow(board, col);
        // Avoid giving opponent win right on top of this move
        if (r > 0) {
          const testOpp = cloneBoard(board);
          testOpp[r - 1][col] = oppColor;
          if (checkWinFromPoint(testOpp, r - 1, col)) {
            continue; // don't set up opponent
          }
        }
        return col;
      }
    }

    return legalCols[0];
  }

  return {
    ROWS,
    COLS,
    createInitialBoard,
    cloneBoard,
    isInBounds,
    getDropRow,
    getLegalColumns,
    applyDrop,
    checkGameOver,
    getBestAIMove
  };
});
