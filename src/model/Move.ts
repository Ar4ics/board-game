export class Move {
  constructor(
    public readonly current: number,
    public readonly count: number,
  ) {
  }

  static Create(current: number) {
    return new Move(current, current);
  }

  toNextMove() {
    return new Move(this.current + 1, this.count);
  }

  toPrevMove() {
    return new Move(this.current - 1, this.count);
  }

  get isFirst() {
    return this.current === 0;
  }

  get isLast() {
    return this.current === this.count;
  }

  get isNotFirst() {
    return !this.isFirst;
  }

  get isNotLast() {
    return !this.isLast;
  }
}