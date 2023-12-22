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
import _ from 'lodash';

export type Question = typeof questions[0];

export function CreateGame(players: Player[], size: GameSize): Omit<Game, 'moves' | 'moveAttempts' | 'questions' | 'answers'> {
  const { rows, cols } = size;

  const questionsCount = Math.floor(rows * cols / 2);
  const random = CalcRandom(questionsCount, size);

  const rows1 = [...Array(rows).keys()];
  const cols1 = [...Array(cols).keys()];

  const initialBoard: Cell[] = rows1.flatMap((row, rowIndex) => cols1.map((col, colIndex) => {
    const index = GetIndex(cols, {x: rowIndex,y: colIndex});
    const questionType = random.indexOf(index) === -1 ? 'normal' : 'competitive';
    return { id: uuid(), x: rowIndex, y: colIndex, cellType: 'normal', questionType, moveAttempts: [] };
  }));

  const question = GetRandomQuestionAll();

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

export function GetWinners(scores: PlayerScore[]): Player[] {
  const scoredSorted = [...scores].sort((n1,n2) => n2.score - n1.score);
  const max = scoredSorted[0];
  return scoredSorted.filter(score => score.score === max.score).map(score => score.player);
}

export function GetRandomQuestionAll(): Question {
  return questions[Math.floor(Math.random() * questions.length)];
}

export function GetRandomQuestion(level: number): Question {
  const qs = questions.filter(q => q.level === level);
  return qs[Math.floor(Math.random() * qs.length)];
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
  const answers = game.answers.filter(answer => answer.questionId === lastQuestion.id);
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
  game.moves.slice(0, move.current).forEach(function({ questionId, move, value}) {
    const [index, cell] = GetCell(board, game.size.cols, move);
    const moveAttempts = game.moveAttempts.filter(ma => ma.questionId === questionId);
    board[index] = {...cell, color: move.player.color, cellType: move.cellType, value, moveAttempts};
  });

  // const lastQuestion = game.questions.at(-1);
  // if (lastQuestion && lastQuestion.questionType === 3) {
  //   const [index, cell] = GetCell(board, game.size.cols, lastQuestion.move);
  //   const moveAttempts = game.moveAttempts.filter(ma => ma.id === lastQuestion.question.id);
  //   console.log('moveAttempts', moveAttempts);
  //
  //   if (moveAttempts.length > 0) {
  //     board[index] = {...cell, moveAttempts};
  //   }
  // }

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

export function getFreeCells(movePlayer: Player, board: Cell[], gameSize: GameSize): Cell[] {
  const playerCells = board.filter(cell => cell.color === movePlayer.color);
  if (playerCells.length === 0) {
    return board.filter(cell => !cell.color);
  }

  const freeCells = playerCells.flatMap(cell => [...knightCellKeys(cell)])
    .filter(cell => !isOutOfBoard(cell, gameSize))
    .map(cell => GetCell(board, gameSize.cols, cell)[1])
    .filter(cell => !cell.color);

  return freeCells.filter(cell => {
    const playersCells = normalCellKeys(cell)
      .filter(cell => !isOutOfBoard(cell, gameSize))
      .map(cell => GetCell(board, gameSize.cols, cell)[1])
      .filter(cell => cell.color);

    const otherCells = playersCells.filter(cell => cell.color !== movePlayer.color);
    const maxOtherCells = _(otherCells).groupBy(cell => cell.color).map((value,) => value.length).max();
    if (!maxOtherCells) {
      return true;
    }

    return (playersCells.length - otherCells.length) >= maxOtherCells;
  });
}

export function isOutOfBoard(cell: XY, size: GameSize) {
  return cell.x < 0 || cell.x >= size.rows || cell.y < 0 || cell.y >= size.cols;
}

export function isGameOver(board: Cell[]): boolean {
  const freeCellsCount = board.length - board.filter(cell => cell.color).length;
  return freeCellsCount === 0;
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

// function bishopCellKeys(cell: Cell) {
//   return [
//     {x: cell.x+1, y: cell.y+1},
//     {x: cell.x+1, y: cell.y-1},
//     {x: cell.x-1, y: cell.y-1},
//     {x: cell.x-1, y: cell.y+1},
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

function GetCell(board: Cell[], cols: number, xy: XY): [number, Cell] {
  const index = GetIndex(cols, xy);
  return [index, board[index]];
}

function GetIndex(cols: number, {x, y}: XY) {
  return x * cols + y;
}