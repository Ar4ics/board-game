import {Question} from '../utils';
import { Timestamp, FieldValue } from 'firebase/firestore';

export type CellType = 'normal' | 'knight' | 'diamond'

// export type QuestionType = 'normal' | 'competitive'
export type QuestionTypeNormal = 0 | 1 | 2
export type QuestionTypeCompetitive = 3 | 4 | 5
export type QuestionType = QuestionTypeNormal | QuestionTypeCompetitive

export function isCompetitive(questionType: QuestionType): questionType is QuestionTypeCompetitive {
  return questionType === 3 || questionType === 4 || questionType === 5;
}

export type XY = { x: number, y: number };

export interface Cell {
  id: string,
  x: number,
  y: number,
  value?: number,
  color?: string,
  cellType: CellType,
  moveAttempts: MoveAttemptSnapshot[]
}

export interface PlayerScore {
  player: Player,
  score: number,
  moves: number,
}

export interface GameSize {
  rows: number,
  cols: number,
}

export interface Game {
  id: string,
  size: GameSize,
  board: Cell[],
  players: Player[],
  moves: MoveSnapshot[],
  moveAttempts: MoveAttemptSnapshot[],
  questions: QuestionSnapshot[],
  answers: AnswerSnapshot[],
  movePlayer: Player,
  question: Question,
  date: Date,
}

export interface MoveSnapshot {
  questionId: string,
  move: PlayerMove,
  questionType: QuestionType,
  value: number,
  date?: FieldValue,
}

export interface MoveAttemptSnapshot {
  questionId: string,
  move: PlayerMove,
  moveAttemptDate: Timestamp,
  questionType: QuestionType,
  isCorrect: boolean,
  date?: FieldValue,
}

export interface QuestionSnapshot {
  id: string,
  question: Question,
  delayTime: number,
  questionType: QuestionType,
  move: PlayerMove,
  isClosed: boolean,
  date?: FieldValue | Timestamp,
}

export interface AnswerSnapshot {
  questionId: string,
  player: Player,
  answer: number,
  thinkTime: number,
  clientDate: Timestamp,
  date?: FieldValue,
}

export interface PlayerMove {
  player: Player
  x: number,
  y: number,
  cellType: CellType,
}

export interface Player {
  name: string | undefined,
  color: string,
  isReady: boolean
}

export interface PlayerAnswer {
  answer: number,
  correct: number,
}