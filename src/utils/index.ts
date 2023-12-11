import {v4 as uuid} from 'uuid';
import {Cell, Game, GameSize, Player, PlayerScore, QuestionSnapshot, XY} from '../model';
import {Move} from '../model/Move';
import questions from './questions.json';

export type Question = typeof questions[0] & { id: string, xy: XY };

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

  return { id: uuid(), size, players, board: initialBoard, date: new Date(), movePlayer: players[0] };
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

export function GetRandomQuestion(cell: Cell): Question {
  const question = questions[Math.floor(Math.random() * questions.length)];
  return {id: uuid(), xy: { x: cell.x, y: cell.y }, ...question};
}

export function GetCurrentQuestionSnapshot(game: Game): QuestionSnapshot | undefined {
  const lastQuestion = game.questions.at(-1);
  if (!lastQuestion) {
    return undefined;
  }

  const move = game.moves.find(function ({move}) {
    return lastQuestion.question.xy.x === move.x && lastQuestion.question.xy.y === move.y;
  });

  if (move) {
    return undefined;
  }

  const players = lastQuestion.questionType === 'normal' ? [lastQuestion.move.player] : game.players;
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
      return { color: player.color, score, moves };
    });
}

export function GetForMove(game: Game, move: Move): [Cell[], PlayerScore[]] {
  const board = [...game.board];
  game.moves.slice(0, move.current).forEach(function({ move}) {
    const [index, value] = GetCell(board, game.size.cols, move);
    board[index] = {...value, color: move.player.color, cellType: move.cellType};
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

function Calc(board: Cell[], cell: Cell, index: number, size: GameSize, keys: XY[]): Cell {
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

function GetCell(board: Cell[], cols: number, xy: XY): [number, Cell] {
  const index = GetIndex(cols, xy);
  return [index, board[index]];
}

function GetIndex(cols: number, {x, y}: XY) {
  return x * cols + y;
}