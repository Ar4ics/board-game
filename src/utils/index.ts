import {v4 as uuid} from 'uuid';
import {Cell, Game, GameSize, PlayerScore} from '../model';

export function CreateGame(players: string[], size: GameSize): Game {
  const { rows, cols } = size;
  const rows1 = [...Array(rows).keys()];
  const cols1 = [...Array(cols).keys()];

  const initialBoard: Cell[] = rows1.flatMap((row, rowIndex) => cols1.map((col, colIndex) => {
    return { id: uuid(), x: rowIndex, y: colIndex, orderNumber: rowIndex * cols + colIndex };
  }));

  return { id: uuid(), size, players, board: initialBoard, snapshots: []};
}

export function CalcScores(players: string[], board: Cell[]): PlayerScore[] {
  return players
    .map(player => {
      const score = board
        .filter(cell => cell.color === player)
        .reduce((sum, current) => sum + (current.value ?? 0), 0);
      return { color: player, score };
    });
}