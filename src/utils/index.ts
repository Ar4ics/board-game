import {v4 as uuid} from 'uuid';
import {
  Cell,
  Game,
  GameSize,
  isCompetitive,
  Player,
  PlayerScore,
  QuestionSnapshot,
  XY
} from '../model';
import {Move} from '../model/Move';
import questions from './questions.json';

export type Question = typeof questions[0] & { id: string };

export function CreateGame(players: Player[], size: GameSize): Omit<Game, 'moves' | 'questions' | 'answers'> {
  const { rows, cols } = size;

  const questionsCount = Math.floor(rows * cols / 2);
  const random = CalcRandom(questionsCount, size);

  const rows1 = [...Array(rows).keys()];
  const cols1 = [...Array(cols).keys()];

  const initialBoard: Cell[] = rows1.flatMap((row, rowIndex) => cols1.map((col, colIndex) => {
    const index = GetIndex(cols, {x: rowIndex,y: colIndex});
    const questionType = random.indexOf(index) === -1 ? 'normal' : 'competitive';
    return { id: uuid(), x: rowIndex, y: colIndex, cellType: 'normal', questionType };
  }));

  const level = GetRandomLevel();
  const question = GetRandomQuestion(level);

  return { id: uuid(), size, players, board: initialBoard, date: new Date(), movePlayer: players[0], question };
}

export function CalcRandom(questionsCount: number, size: GameSize) {
  const arr = [];
  while(arr.length < questionsCount) {
    const r = Math.floor(Math.random() * size.rows * size.cols);
    if (arr.indexOf(r) === -1) {
      arr.push(r);
    }
  }
  return arr;
}

export function GetWinners(board: Cell[], scores: PlayerScore[]): Player[] | undefined {
  const freeCellsCount = board.length - board.filter(cell => cell.color).length;
  if (freeCellsCount === 0) {
    const scoredSorted = [...scores].sort((n1,n2) => n2.score - n1.score);
    const max = scoredSorted[0];
    return scoredSorted.filter(score => score.score === max.score).map(score => score.player);
  }

  return undefined;
}

export function GetRandomQuestion(level: number): Question {
  const qs = questions.filter(q => q.level === level);
  const question = qs[Math.floor(Math.random() * qs.length)];
  return {id: uuid(), ...question};
}

export function GetRandomLevel(): number {
  return Math.floor(Math.random() * 15) + 1;
}

export function GetCurrentQuestionSnapshot(game: Game): QuestionSnapshot | undefined {
  const lastQuestion = game.questions.at(-1);
  if (!lastQuestion) {
    return undefined;
  }

  const move = game.moves.find(function ({move}) {
    return lastQuestion.move.x === move.x &&
           lastQuestion.move.y === move.y;
  });

  if (move) {
    return undefined;
  }

  const players = isCompetitive(lastQuestion.questionType) ? game.players : [lastQuestion.move.player];
  const answers = game.answers.filter(answer => answer.question === lastQuestion.question.id);
  const allPlayersAnswered = players.filter(player => answers.some(answer => answer.player.color === player.color)).length === players.length;

  if (allPlayersAnswered) {
    return undefined;
  }

  return lastQuestion;
}

export function CalcScores(players: Player[], board: Cell[]): PlayerScore[] {
  return players
    .map(player => {
      const playerCells = board.filter(cell => cell.color === player.color);
      const score = playerCells
        .reduce((sum, current) => sum + (current.value ?? 0), 0);
      const moves = playerCells.length;
      return { player, score, moves };
    });
}

export function GetForMove(game: Game, move: Move): [Cell[], PlayerScore[]] {
  const board = [...game.board];
  game.moves.slice(0, move.current).forEach(function({ move, value}) {
    const [index, cell] = GetCell(board, game.size.cols, move);
    board[index] = {...cell, color: move.player.color, cellType: move.cellType, value};
  });

  const result = board;

  // const result = board.map((item, index) => {
  //   if (!item.color)
  //   {
  //     return item;
  //   }
  //
  //   switch(item.cellType) {
  //     case 'normal':
  //       return Calc(board, item, index, game.size, normalCellKeys(item));
  //     case 'knight':
  //       return Calc(board, item, index, game.size, knightCellKeys(item));
  //     case 'diamond':
  //       return Calc(board, item, index, game.size, diamondCellKeys(item));
  //     default:
  //       throw new Error(`Неизвестный тип ячейки: ${item.x}/${item.y}`);
  //   }
  // });

  return [result, CalcScores(game.players, result)];
}

// function normalCellKeys(cell: Cell) {
//   return [
//     {x: cell.x, y: cell.y+1},
//     {x: cell.x+1, y: cell.y+1},
//     {x: cell.x+1, y: cell.y},
//     {x: cell.x+1, y: cell.y-1},
//     {x: cell.x, y: cell.y-1},
//     {x: cell.x-1, y: cell.y-1},
//     {x: cell.x-1, y: cell.y},
//     {x: cell.x-1, y: cell.y+1},
//   ];
// }
//
// function knightCellKeys(cell: Cell) {
//   return [
//     {x: cell.x+1, y: cell.y+2},
//     {x: cell.x+2, y: cell.y+1},
//     {x: cell.x+2, y: cell.y-1},
//     {x: cell.x+1, y: cell.y-2},
//     {x: cell.x-1, y: cell.y-2},
//     {x: cell.x-2, y: cell.y-1},
//     {x: cell.x-2, y: cell.y+1},
//     {x: cell.x-1, y: cell.y+2},
//   ];
// }
//
// function diamondCellKeys(cell: Cell) {
//   return [
//     {x: cell.x, y: cell.y+2},
//     {x: cell.x+1, y: cell.y+1},
//     {x: cell.x+2, y: cell.y},
//     {x: cell.x+1, y: cell.y-1},
//     {x: cell.x, y: cell.y-2},
//     {x: cell.x-1, y: cell.y-1},
//     {x: cell.x-2, y: cell.y},
//     {x: cell.x-1, y: cell.y+1},
//   ];
// }
//
// function Calc(board: Cell[], cell: Cell, index: number, size: GameSize, keys: XY[]): Cell {
//   const rows = size.rows;
//   const cols = size.cols;
//   const cellsCount = keys.filter(key => {
//     if (key.x < 0 || key.x >= rows || key.y < 0 || key.y >= cols)
//     {
//       return false;
//     }
//
//     const [, target] = GetCell(board, cols, key);
//     return target.color === cell.color;
//   }).length;
//
//   return {...cell, value: cellsCount};
// }

function GetCell(board: Cell[], cols: number, xy: XY): [number, Cell] {
  const index = GetIndex(cols, xy);
  return [index, board[index]];
}

function GetIndex(cols: number, {x, y}: XY) {
  return x * cols + y;
}