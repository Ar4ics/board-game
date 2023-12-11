import React, {useEffect, useState} from 'react';
import {addDoc, serverTimestamp, collection} from 'firebase/firestore';
import {db} from '../firebase';
import {Cell, CellType, Game, PlayerAnswer, PlayerScore, QuestionSnapshot} from '../model';
import {
  boardsCollectionId,
  currentPlayerState,
  moveState,
  questionsCollectionId,
} from '../state';
import {GetCurrentQuestionSnapshot, GetForMove, GetRandomQuestion, Question} from '../utils';
import {useRecoilState, useRecoilValue} from 'recoil';
import QuestionComponent from './QuestionComponent';

interface GameProps {
  isTest: boolean,
  game: Game
}

export default function GameComponent({ isTest, game }: GameProps) {
  const [move, setMove] = useRecoilState(moveState);
  console.log('move', move);

  const player = useRecoilValue(currentPlayerState);
  const movePlayer = game.movePlayer;
  console.log('movePlayer', movePlayer);

  const [width, setWidth] = useState(window.innerWidth);
  const height = window.innerHeight;
  // console.log('width', width);
  // console.log('height', height);

  const [board, scores] = move
    ? GetForMove(game, move)
    : GetDefault();
  const questionSnapshot = GetCurrentQuestionSnapshot(game);
  const question = questionSnapshot?.question;
  console.log('question', questionSnapshot);

  function GetDefault(): [Cell[], PlayerScore[]] {
    const scores = game.players.map(player => {
      return { color: player.color, score: 0, moves: 0 };
    });
    return [game.board, scores];
  }

  const playerAnswer = getPlayerAnswer();
  console.log('playerAnswer', playerAnswer);

  function getPlayerAnswer(): PlayerAnswer | undefined {
    if (!question) {
      return undefined;
    }

    const answer = game.answers.find(answer => answer.question === question.id && answer.player.color === player.color);
    if (!answer) {
      return undefined;
    }

    return { answer: answer.answer, correct: question.correct };
  }

  const rows = game.size.rows;
  const cols = game.size.cols;
  const boardWidth = 0.9 * width;
  const boardHeight = height - (0.35 * height);

  const cellWidth = boardWidth / cols;
  const cellHeight = boardHeight / rows;
  // console.log('cellWidth', cellWidth);
  // console.log('cellHeight', cellHeight);

  const cellSize = cellWidth <= cellHeight
    ? (boardWidth - cols - 1) / cols
    : (boardHeight - rows - 1) / rows;
  // console.log('cellSize', cellSize);

  const playerScore = scores.find(score => score.color === player.color) as PlayerScore;

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

  async function onClick(cell: Cell, cellType: CellType) {
    console.log('cell', cell);
    if ((move && move.isNotLast) ||
        cell.color ||
        question ||
        player.color !== movePlayer.color) {
      console.log('skip click');
      return;
    }

    const playerMove = {player, x: cell.x, y: cell.y, cellType};

    let q = GetRandomQuestion(cell);
    if (isTest) {
      q = {...q, title: 'Вопрос. Правильный ответ 1', answers: ['1', '2'], correct: 0};
    }

    const snapshot: QuestionSnapshot = {date: serverTimestamp(), move: playerMove, question: q, questionType: cell.questionType};
    const colRef = collection(db, boardsCollectionId, game.id, questionsCollectionId);
    addDoc(colRef, snapshot).catch(e => console.error(e));
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

  const movePlayerOnTable = questionSnapshot?.questionType === 'competitive'
    ? null
    : movePlayer;

  function isNullOrWhitespace(input: string | undefined) {
    return !input || !input.trim();
  }

  return (
    <>
      <div style={{marginTop: '2vh'}}>Ходит {!isNullOrWhitespace(movePlayer.name) ? movePlayer.name : `${game.players.findIndex(p => p.color === movePlayer.color) + 1}-й игрок`}</div>
      <div style={{marginTop: '2vh', borderTop: '1px solid black', borderLeft: '1px solid black'}}>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.moves === 0 ? '' : score.moves}{score.color === movePlayerOnTable?.color ? 'x' : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.color === player.color ? CalcScoreDiff() : ''}
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
      {
        questionSnapshot &&
        (questionSnapshot.questionType === 'normal' ? questionSnapshot.move.player.color === player.color : true) &&
        <QuestionComponent key={`${questionSnapshot.question.id}_${player.color}`} game={game} player={player} questionSnapshot={questionSnapshot} playerAnswer={playerAnswer} />}
      <div className="board" style={boardStyle}>
        {
          board.map(cell =>
            <Box key={cell.id} isTest={isTest} cell={cell} cellSize={cellSize} onClick={onClick} question={question}></Box>
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
  isTest: boolean,
  cell: Cell,
  cellSize: number,
  onClick: (cell: Cell, cellType: CellType) => void,
  question: Question | undefined,
}

function Box({ isTest, cell, cellSize, onClick, question }: BoxProps) {
  const style: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    backgroundColor: cell.color ?? ((question && question.xy.x === cell.x && question.xy.y === cell.y) ? 'lightgray' : 'white'),
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
      { isTest && (cell.questionType === 'normal' ? '?' : '??')}
      {getCellType(cell.cellType)}{cell.value}
    </div>
  );
}