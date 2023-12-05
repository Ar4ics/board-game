import {v4 as uuid} from 'uuid';
import {Cell, Game, GameSize, PlayerScore} from '../model';
import {Move} from '../model/Move';

export function CreateGame(players: string[], size: GameSize): Omit<Game, 'moves'> {
  const { rows, cols } = size;
  const rows1 = [...Array(rows).keys()];
  const cols1 = [...Array(cols).keys()];

  const initialBoard: Cell[] = rows1.flatMap((row, rowIndex) => cols1.map((col, colIndex) => {
    return { id: uuid(), x: rowIndex, y: colIndex, cellType: 'normal' };
  }));

  return { id: uuid(), size, players, board: initialBoard, date: new Date() };
}

export function CalcScores(players: string[], board: Cell[]): PlayerScore[] {
  return players
    .map(player => {
      const playerCells = board.filter(cell => cell.color === player);
      const score = playerCells
        .reduce((sum, current) => sum + (current.value ?? 0), 0);
      const moves = playerCells.length;
      return { color: player, score, moves };
    });
}

export function GetForMove(game: Game, move: Move): [Cell[], PlayerScore[]] {
  const board = [...game.board];
  game.moves.slice(0, move.current).forEach(function({ move}) {
    const [index, value] = GetCell(board, game.size.cols, move);
    board[index] = {...value, color: move.player, cellType: move.cellType};
  });

  const result = board.map((item, index) => {
    if (!item.color)
    {
      return item;
    }

    switch(item.cellType) {
      case 'normal':
        return Calc(board, item, index, game.size, normalCellKeys(item));
      case 'knight':
        return Calc(board, item, index, game.size, knightCellKeys(item));
      case 'diamond':
        return Calc(board, item, index, game.size, diamondCellKeys(item));
      default:
        throw new Error(`Неизвестный тип ячейки: ${item.x}/${item.y}`);
    }
  });

  return [result, CalcScores(game.players, result)];
}

function normalCellKeys(cell: Cell) {
  return [
    {x: cell.x, y: cell.y+1},
    {x: cell.x+1, y: cell.y+1},
    {x: cell.x+1, y: cell.y},
    {x: cell.x+1, y: cell.y-1},
    {x: cell.x, y: cell.y-1},
    {x: cell.x-1, y: cell.y-1},
    {x: cell.x-1, y: cell.y},
    {x: cell.x-1, y: cell.y+1},
  ];
}

function knightCellKeys(cell: Cell) {
  return [
    {x: cell.x+1, y: cell.y+2},
    {x: cell.x+2, y: cell.y+1},
    {x: cell.x+2, y: cell.y-1},
    {x: cell.x+1, y: cell.y-2},
    {x: cell.x-1, y: cell.y-2},
    {x: cell.x-2, y: cell.y-1},
    {x: cell.x-2, y: cell.y+1},
    {x: cell.x-1, y: cell.y+2},
  ];
}

function diamondCellKeys(cell: Cell) {
  return [
    {x: cell.x, y: cell.y+2},
    {x: cell.x+1, y: cell.y+1},
    {x: cell.x+2, y: cell.y},
    {x: cell.x+1, y: cell.y-1},
    {x: cell.x, y: cell.y-2},
    {x: cell.x-1, y: cell.y-1},
    {x: cell.x-2, y: cell.y},
    {x: cell.x-1, y: cell.y+1},
  ];
}

function Calc(board: Cell[], cell: Cell, index: number, size: GameSize, keys: { x: number, y: number }[]): Cell {
  const rows = size.rows;
  const cols = size.cols;
  const cellsCount = keys.filter(key => {
    if (key.x < 0 || key.x >= rows || key.y < 0 || key.y >= cols)
    {
      return false;
    }

    const [, target] = GetCell(board, cols, key);
    return target.color === cell.color;
  }).length;

  return {...cell, value: cellsCount};
}

function GetCell(board: Cell[], cols: number, {x, y}: { x: number, y: number }): [number, Cell] {
  const index = x * cols + y;
  return [index, board[index]];
}