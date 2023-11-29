import React, {useEffect, useState} from 'react';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {Cell, Game, PlayerScore} from '../model';
import {boardDocumentId, boardsCollectionId, currentPlayerState, moveState} from '../state';
import {CalcScores} from '../utils';
import {Move} from '../model/Move';
import {useRecoilState, useRecoilValue} from 'recoil';

interface GameProps {
  game: Game
}

export default function GameComponent({ game }: GameProps) {
  const [move, setMove] = useRecoilState(moveState);
  console.log('move', move);

  const player = useRecoilValue(currentPlayerState);

  const [width, setWidth] = useState(window.innerWidth);
  const boardWidth = width < 1000 ? 80 : 30;

  const [board, scores] = move
    ? GetForMove(move)
    : GetDefault();

  function GetDefault(): [Cell[], PlayerScore[]] {
    const scores = game.players.map(player => {
      return { color: player, score: 0 };
    });
    return [game.board, scores];
  }

  function GetForMove(move: Move): [Cell[], PlayerScore[]] {
    const moveSnapshot = game.snapshots[move.current];
    return [moveSnapshot.board, moveSnapshot.scores];
  }

  const rows = game.size.rows;
  const cols = game.size.cols;
  const playerScore = scores.find(score => score.color === player) as PlayerScore;

  function onResize() {
    setWidth(document.body.clientWidth);
  }

  function onMouseWheel(event: WheelEvent)
  {
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

  async function onClick(cell: Cell)
  {
    console.log('cell', cell);
    if ((move && move.isNotLast) ||
        cell.color ||
        (game.snapshots.length == 1 && game.snapshots[0].move.player === player))
    {
      console.log('skip click');
      return;
    }

    const newBoard = board.map(item => {
      return item.id === cell.id && !item.color
        ? {...item, color: player}
        : item;
    });
    const tableMap = new Map<number, Cell>(newBoard.map(item => [item.orderNumber, item]));

    const newBoard2 = newBoard.map(item => {
      return item.color
        ? Calc(item)
        : item;
    });
    const newGame: Game = {...game, snapshots: [...game.snapshots, {move: {player, x: cell.x, y: cell.y}, board: newBoard2, scores: CalcScores(game.players, newBoard2) }] };

    await setDoc(doc(db, boardsCollectionId, boardDocumentId), newGame);

    function Calc(cell: Cell): Cell
    {
      const keys = [
        {x: cell.x, y: cell.y+1},
        {x: cell.x+1, y: cell.y+1},
        {x: cell.x+1, y: cell.y},
        {x: cell.x+1, y: cell.y-1},
        {x: cell.x, y: cell.y-1},
        {x: cell.x-1, y: cell.y-1},
        {x: cell.x-1, y: cell.y},
        {x: cell.x-1, y: cell.y+1},
      ];

      const r = keys.filter(key => {
        if (key.x < 0 || key.x >= rows || key.y < 0 || key.y >= cols)
        {
          return false;
        }

        const value = tableMap.get(cols * key.x + key.y);
        return value && value.color === cell.color;
      });

      return {...cell, value: r.length};
    }
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

  const scoreCellWidth = boardWidth/cols;

  const boardStyle: React.CSSProperties = {
    width: `${boardWidth}vw`,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  };

  return (
    <>
      <div className="score">
        {
          scores.map(score =>
            <div key={score.color} className="scoreCellHeader" style={{ width: `${scoreCellWidth}vw`}}>
              {score.color == player ? `(${CalcScoreDiff()})` : ''}
            </div>
          )
        }
      </div>
      <div className="score">
        {
          scores.map(score =>
            <div key={score.color} className="scoreCell" style={{ width: `${scoreCellWidth}vw`, backgroundColor:score.color}}>
              {score.score}
            </div>
          )
        }
      </div>
      <div className="board" style={boardStyle}>
        {
          board.map(cell =>
            <Box key={cell.id} cell={cell} onClick={onClick}></Box>
          )
        }
      </div>
      <div className="bottomControls">
        <button className="controlCell" disabled={!move || move.isFirst} onClick={() => move && setMove(move.toPrevMove())}>
          Назад
        </button>
        <button className="move" disabled={!move || move.isLast} onClick={() => move && setMove(move.toNextMove())}>
          Вперед
        </button>
      </div>
    </>
  );
}

interface BoxProps
{
  cell: Cell
  onClick: (cell: Cell) => void
}

function Box({ cell, onClick }: BoxProps) {
  const style: React.CSSProperties = {
    backgroundColor: cell.color ?? 'white',
  };

  return (
    <div className="boardCell" style={style} onClick={() => onClick(cell)}>
      {cell.value}
    </div>
  );
}