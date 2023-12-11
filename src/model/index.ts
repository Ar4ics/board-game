import {Question} from '../utils';
import { Timestamp, FieldValue } from "firebase/firestore";

export type CellType = 'normal' | 'knight' | 'diamond'

export type QuestionType = 'normal' | 'competitive'

export type XY = { x: number, y: number };

export interface Cell {
  id: string,
  x: number,
  y: number,
  value?: number,
  color?: string,
  cellType: CellType,
  questionType: QuestionType
}

export interface PlayerScore {
  color: string,
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
  questions: QuestionSnapshot[],
  answers: AnswerSnapshot[],
  movePlayer: Player,
  date: Date,
}

export interface MoveSnapshot {
  move: PlayerMove,
  date?: FieldValue,
}

export interface QuestionSnapshot {
  question: Question,
  questionType: QuestionType,
  move: PlayerMove,
  date?: FieldValue | Timestamp,
}

export interface AnswerSnapshot {
  question: string,
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
}

export interface PlayerAnswer {
  answer: number,
  correct: number,
}