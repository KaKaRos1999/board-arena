/**
 * Go / Weiqi (หมากล้อม) Engine
 * Runs in both Node.js and Browser.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GoEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_SIZE = 9; // Default 9x9 for quick browser gameplay, supports 9, 13, 19

  function createInitialBoard(size = DEFAULT_SIZE) {
    const board = [];
    for (let r = 0; r < size; r++) {
      board.push(new Array(size).fill(null));
    }
    return board;
  }

  function cloneBoard(board) {
    return board.map(row => row.slice());
  }

  function isInBounds(r, c, size) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Find connected group and liberties
  function getGroup(board, r, c) {
    const size = board.length;
    const color = board[r][c];
    if (!color) return { stones: [], liberties: new Set() };

    const stones = [];
    const liberties = new Set();
    const visited = new Set();
    const queue = [[r, c]];
    visited.add(`${r},${c}`);

    while (queue.length > 0) {
      const [currR, currC] = queue.shift();
      stones.push({ r: currR, c: currC });

      for (const [dr, dc] of DIRS) {
        const nr = currR + dr;
        const nc = currC + dc;
        if (!isInBounds(nr, nc, size)) continue;

        const neighbor = board[nr][nc];
        const key = `${nr},${nc}`;
        if (!neighbor) {
          liberties.add(key);
        } else if (neighbor === color && !visited.has(key)) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    return { stones, liberties };
  }

  // Play a move: returns { success, newBoard, captured: [] } or { success: false, reason }
  function playMove(board, r, c, color, prevBoardHash = null) {
    const size = board.length;
    if (!isInBounds(r, c, size)) return { success: false, reason: 'out_of_bounds' };
    if (board[r][c]) return { success: false, reason: 'occupied' };

    const opponentColor = color === 'B' ? 'W' : 'B';
    const testBoard = cloneBoard(board);
    testBoard[r][c] = color;

    // Check if move captures any opponent groups
    const capturedStones = [];
    const checkedGroups = new Set();

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!isInBounds(nr, nc, size)) continue;
      if (testBoard[nr][nc] === opponentColor) {
        const key = `${nr},${nc}`;
        if (checkedGroups.has(key)) continue;

        const group = getGroup(testBoard, nr, nc);
        group.stones.forEach(s => checkedGroups.add(`${s.r},${s.c}`));

        if (group.liberties.size === 0) {
          // Captured!
          for (const stone of group.stones) {
            testBoard[stone.r][stone.c] = null;
            capturedStones.push(stone);
          }
        }
      }
    }

    // Check suicide rule: our newly placed group must have at least 1 liberty
    const myGroup = getGroup(testBoard, r, c);
    if (myGroup.liberties.size === 0) {
      return { success: false, reason: 'suicide' };
    }

    // Check Ko rule
    const newHash = getBoardHash(testBoard);
    if (prevBoardHash && newHash === prevBoardHash) {
      return { success: false, reason: 'ko' };
    }

    return {
      success: true,
      newBoard: testBoard,
      captured: capturedStones,
      hash: newHash
    };
  }

  function getBoardHash(board) {
    return board.map(row => row.map(cell => cell || '.').join('')).join('');
  }

  function getLegalMoves(board, color, prevBoardHash = null) {
    const size = board.length;
    const moves = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!board[r][c]) {
          const res = playMove(board, r, c, color, prevBoardHash);
          if (res.success) {
            moves.push({ r, c, capturedCount: res.captured.length });
          }
        }
      }
    }
    return moves;
  }

  // Calculate territory and score
  function calculateScore(board, captures = { B: 0, W: 0 }, komi = 5.5) {
    const size = board.length;
    const visited = new Set();
    const territory = { B: 0, W: 0, neutral: 0 };
    let stonesB = 0;
    let stonesW = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 'B') stonesB++;
        else if (board[r][c] === 'W') stonesW++;
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (visited.has(key) || board[r][c]) continue;

        // Flood fill empty area
        const emptyPoints = [];
        const neighboringColors = new Set();
        const queue = [[r, c]];
        visited.add(key);

        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
          emptyPoints.push({ r: currR, c: currC });

          for (const [dr, dc] of DIRS) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (!isInBounds(nr, nc, size)) continue;

            const nCell = board[nr][nc];
            const nKey = `${nr},${nc}`;
            if (!nCell) {
              if (!visited.has(nKey)) {
                visited.add(nKey);
                queue.push([nr, nc]);
              }
            } else {
              neighboringColors.add(nCell);
            }
          }
        }

        if (neighboringColors.size === 1) {
          const owner = neighboringColors.values().next().value;
          territory[owner] += emptyPoints.length;
        } else {
          territory.neutral += emptyPoints.length;
        }
      }
    }

    const blackScore = territory.B + stonesB + (captures.B || 0);
    const whiteScore = territory.W + stonesW + (captures.W || 0) + komi;

    return {
      territory,
      stones: { B: stonesB, W: stonesW },
      captures: { B: captures.B || 0, W: captures.W || 0 },
      komi,
      blackScore,
      whiteScore,
      winner: blackScore >= whiteScore ? 'red' : 'blue', // red is Black, blue is White
      margin: Math.abs(blackScore - whiteScore)
    };
  }

  // Simple Go AI
  function getBestAIMove(board, color, prevBoardHash = null, difficulty = 'medium') {
    const legalMoves = getLegalMoves(board, color, prevBoardHash);
    if (legalMoves.length === 0) return null; // pass

    // Prefer moves that capture stones
    const capturingMoves = legalMoves.filter(m => m.capturedCount > 0);
    if (capturingMoves.length > 0) {
      capturingMoves.sort((a, b) => b.capturedCount - a.capturedCount);
      return capturingMoves[0];
    }

    const size = board.length;
    const center = (size - 1) / 2;

    // Score moves by shape, liberties, and proximity to stones
    const scoredMoves = legalMoves.map(m => {
      let score = 0;
      // Distance to center (prefer 3rd/4th line and near center)
      const distToCenter = Math.abs(m.r - center) + Math.abs(m.c - center);
      score += (size - distToCenter);

      // Check liberties after move
      const res = playMove(board, m.r, m.c, color, prevBoardHash);
      if (res.success) {
        const group = getGroup(res.newBoard, m.r, m.c);
        score += group.liberties.size * 2;
        // Avoid self-atari (1 liberty) unless easy
        if (group.liberties.size === 1 && difficulty !== 'easy') {
          score -= 50;
        }
      }

      // Proximity to friendly stones
      for (const [dr, dc] of DIRS) {
        const nr = m.r + dr;
        const nc = m.c + dc;
        if (isInBounds(nr, nc, size) && board[nr][nc] === color) {
          score += 3;
        }
      }

      return { move: m, score: score + (Math.random() * 2) };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  return {
    DEFAULT_SIZE,
    createInitialBoard,
    cloneBoard,
    isInBounds,
    getGroup,
    playMove,
    getBoardHash,
    getLegalMoves,
    calculateScore,
    getBestAIMove
  };
});
