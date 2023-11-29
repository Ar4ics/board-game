export interface Cell {
  id: string,
  x: number,
  y: number,
  orderNumber: number,
  value?: number,
  color?: string,
}

export interface PlayerScore {
  color: string,
  score: number,
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
  snapshots: BoardSnapshot[],
}

export interface BoardSnapshot {
  move: PlayerMove,
  board: Cell[],
  scores: PlayerScore[],
}

export interface PlayerMove {
  player: string
  x: number,
  y: number,
}