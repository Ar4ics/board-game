import React, {useEffect, useState} from 'react';
import {addDoc, serverTimestamp, collection} from 'firebase/firestore';
import {db} from '../firebase';
import {Cell, CellType, Game, Player, PlayerAnswer, PlayerScore, QuestionSnapshot, isCompetitive, QuestionType} from '../model';
import {
  boardsCollectionId,
  currentPlayerState,
  moveState,
  questionsCollectionId,
} from '../state';
import {
  GetCurrentQuestionSnapshot,
  GetForMove,
  GetRandomQuestion,
  GetWinners,
} from '../utils';
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

  const [mode, setMode] = useState<QuestionType>(0);
  console.log('mode', mode);

  const [width, setWidth] = useState(window.innerWidth);
  const height = window.innerHeight;
  // console.log('width', width);
  // console.log('height', height);

  const [board, scores] = move
    ? GetForMove(game, move)
    : GetDefault();
  const winners = GetWinners(board, scores);
  const questionSnapshot = GetCurrentQuestionSnapshot(game);
  const question = questionSnapshot?.question;
  console.log('question', questionSnapshot);

  function GetDefault(): [Cell[], PlayerScore[]] {
    const scores = game.players.map(player => {
      return { player, score: 0, moves: 0 };
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
  const boardHeight = height - (0.4 * height);

  const cellWidth = boardWidth / cols;
  const cellHeight = boardHeight / rows;
  // console.log('cellWidth', cellWidth);
  // console.log('cellHeight', cellHeight);

  const cellSize = cellWidth <= cellHeight
    ? (boardWidth - cols - 1) / cols
    : (boardHeight - rows - 1) / rows;
  // console.log('cellSize', cellSize);

  const playerScore = scores.find(score => score.player.color === player.color) as PlayerScore;

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

    let q = isCompetitive(mode) ? GetRandomQuestion(game.question.level) : game.question;
    if (isTest) {
      q = {...q, title: 'Вопрос. Правильный ответ 1', answers: ['1', '2'], correct: 0};
    }

    const snapshot: QuestionSnapshot = {date: serverTimestamp(), move: playerMove, question: q, questionType: mode};
    console.log('new question snapshot', snapshot);
    const colRef = collection(db, boardsCollectionId, game.id, questionsCollectionId);
    addDoc(colRef, snapshot).catch(e => console.error(e));
  }

  function CalcScoreDiff() {
    const score = playerScore.score;
    const maxScore = Math.max(...scores.filter(score => score.player.color !== playerScore.player.color).map(score => score.score));
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

  const movePlayerOnTable = questionSnapshot && isCompetitive(questionSnapshot.questionType)
    ? null
    : movePlayer;
  const moveBorder: React.CSSProperties = {
    // border: '1px solid black',
    backgroundColor: 'yellowgreen'
  };

  function isNullOrWhitespace(input: string | undefined) {
    return !input || !input.trim();
  }

  const up = String.fromCharCode(0x2191);
  const down = String.fromCharCode(0x2193);
  const right = String.fromCharCode(0x2192);

  function getPlayerName(player: Player) {
    return !isNullOrWhitespace(player.name) ? player.name : `${game.players.findIndex(p => p.color === player.color) + 1}-й игрок`;
  }

  return (
    <>
      <div style={{marginTop: '2vh'}}>
        {
          winners
            ? winners.length > 1
              ? winners.length === game.players.length
                ? 'Ничья'
                : `Выиграли ${winners.map(p => getPlayerName(p)).join(', ')}`
              : `Выиграл ${getPlayerName(winners[0])}`
            : `Ходит ${getPlayerName(movePlayer)}`
        }
      </div>
      <div>
        Сложность вопроса: {game.question.level}
      </div>
      <div style={{marginTop: '2vh', borderTop: '1px solid black', borderLeft: '1px solid black'}}>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.moves === 0 ? '' : score.moves}{score.player.color === movePlayerOnTable?.color ? 'x' : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCellHeader" style={{ width: '5vh', height: '2.5vh'}}>
                {score.player.color === player.color ? CalcScoreDiff() : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCell" style={{ width: '5vh', height: '5vh', backgroundColor:score.player.color}}>
                {score.score}
              </div>
            )
          }
        </div>
      </div>
      {
        questionSnapshot &&
        (isCompetitive(questionSnapshot.questionType) || questionSnapshot.move.player.color === player.color) &&
        <QuestionComponent key={`${questionSnapshot.question.id}_${player.color}`} game={game} player={player} questionSnapshot={questionSnapshot} playerAnswer={playerAnswer} />}
      <div className="board" style={boardStyle}>
        {
          board.map(cell =>
            <Box key={cell.id} isTest={isTest} cell={cell} cellSize={cellSize} onClick={onClick} questionSnapshot={questionSnapshot}></Box>
          )
        }
      </div>
      <div className="bottomControls1">
        <div className="flexRight1">
          <button style={mode === 0 ? moveBorder : {}} onClick={() => setMode(0)}>
            1 {down} 1.5 {up}
          </button>
          <button style={mode === 1 ? moveBorder : {}} onClick={() => setMode(1)}>
            0.5 {down} 2 {up}
          </button>
          <button style={mode === 2 ? moveBorder : {}} onClick={() => setMode(2)}>
            0 {down} 2.5 {up}
          </button>
        </div>
        <div>
          <button style={mode === 3 ? moveBorder : {}} onClick={() => setMode(3)}>
            0 {down} 3.5 {up} 0.75 {right}
          </button>
          <button style={mode === 4 ? moveBorder : {}} onClick={() => setMode(4)}>
            -0.5 {down} 4 {up} 1.25 {right}
          </button>
        </div>
      </div>
      <div className="bottomControls2">
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
  questionSnapshot: QuestionSnapshot | undefined,
}

function Box({ cell, cellSize, onClick, questionSnapshot }: BoxProps) {
  const style: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    backgroundColor: cell.color ?? ((questionSnapshot && questionSnapshot.move.x === cell.x && questionSnapshot.move.y === cell.y) ? 'lightgray' : 'white'),
  };

  // function getCellType(cellType: CellType) {
  //   switch(cellType) {
  //     case 'normal':
  //       return '';
  //     case 'knight':
  //       return 'K';
  //     case 'diamond':
  //       return 'D';
  //   }
  // }

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
      {/*{getCellType(cell.cellType)}*/}
      {cell.value}
    </div>
  );
}