/**
 * Makruk (Thai Chess - หมากรุกไทย) Engine
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MakrukEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 8;

  /**
   * Piece notations:
   * White/Red (Player 1, bottom):
   *   'K': ขุน (Khun - King)
   *   'M': เม็ด (Met - Queen/Counselor)
   *   'S': โคน (Khon - Noble/General)
   *   'H': ม้า (Ma - Horse/Knight)
   *   'R': เรือ (Ruea - Boat/Rook)
   *   'P': เบี้ยคว่ำ (Bia - Pawn)
   *   'F': เบี้ยหงาย (Bia Ngai - Promoted Pawn)
   * 
   * Black/Blue (Player 2, top):
   *   'k','m','s','h','r','p','f'
   */

  function createInitialBoard() {
    return [
      // Row 0: Blue Back Rank
      ['r', 'h', 's', 'k', 'm', 's', 'h', 'r'],
      // Row 1: Empty
      [null, null, null, null, null, null, null, null],
      // Row 2: Blue Bia (Rank 6)
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      // Rows 3-4: Empty middle
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      // Row 5: Red Bia (Rank 3)
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      // Row 6: Empty
      [null, null, null, null, null, null, null, null],
      // Row 7: Red Back Rank
      ['R', 'H', 'S', 'M', 'K', 'S', 'H', 'R']
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
    return piece.toUpperCase();
  }

  function isInBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  // Raw pseudo-legal moves for Makruk piece at (r, c)
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
        return true;
      }
      if (getPieceColor(target) !== color) {
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target });
      }
      return false;
    };

    if (type === 'P') {
      // เบี้ยคว่ำ (Bia): Red moves up (r - 1), Blue moves down (r + 1)
      const dir = color === 'w' ? -1 : 1;
      const fRow = r + dir;
      // Promotion row: Red promotes at row <= 2, Blue promotes at row >= 5
      const isPromote = (color === 'w' && fRow <= 2) || (color === 'b' && fRow >= 5);

      // Walk 1 step forward (NO double step in Thai chess)
      if (isInBounds(fRow, c) && !board[fRow][c]) {
        moves.push({ from: { r, c }, to: { r: fRow, c }, promotion: isPromote });
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (isInBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target && getPieceColor(target) !== color) {
            moves.push({ from: { r, c }, to: { r: nr, c: nc }, capture: target, promotion: isPromote });
          }
        }
      }
    } else if (type === 'M' || type === 'F') {
      // เม็ด (Met) & เบี้ยหงาย (Bia Ngai): 1 step diagonally in all 4 directions
      const diagDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of diagDirections) {
        addMoveIfValid(r + dr, c + dc);
      }
    } else if (type === 'S') {
      // โคน (Khon): 1 step forward + 4 diagonals (5 directions)
      const forwardDir = color === 'w' ? -1 : 1;
      const khonDirs = [
        [forwardDir, 0], // Forward
        [-1, -1], [-1, 1], [1, -1], [1, 1] // 4 diagonals
      ];
      for (const [dr, dc] of khonDirs) {
        addMoveIfValid(r + dr, c + dc);
      }
    } else if (type === 'H') {
      // ม้า (Horse/Ma): Standard Knight L-shape moves
      const horseOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of horseOffsets) {
        addMoveIfValid(r + dr, c + dc);
      }
    } else if (type === 'R') {
      // เรือ (Ruea/Boat): Orthogonal slides (same as Rook)
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        let nr = r + dr;
        let nc = c + dc;
        while (addMoveIfValid(nr, nc)) {
          nr += dr;
          nc += dc;
        }
      }
    } else if (type === 'K') {
      // ขุน (Khun/King): 1 step in all 8 directions
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
    if (!kingPos) return true;
    const opponent = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(board, kingPos.r, kingPos.c, opponent);
  }

  function applyMove(board, move) {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.from.r][move.from.c];
    newBoard[move.from.r][move.from.c] = null;

    let placedPiece = piece;
    if (move.promotion) {
      const color = getPieceColor(piece);
      // Bia promotes to Bia Ngai ('F' for white, 'f' for black)
      placedPiece = color === 'w' ? 'F' : 'f';
    }

    newBoard[move.to.r][move.to.c] = placedPiece;
    return newBoard;
  }

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
          allMoves.push(...getLegalMovesForSquare(board, r, c));
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

  // Makruk AI
  const PIECE_VALUES = {
    P: 100, F: 200, M: 200, S: 350, H: 450, R: 700, K: 25000
  };

  function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const color = getPieceColor(piece);
        const type = getPieceType(piece);
        const val = PIECE_VALUES[type] || 0;
        const centerBonus = (3.5 - Math.abs(3.5 - r)) + (3.5 - Math.abs(3.5 - c));
        const total = val + centerBonus * 2;
        if (color === 'w') score += total;
        else score -= total;
      }
    }
    return score;
  }

  function getBestAIMove(board, turnColor, difficulty = 'medium') {
    const color = turnColor === 'red' || turnColor === 'w' ? 'w' : 'b';
    const moves = getAllLegalMoves(board, color);
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
      const captures = moves.filter(m => m.capture);
      if (captures.length > 0 && Math.random() < 0.6) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

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
