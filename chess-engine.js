/**
 * International Chess Engine for Thai Checkers Platform
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChessEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 8;

  // Pieces: 'K','Q','R','B','N','P' for White (Red/Player 1), 'k','q','r','b','n','p' for Black (Blue/Player 2)
  function createInitialBoard() {
    return [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'w' : 'b';
  }

  function getPieceType(piece) {
    if (!piece) return null;
    return piece.toLowerCase();
  }

  function isInBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  // Get raw pseudo-legal moves for a piece at (r, c)
  function getRawMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = getPieceColor(piece);
    const type = getPieceType(piece);
    const moves = [];

    const addMoveIfValid = (nr, nc) => {
      if (!isInBounds(nr, nc)) return false;
      const target = board[nr][nc];
      if (!target) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc } });
        return true; // continue sliding
      }
      if (getPieceColor(target) !== color) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target });
      }
      return false; // blocked
    };

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // 1 square forward
      const f1 = r + dir;
      if (isInBounds(f1, c) && !board[f1][c]) {
        moves.push({ from: { r, c }, to: { r: f1, c }, promotion: (color === 'w' && f1 === 0) || (color === 'b' && f1 === 7) });
        // 2 squares forward from start
        const f2 = r + 2 * dir;
        if (r === startRow && isInBounds(f2, c) && !board[f2][c]) {
          moves.push({ from: { r, c }, to: { r: f2, c } });
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (isInBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target && getPieceColor(target) !== color) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target, promotion: (color === 'w' && nr === 0) || (color === 'b' && nr === 7) });
          }
        }
      }
    } else if (type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        addMoveIfValid(r + dr, c + dc);
      }
    } else if (type === 'b') {
      const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (addMoveIfValid(nr, nc)) {
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'r') {
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (addMoveIfValid(nr, nc)) {
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'q') {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (addMoveIfValid(nr, nc)) {
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'k') {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];
      for (const [dr, dc] of directions) {
        addMoveIfValid(r + dr, c + dc);
      }
    }

    return moves;
  }

  // Find King pos
  function findKing(board, color) {
    const targetKing = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === targetKing) {
          return { r, c };
        }
      }
    }
    return null;
  }

  // Check if square is attacked by opponent
  function isSquareAttacked(board, r, c, attackerColor) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && getPieceColor(piece) === attackerColor) {
          const rawMoves = getRawMoves(board, row, col);
          if (rawMoves.some(m => m.to.r === r && m.to.c === c)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function isKingInCheck(board, color) {
    const kingPos = findKing(board, color);
    if (!kingPos) return true; // king captured / missing
    const opponent = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kingPos.r, kingPos.c, opponent);
  }

  // Apply move on board clone to check if King is left in check
  function applyMove(board, move, promotionChoice = 'q') {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.from.r][move.from.c];
    newBoard[move.from.r][move.from.c] = null;

    let placedPiece = piece;
    if (move.promotion) {
      const color = getPieceColor(piece);
      const choice = (promotionChoice || 'q').toLowerCase();
      placedPiece = color === 'w' ? choice.toUpperCase() : choice;
    }

    newBoard[move.to.r][move.to.c] = placedPiece;
    return newBoard;
  }

  // Legal moves considering check
  function getLegalMovesForSquare(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = getPieceColor(piece);
    const rawMoves = getRawMoves(board, r, c);

    return rawMoves.filter(m => {
      const testBoard = applyMove(board, m);
      return !isKingInCheck(testBoard, color);
    });
  }

  function getAllLegalMoves(board, turnColor) {
    const color = turnColor === 'red' || turnColor === 'w' ? 'w' : 'b';
    const allMoves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] && getPieceColor(board[r][c]) === color) {
          const moves = getLegalMovesForSquare(board, r, c);
          allMoves.push(...moves);
        }
      }
    }
    return allMoves;
  }

  function checkGameOver(board, turnColor) {
    const color = turnColor === 'red' || turnColor === 'w' ? 'w' : 'b';
    const legalMoves = getAllLegalMoves(board, color);
    if (legalMoves.length === 0) {
      if (isKingInCheck(board, color)) {
        return {
          over: true,
          winner: color === 'w' ? 'blue' : 'red',
          reason: 'checkmate'
        };
      } else {
        return {
          over: true,
          winner: 'draw',
          reason: 'stalemate'
        };
      }
    }
    return { over: false };
  }

  // AI Evaluation & Move Choice
  const PIECE_VALUES = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
  };

  function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const color = getPieceColor(piece);
        const val = PIECE_VALUES[getPieceType(piece)] || 0;
        // Center control bonus
        const centerBonus = (3.5 - Math.abs(3.5 - r)) + (3.5 - Math.abs(3.5 - c));
        const totalVal = val + centerBonus * 3;
        if (color === 'w') score += totalVal;
        else score -= totalVal;
      }
    }
    return score;
  }

  function getBestAIMove(board, turnColor, difficulty = 'medium') {
    const color = turnColor === 'red' || turnColor === 'w' ? 'w' : 'b';
    const moves = getAllLegalMoves(board, color);
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
      // Random move with slight preference for captures
      const captures = moves.filter(m => m.capture);
      if (captures.length > 0 && Math.random() < 0.6) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Minimax depth 2 for medium/hard
    const isMaximizing = color === 'w';
    let bestMove = moves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of moves) {
      const nextBoard = applyMove(board, move);
      const oppColor = color === 'w' ? 'b' : 'w';
      const oppMoves = getAllLegalMoves(nextBoard, oppColor);

      let score = 0;
      if (oppMoves.length === 0) {
        if (isKingInCheck(nextBoard, oppColor)) {
          score = isMaximizing ? 99999 : -99999;
        } else {
          score = 0;
        }
      } else {
        // Simple 1-ply response evaluation
        let bestOppScore = isMaximizing ? Infinity : -Infinity;
        for (const oppMove of oppMoves.slice(0, 15)) {
          const testBoard2 = applyMove(nextBoard, oppMove);
          const evalScore = evaluateBoard(testBoard2);
          if (isMaximizing) {
            if (evalScore < bestOppScore) bestOppScore = evalScore;
          } else {
            if (evalScore > bestOppScore) bestOppScore = evalScore;
          }
        }
        score = bestOppScore;
      }

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  return {
    BOARD_SIZE,
    createInitialBoard,
    cloneBoard,
    getPieceColor,
    getPieceType,
    getLegalMovesForSquare,
    getAllLegalMoves,
    applyMove,
    isKingInCheck,
    checkGameOver,
    getBestAIMove
  };
});
