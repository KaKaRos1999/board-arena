// Thai Checkers (หมากฮอสไทย) & International Rules Engine + AI

(function(exports) {
  'use strict';

  const BOARD_SIZE = 8;

  function createInitialBoard(ruleMode = 'thai') {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    if (ruleMode === 'thai') {
      // Thai Checkers: 8 pieces per player (2 rows each)
      // Blue (Player 2) on rows 0 and 1
      for (let r = 0; r <= 1; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            board[r][c] = { color: 'blue', isKing: false };
          }
        }
      }
      // Red (Player 1) on rows 6 and 7
      for (let r = 6; r <= 7; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            board[r][c] = { color: 'red', isKing: false };
          }
        }
      }
    } else {
      // International / Standard Checkers: 12 pieces per player (3 rows each)
      for (let r = 0; r <= 2; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            board[r][c] = { color: 'blue', isKing: false };
          }
        }
      }
      for (let r = 5; r <= 7; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if ((r + c) % 2 === 1) {
            board[r][c] = { color: 'red', isKing: false };
          }
        }
      }
    }

    return board;
  }

  function cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  function isInside(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  /**
   * Get all capture moves for a single piece at (r, c).
   */
  function getPieceCaptures(board, r, c, ruleMode = 'thai') {
    const piece = board[r][c];
    if (!piece) return [];
    const captures = [];
    const color = piece.color;
    const isKing = piece.isKing;

    if (!isKing) {
      // Regular piece captures
      // In Thai Checkers: regular piece can ONLY jump forward!
      const forwardDir = color === 'red' ? -1 : 1;
      const dirs = [[forwardDir, -1], [forwardDir, 1]];

      if (ruleMode === 'international') {
        dirs.push([-forwardDir, -1], [-forwardDir, 1]);
      }

      for (const [dr, dc] of dirs) {
        const midR = r + dr;
        const midC = c + dc;
        const endR = r + dr * 2;
        const endC = c + dc * 2;

        if (isInside(endR, endC)) {
          const midPiece = board[midR][midC];
          const endSquare = board[endR][endC];
          if (midPiece && midPiece.color !== color && endSquare === null) {
            captures.push({
              from: { r, c },
              to: { r: endR, c: endC },
              captured: { r: midR, c: midC },
              isCapture: true
            });
          }
        }
      }
    } else {
      // King (ฮอส): Flying King in Thai Checkers
      // Can fly diagonally any distance, jump over an opponent piece, and land on ANY empty square behind it
      const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

      for (const [dr, dc] of diagonals) {
        let step = 1;
        let enemyFound = null;

        while (isInside(r + step * dr, c + step * dc)) {
          const curR = r + step * dr;
          const curC = c + step * dc;
          const curPiece = board[curR][curC];

          if (!enemyFound) {
            if (curPiece) {
              if (curPiece.color === color) {
                // Friendly piece blocks the path
                break;
              } else {
                // Found an enemy piece!
                enemyFound = { r: curR, c: curC };
              }
            }
          } else {
            // Already found one enemy along this diagonal
            if (curPiece) {
              // Blocked by another piece behind the enemy
              break;
            } else {
              // Valid landing square behind the jumped enemy!
              captures.push({
                from: { r, c },
                to: { r: curR, c: curC },
                captured: { ...enemyFound },
                isCapture: true
              });
            }
          }
          step++;
        }
      }
    }

    return captures;
  }

  /**
   * Get all non-capture moves for a piece at (r, c).
   */
  function getPieceNormalMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const isKing = piece.isKing;

    if (!isKing) {
      // Regular piece moves 1 square diagonally forward
      const forwardDir = color === 'red' ? -1 : 1;
      const dirs = [[forwardDir, -1], [forwardDir, 1]];

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (isInside(nr, nc) && board[nr][nc] === null) {
          moves.push({
            from: { r, c },
            to: { r: nr, c: nc },
            isCapture: false
          });
        }
      }
    } else {
      // King moves diagonally any number of empty squares
      const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of diagonals) {
        let step = 1;
        while (isInside(r + step * dr, c + step * dc)) {
          const nr = r + step * dr;
          const nc = c + step * dc;
          if (board[nr][nc] === null) {
            moves.push({
              from: { r, c },
              to: { r: nr, c: nc },
              isCapture: false
            });
          } else {
            break; // Blocked
          }
          step++;
        }
      }
    }

    return moves;
  }

  /**
   * Get all legal moves for current turn.
   */
  function getAllLegalMoves(board, turn, ruleMode = 'thai', activePiece = null) {
    if (activePiece) {
      // Only active piece can make continuous captures
      const pieceCaptures = getPieceCaptures(board, activePiece.r, activePiece.c, ruleMode);
      return pieceCaptures;
    }

    const allCaptures = [];
    const allNormalMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece && piece.color === turn) {
          const captures = getPieceCaptures(board, r, c, ruleMode);
          if (captures.length > 0) {
            allCaptures.push(...captures);
          } else {
            const normal = getPieceNormalMoves(board, r, c);
            allNormalMoves.push(...normal);
          }
        }
      }
    }

    // In Thai Checkers, capture is mandatory!
    if (allCaptures.length > 0) {
      return allCaptures;
    }

    return allNormalMoves;
  }

  /**
   * Execute a move on the board.
   */
  function applyMove(board, move, ruleMode = 'thai') {
    const nextBoard = cloneBoard(board);
    const { from, to, isCapture, captured } = move;
    const piece = { ...nextBoard[from.r][from.c] };

    nextBoard[from.r][from.c] = null;

    if (isCapture && captured) {
      nextBoard[captured.r][captured.c] = null;
    }

    // Check promotion (เข้าฮอส)
    let crowned = false;
    const kingRow = piece.color === 'red' ? 0 : 7;
    if (!piece.isKing && to.r === kingRow) {
      piece.isKing = true;
      crowned = true;
    }

    nextBoard[to.r][to.c] = piece;

    // Check multi-jump
    let canContinueJump = false;
    let nextActivePiece = null;

    if (isCapture) {
      // In Thai checkers: if crowned on this step, turn ends immediately! (ขึ้นฮอสแล้วจบเทิร์น)
      if (!crowned) {
        const nextCaptures = getPieceCaptures(nextBoard, to.r, to.c, ruleMode);
        if (nextCaptures.length > 0) {
          canContinueJump = true;
          nextActivePiece = { r: to.r, c: to.c };
        }
      }
    }

    return {
      nextBoard,
      crowned,
      canContinueJump,
      nextActivePiece
    };
  }

  /**
   * Check game state status
   */
  function checkGameStatus(board, turn, ruleMode = 'thai', activePiece = null) {
    let redCount = 0;
    let blueCount = 0;
    let redKings = 0;
    let blueKings = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (p) {
          if (p.color === 'red') {
            redCount++;
            if (p.isKing) redKings++;
          } else {
            blueCount++;
            if (p.isKing) blueKings++;
          }
        }
      }
    }

    if (redCount === 0) {
      return { isGameOver: true, winner: 'blue', reason: 'หมากสีแดงหมดกระดาน' };
    }
    if (blueCount === 0) {
      return { isGameOver: true, winner: 'red', reason: 'หมากสีน้ำเงินหมดกระดาน' };
    }

    const legalMoves = getAllLegalMoves(board, turn, ruleMode, activePiece);
    if (legalMoves.length === 0) {
      const winner = turn === 'red' ? 'blue' : 'red';
      const loserName = turn === 'red' ? 'สีแดง' : 'สีน้ำเงิน';
      return { isGameOver: true, winner, reason: `${loserName} ไม่มีตาเดินที่ถูกต้อง` };
    }

    return {
      isGameOver: false,
      winner: null,
      redCount,
      blueCount,
      redKings,
      blueKings
    };
  }

  // ================= AI EVALUATION & MINIMAX =================

  function evaluateBoard(board, playerColor) {
    const opponentColor = playerColor === 'red' ? 'blue' : 'red';
    let score = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (!p) continue;

        let pieceScore = p.isKing ? 350 : 100;

        // Position bonus
        if (!p.isKing) {
          // Pawns advancing towards opponent side
          const advance = p.color === 'red' ? (7 - r) : r;
          pieceScore += advance * 6;

          // Back row defense bonus
          if ((p.color === 'red' && r === 7) || (p.color === 'blue' && r === 0)) {
            pieceScore += 8;
          }
        }

        // Center control
        if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
          pieceScore += 6;
        }

        if (p.color === playerColor) {
          score += pieceScore;
        } else {
          score -= pieceScore;
        }
      }
    }

    return score;
  }

  function minimax(board, depth, alpha, beta, isMaximizing, playerColor, ruleMode, activePiece = null) {
    const currentTurn = isMaximizing ? playerColor : (playerColor === 'red' ? 'blue' : 'red');
    const status = checkGameStatus(board, currentTurn, ruleMode, activePiece);

    if (status.isGameOver) {
      if (status.winner === playerColor) return 100000 + depth;
      if (status.winner) return -100000 - depth;
      return 0;
    }

    if (depth === 0) {
      return evaluateBoard(board, playerColor);
    }

    const moves = getAllLegalMoves(board, currentTurn, ruleMode, activePiece);
    if (moves.length === 0) {
      return isMaximizing ? -100000 : 100000;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const res = applyMove(board, move, ruleMode);
        let evalVal;
        if (res.canContinueJump) {
          // Same player continues jump!
          evalVal = minimax(res.nextBoard, depth, alpha, beta, true, playerColor, ruleMode, res.nextActivePiece);
        } else {
          // Switch player
          evalVal = minimax(res.nextBoard, depth - 1, alpha, beta, false, playerColor, ruleMode, null);
        }
        maxEval = Math.max(maxEval, evalVal);
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const res = applyMove(board, move, ruleMode);
        let evalVal;
        if (res.canContinueJump) {
          // Same opponent continues jump
          evalVal = minimax(res.nextBoard, depth, alpha, beta, false, playerColor, ruleMode, res.nextActivePiece);
        } else {
          evalVal = minimax(res.nextBoard, depth - 1, alpha, beta, true, playerColor, ruleMode, null);
        }
        minEval = Math.min(minEval, evalVal);
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function getBestAIMove(board, turn, difficulty = 'medium', ruleMode = 'thai', activePiece = null) {
    const legalMoves = getAllLegalMoves(board, turn, ruleMode, activePiece);
    if (legalMoves.length === 0) return null;

    if (difficulty === 'easy') {
      // Pick random legal move, with small preference for captures
      const captures = legalMoves.filter(m => m.isCapture);
      if (captures.length > 0) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const depth = difficulty === 'hard' ? 4 : 2;
    let bestMoves = [];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      const res = applyMove(board, move, ruleMode);
      let score;
      if (res.canContinueJump) {
        score = minimax(res.nextBoard, depth, -Infinity, Infinity, true, turn, ruleMode, res.nextActivePiece);
      } else {
        score = minimax(res.nextBoard, depth - 1, -Infinity, Infinity, false, turn, ruleMode, null);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // Export
  exports.BOARD_SIZE = BOARD_SIZE;
  exports.createInitialBoard = createInitialBoard;
  exports.cloneBoard = cloneBoard;
  exports.isInside = isInside;
  exports.getPieceCaptures = getPieceCaptures;
  exports.getPieceNormalMoves = getPieceNormalMoves;
  exports.getAllLegalMoves = getAllLegalMoves;
  exports.applyMove = applyMove;
  exports.checkGameStatus = checkGameStatus;
  exports.getBestAIMove = getBestAIMove;

})(typeof exports === 'undefined' ? (this.CheckersEngine = {}) : exports);
