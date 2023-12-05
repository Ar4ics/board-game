import React, {useEffect, useState} from 'react';
import {doc, setDoc, serverTimestamp} from 'firebase/firestore';
import {db} from '../firebase';
import {Cell, CellType, Game, MoveSnapshot, PlayerScore} from '../model';
import {boardsCollectionId, currentPlayerState, moveState, movesCollectionId} from '../state';
import {GetForMove} from '../utils';
import {useRecoilState, useRecoilValue} from 'recoil';

interface GameProps {
  game: Game
}

export default function GameComponent({ game }: GameProps) {
  const [move, setMove] = useRecoilState(moveState);
  console.log('move', move);

  const player = useRecoilValue(currentPlayerState);

  const [width, setWidth] = useState(window.innerWidth);
  const height = window.innerHeight;
  // console.log('width', width);
  // console.log('height', height);

  const [board, scores] = move
    ? GetForMove(game, move)
    : GetDefault();

  function GetDefault(): [Cell[], PlayerScore[]] {
    const scores = game.players.map(player => {
      return { color: player, score: 0, moves: 0 };
    });
    return [game.board, scores];
  }

  const rows = game.size.rows;
  const cols = game.size.cols;
  const boardWidth = 0.9 * width;
  const boardHeight = height - (0.3 * height);

  const cellWidth = boardWidth / cols;
  const cellHeight = boardHeight / rows;
  // console.log('cellWidth', cellWidth);
  // console.log('cellHeight', cellHeight);

  const cellSize = cellWidth <= cellHeight
    ? (boardWidth - cols - 1) / cols
    : (boardHeight - rows - 1) / rows;
  // console.log('cellSize', cellSize);

  const playerScore = scores.find(score => score.color === player) as PlayerScore;

  function onResize() {
    setWidth(document.body.clientWidth);
  }

  function onMouseWheel(event: WheelEvent) {
    setMove(move => {
      if (!move)
      {
        return;
      }

      if (event.deltaY > 0)
      {
        if (move.isNotLast)
        {
          return move.toNextMove();
        }
      }
      else if (event.deltaY < 0) {
        if (move.isNotFirst)
        {
          return move.toPrevMove();
        }
      }

      return move;
    });
  }

  useEffect(() => {
    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', onMouseWheel);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onMouseWheel);
    };
  }, []);

  async function onClick(cell: Cell, cellType: CellType)
  {
    console.log('cell', cell);
    if ((move && move.isNotLast) ||
        cell.color ||
        (cell.lockedBy && cell.lockedBy != player) ||
        (game.moves.length == 1 && game.moves[0].move.player === player))
    {
      console.log('skip click');
      return;
    }

    const snapshot: MoveSnapshot = {date: serverTimestamp(), move: {player, x: cell.x, y: cell.y, cellType}};
    const docRef = doc(db, boardsCollectionId, game.id, movesCollectionId, `${cell.x}_${cell.y}`);
    setDoc(docRef, snapshot).catch(e => console.error(e));
  }

  function CalcScoreDiff() {
    const score = playerScore.score;
    const maxScore = Math.max(...scores.filter(score => score.color !== playerScore.color).map(score => score.score));
    const diff = score - maxScore;
    switch (true) {
      case diff > 0: return `+${diff}`;
      case diff < 0: return `${diff}`;
      default: return `=${diff}`;
    }
  }

  const boardStyle: React.CSSProperties = {
    marginTop: '2vh',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  };

  return (
    <>
      <div style={{marginTop: '2vh', borderTop: '1px solid black', borderLeft: '1px solid black'}}>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.moves === 0 ? '' : score.moves}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.color === player ? CalcScoreDiff() : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.color} className="scoreCell" style={{ width: '5vh', height: '5vh', backgroundColor:score.color}}>
                {score.score}
              </div>
            )
          }
        </div>
      </div>
      <div className="board" style={boardStyle}>
        {
          board.map(cell =>
            <Box key={cell.id} cell={cell} cellSize={cellSize} onClick={onClick} player={player}></Box>
          )
        }
      </div>
      <div className="bottomControls">
        <button disabled={!move || move.isFirst} onClick={() => move && setMove(move.toPrevMove())}>
          Назад
        </button>
        <button disabled={!move || move.isLast} onClick={() => move && setMove(move.toNextMove())}>
          Вперед
        </button>
        {move && <div className="moves">{move.current}/{move.count}</div>}
      </div>
    </>
  );
}

interface BoxProps
{
  cell: Cell,

  cellSize: number,
  onClick: (cell: Cell, cellType: CellType) => void,

  player: string,
}

function Box({ cell, cellSize, onClick, player }: BoxProps) {
  const style: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    backgroundColor: cell.color ?? ((cell.lockedBy && cell.lockedBy !== player) ? 'lightgray' : 'white'),
  };

  function getCellType(cellType: CellType) {
    switch(cellType) {
      case 'normal':
        return '';
      case 'knight':
        return 'K';
      case 'diamond':
        return 'D';
    }
  }

  function onCellClick(e: React.MouseEvent<HTMLDivElement>) {
    switch(e.button) {
      case 0:
        onClick(cell, 'normal'); break;
      case 1:
        onClick(cell, 'knight'); break;
      case 2:
        onClick(cell, 'diamond'); break;
    }
  }

  return (
    <div onContextMenu={e => e.preventDefault()} className="boardCell" style={style} onAuxClick={onCellClick} onClick={onCellClick}>
      {getCellType(cell.cellType)}{cell.value}
    </div>
  );
}