import firebase from 'firebase/compat';
import FieldValue = firebase.firestore.FieldValue;

export type CellType = 'normal' | 'knight' | 'diamond'

export interface Cell {
  id: string,
  x: number,
  y: number,
  value?: number,
  color?: string,
  lockedBy?: string,
  cellType: CellType,
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
  players: string[],
  moves: MoveSnapshot[],
  date: Date,
}

export interface MoveSnapshot {
  move: PlayerMove,
  date?: FieldValue,
}

export interface PlayerMove {
  player: string
  x: number,
  y: number,
  cellType: CellType,
}