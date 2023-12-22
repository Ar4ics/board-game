import React, {useEffect, useRef, useState} from 'react';
import {serverTimestamp, doc, updateDoc, Timestamp, setDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {
  Cell,
  CellType,
  Game,
  Player,
  PlayerAnswer,
  PlayerScore,
  QuestionSnapshot,
  isCompetitive,
  QuestionType,
  QuestionTypeCompetitive,
  PlayerMove,
  MoveAttemptSnapshot,
  MoveSnapshot,
  XY
} from '../model';
import {
  boardsCollectionId,
  currentPlayerState,
  movesCollectionId,
  moveState,
  questionsCollectionId,
} from '../state';
import {
  GetCurrentQuestionSnapshot,
  GetForMove,
  getFreeCells,
  GetRandomQuestion,
  GetRandomQuestionAll,
  GetWinners,
  isGameOver,
  Question,
} from '../utils';
import {useRecoilState, useRecoilValue} from 'recoil';
import QuestionComponent from './QuestionComponent';
import {Move} from '../model/Move';
import {v4 as uuid} from 'uuid';

interface GameProps {
  isTest: boolean,
  game: Game
}

export default function GameComponent({ isTest, game }: GameProps) {
  const gameIsReady = game.players.every(p => p.isReady);

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

  const def = GetDefault();
  const [board, scores] = move
    ? GetForMove(game, move)
    : def;
  const [lastBoard,lastScores] = game.moves.length > 0
    ? GetForMove(game, Move.Create(game.moves.length))
    : def;
  console.log('lastBoard', lastBoard);
  const freeCells = getFreeCells(player, lastBoard, game.size);
  const gameOver = isGameOver(lastBoard);
  const winners = gameOver ? GetWinners(lastScores) : undefined;
  const questionSnapshot = GetCurrentQuestionSnapshot(game);
  const question = questionSnapshot?.question;
  console.log('question', questionSnapshot);
  const [isAvailable, setIsAvailable] = useState(movePlayer.color === player.color);

  function GetDefault(): [Cell[], PlayerScore[]] {
    const scores = game.players.map(player => {
      return { player, score: 0, moves: 0 };
    });
    return [game.board, scores];
  }

  const playerAnswer = getPlayerAnswer();
  console.log('playerAnswer', playerAnswer);

  function getPlayerAnswer(): PlayerAnswer | undefined {
    if (!questionSnapshot) {
      return undefined;
    }

    const answer = game.answers.find(answer => answer.questionId === questionSnapshot.id && answer.player.color === player.color);
    if (!answer) {
      return undefined;
    }

    return { answer: answer.answer, correct: questionSnapshot.question.correct };
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

  function canAttack(cell: Cell): boolean {
    return (!move || move.isLast) &&
           isAvailable &&
           gameIsReady &&
           freeCells.some(free => free.x === cell.x && free.y === cell.y);
  }

  useEffect(() => {
    setIsAvailable(movePlayer.color === player.color);
  }, [movePlayer.color, player.color]);

  const m3 = game.moves.filter(m => m.questionType === 3).length;
  const m3Ref = useRef(m3);

  useEffect(() => {
    const lastQuestion = game.questions.at(-1);
    if (m3Ref.current !== m3 && lastQuestion && !gameOver) {
      console.log('m3 changed', m3);
      const nextPlayer = getNextPlayer(lastQuestion);
      if (nextPlayer.color !== player.color) {
        return;
      }

      const freeCell = lastBoard.find(cell => !cell.color);
      if (!freeCell) {
        return;
      }

      sendNextPlayer(nextPlayer, lastBoard, game.question.level, freeCell);
    }
  }, [m3]);

  function getNextPlayer(lastQuestion: QuestionSnapshot) {
    const currentPlayer = lastQuestion.move.player;
    const playerIndex = game.players.findIndex(color => color.color === currentPlayer.color);
    const newIndex = playerIndex === game.players.length - 1 ? 0 : playerIndex + 1;
    return game.players[newIndex];
  }

  useEffect(() => {
    console.log('useEffect question', question);
    const lastQuestion = game.questions.at(-1);
    if (question){
      setIsAvailable(false);
    } else if (lastQuestion && !lastQuestion.isClosed && !gameOver) {
      const qRef = doc(db, boardsCollectionId, game.id, questionsCollectionId, lastQuestion.id);
      updateDoc(qRef, {isClosed: true}).then(res => console.log(res));

      const nextPlayer = getNextPlayer(lastQuestion);
      if (nextPlayer.color !== player.color) {
        return;
      }

      const level = game.questions.length % game.players.length === 0
        ? toNextQuestion().level
        : game.question.level;

      if (lastQuestion.questionType === 3) {
        const correctAttempts = game.moveAttempts.filter(ma => ma.questionId === lastQuestion.id && ma.isCorrect);
        const questionsForCell = game.questions.filter(q => q.questionType === 3 && q.move.x === lastQuestion.move.x && q.move.y === lastQuestion.move.y);
        if (correctAttempts.length === 0 || (correctAttempts.length > 1 && questionsForCell.length === 1)) {
          sendQuestion(lastQuestion.move.player, level, lastQuestion.move);
        } else {
          const attempt = correctAttempts[0];
          sendMove(attempt.move.player.color === lastQuestion.move.player.color ? 3 : 0.5, attempt, lastQuestion);
        }
      } else {
        const freeCell = lastBoard.find(cell => !cell.color);
        if (!freeCell) {
          return;
        }
        sendNextPlayer(nextPlayer, lastBoard, level, freeCell);
      }
    }

    function sendMove(value: number, attempt: MoveAttemptSnapshot, qs: QuestionSnapshot) {
      const move = {...qs.move, player: attempt.move.player};
      const snapshot: MoveSnapshot = {questionId: attempt.questionId, date: serverTimestamp(), questionType: qs.questionType, move, value};
      const docRef = doc(db, boardsCollectionId, game.id, movesCollectionId, `${move.x}_${move.y}`);
      setDoc(docRef, snapshot).then(res => console.log(res));
    }
  }, [questionSnapshot?.id]);

  function sendNextPlayer(player: Player, board: Cell[], level: number, cell: XY) {
    toNextPlayer(player);
    const freeCells = getFreeCells(player, board, game.size);
    if (freeCells.length === 0) {
      sendQuestion(player, level, cell);
    }
  }

  function toNextPlayer(nextPlayer: Player) {
    const gameRef = doc(db, boardsCollectionId, game.id);
    updateDoc(gameRef, {movePlayer: nextPlayer}).then(res => console.log(res));
  }

  function sendQuestion(player: Player, level: number, cell: XY) {
    const playerMove = {player, x: cell.x, y: cell.y, cellType: 'normal' as CellType};
    const q = GetRandomQuestion(level);
    toNextQuestionSnapshot(playerMove, q, 3 as QuestionTypeCompetitive);
  }

  function toNextQuestion(): Question {
    const question = GetRandomQuestionAll();
    const gameRef = doc(db, boardsCollectionId, game.id);
    updateDoc(gameRef, {question}).then(res => console.log(res));
    return question;
  }

  function toNextQuestionSnapshot(playerMove: PlayerMove, q: Question, questionType: QuestionType) {
    if (isTest) {
      q = {...q, title: 'Вопрос. Правильный ответ 1', answers: ['1', '2'], correct: 0};
    }

    const delayTime = (Math.random() * 3 + 3) * 1000;
    const snapshot: QuestionSnapshot = {id: uuid(), date: serverTimestamp(), delayTime, move: playerMove, question: q, questionType, isClosed: false};
    console.log('new question snapshot', snapshot);
    const docRef = doc(db, boardsCollectionId, game.id, questionsCollectionId, `${snapshot.id}`);
    setDoc(docRef, snapshot).then(res => console.log(res));
  }

  async function onClick(cell: Cell, cellType: CellType) {
    console.log('cell', cell);
    if (!canAttack(cell)) {
      console.log('skip click');
      return;
    }

    const playerMove = {player, x: cell.x, y: cell.y, cellType};

    const q = isCompetitive(mode) ? GetRandomQuestion(game.question.level) : game.question;
    toNextQuestionSnapshot(playerMove, q, mode);
    setIsAvailable(false);
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
    marginTop: '1vh',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  };

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
    const index = game.players.findIndex(p => p.color === player.color);
    const player1 = game.players[index];
    return !isNullOrWhitespace(player1.name) ? player1.name : `${index+1}-й игрок`;
  }

  function getPlayerIndex(player: Player) {
    const index = game.players.findIndex(p => p.color === player.color);
    return `${index+1}`;
  }

  function getMovePlayerStyle(p: Player): React.CSSProperties {
    const f = gameIsReady && movePlayer.color === p.color;
    const base = {
      padding: '5px',
      backgroundColor: p.color
    };
    return !gameOver && f ? {...base,
      border: '1px solid black',
    } : base;
  }

  return (
    <>
      <div style={{marginTop: '1vh', borderTop: '1px solid black', borderLeft: '1px solid black'}}>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCellHeader" style={{ width: '6vh', height: '3vh'}}>
                {gameIsReady && game.moves.length > 0 && score.player.color === player.color ? CalcScoreDiff() : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCellHeader" style={{ width: '6vh', height: '3vh'}}>
                {score.player.color === player.color ? 'Я' : ''}
              </div>
            )
          }
        </div>
        <div className="score">
          {
            scores.map(score =>
              <div key={score.player.color} className="scoreCell" style={{ width: '6vh', height: '6vh', backgroundColor:score.player.color}}>
                {gameIsReady ? score.score : score.player.isReady ? 'готов' : 'не готов'}
              </div>
            )
          }
        </div>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', marginTop: '1vh'}}>
        {
          game.players.map(p =>
            <div key={p.color} style={getMovePlayerStyle(p)}>
              {getPlayerName(p)}
            </div>
          )
        }
      </div>
      {winners && <div style={{marginTop: '5px'}}>
        {
          winners.length > 1
            ? winners.length === game.players.length
              ? 'Ничья'
              : `Выиграли ${winners.map(p => getPlayerName(p)).join(', ')}`
            : `Выиграл ${getPlayerName(winners[0])}`
        }
      </div>}
      {
        questionSnapshot &&
        (isCompetitive(questionSnapshot.questionType) || questionSnapshot.move.player.color === player.color) &&
        <QuestionComponent key={`${questionSnapshot.id}_${player.color}`} game={game} player={player} questionSnapshot={questionSnapshot} playerAnswer={playerAnswer} />}
      <div className="board" style={boardStyle}>
        {
          board.map(cell =>
            <Box key={cell.id} isTest={isTest} canAttack={canAttack(cell)} cell={cell} cellSize={cellSize} onClick={onClick} question={game.question} questionSnapshot={questionSnapshot} getPlayerName={getPlayerIndex}></Box>
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
            3 {up} 0.5 {right}
          </button>
          <button style={mode === 4 ? moveBorder : {}} onClick={() => setMode(4)}>
            0 {down} 3.5 {up} 1 {right}
          </button>
          <button style={mode === 5 ? moveBorder : {}} onClick={() => setMode(5)}>
            0 {down} 4 {up} 1.5 {right}
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
  canAttack: boolean,
  cell: Cell,
  cellSize: number,
  onClick: (cell: Cell, cellType: CellType) => void,
  question: Question,
  questionSnapshot: QuestionSnapshot | undefined,
  getPlayerName: (player: Player) => string | undefined,
}

function Box({ canAttack, cell, cellSize, onClick, question, questionSnapshot, getPlayerName }: BoxProps) {
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

  function getDiff(attempt: MoveAttemptSnapshot) {
    const questionDate = (attempt.moveAttemptDate as Timestamp).toDate();
    const answerDate = ((attempt.date as Timestamp).toDate());

    return (answerDate.getTime() - questionDate.getTime()) / 1000;
  }

  return (
    <div onContextMenu={e => e.preventDefault()} className="boardCell" style={style} onAuxClick={onCellClick} onClick={onCellClick}>
      {/*{getCellType(cell.cellType)}*/}
      {canAttack ? `x(${question.level})` : ''}
      {cell.value}
      <div>
        {
          cell.moveAttempts.map(attempt =>
            isCompetitive(attempt.questionType)
              ?
              <div key={attempt.move.player.color}>
                {getPlayerName(attempt.move.player)}: <span style={{color: attempt.isCorrect ? 'green' : 'red'}}>{getDiff(attempt)}</span>
              </div>
              : ''
          )
        }
      </div>
    </div>
  );
}