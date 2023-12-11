import {AnswerSnapshot, Game, MoveSnapshot, Player, PlayerAnswer, QuestionSnapshot} from '../model';
import {answersCollectionId, boardsCollectionId, movesCollectionId} from '../state';
import React, {useEffect, useRef, useState} from 'react';
import {doc, serverTimestamp, setDoc, Timestamp, updateDoc} from 'firebase/firestore';
import {db} from '../firebase';

interface QuestionComponentProps {
  game: Game,
  player: Player,
  questionSnapshot: QuestionSnapshot,
  playerAnswer: PlayerAnswer | undefined,
}

export default function QuestionComponent({ game, player, questionSnapshot, playerAnswer }: QuestionComponentProps) {
  const [answer, setAnswer] = useState(playerAnswer);
  console.log('answer', answer);

  const timerRef = useRef<number>();
  const timeout = 10000;

  const question = questionSnapshot.question;

  useEffect(() => {
    if (answer) {
      return;
    }

    console.log('timer set');
    timerRef.current = window.setTimeout(() => {
      console.log('timer action launched');
      sendAnswer(-1, Timestamp.now(), 0);
      toNextPlayer();
    }, timeout);

    return () => {
      console.log('timer cleared');
      window.clearTimeout(timerRef.current);
    };
  }, [answer]);

  function onAnswer(index: number) {
    console.log('player', player);
    console.log('answer', index);

    if (answer) {
      return;
    }

    const clientDate = Timestamp.now();
    const time = clientDate.toMillis() - (questionSnapshot.date as Timestamp).toMillis();
    console.log('think time, ms', time);
    setAnswer({answer: index, correct: question.correct});

    if (question.correct === index) {
      new Promise((resolve) => { sendMove(); resolve(0); }).then(() => console.log('move sent'));
    }

    new Promise((resolve) => { sendAnswer(index, clientDate, time); resolve(0); }).then(() => console.log('answer sent'));
    new Promise((resolve) => { toNextPlayer(); resolve(0); }).then(() => console.log('next player sent'));
  }

  function sendMove() {
    const move = {...questionSnapshot.move, player};
    const snapshot: MoveSnapshot = {date: serverTimestamp(), move};
    const docRef = doc(db, boardsCollectionId, game.id, movesCollectionId, `${move.x}_${move.y}`);
    setDoc(docRef, snapshot).catch(e => console.error(e));
  }

  function sendAnswer(answer: number, clientDate: Timestamp, thinkTime: number) {
    const snapshot: AnswerSnapshot = {date: serverTimestamp(), question: question.id, player, answer, clientDate, thinkTime};
    const docRef = doc(db, boardsCollectionId, game.id, answersCollectionId, `${question.id}_${player.color}`);
    setDoc(docRef, snapshot).catch(e => console.error(e));
  }

  function toNextPlayer() {
    const playerIndex = game.players.findIndex(color => color.color === questionSnapshot.move.player.color);
    const newIndex = playerIndex === game.players.length - 1 ? 0 : playerIndex + 1;
    const nextPlayer = game.players[newIndex];

    const gameRef = doc(db, boardsCollectionId, game.id);
    updateDoc(gameRef, {
      movePlayer: nextPlayer
    }).catch(e => console.error(e));
  }

  function getButtonStyle(index: number) {
    const style: React.CSSProperties = {
      padding: '5px',
      borderBottom: '1px solid black', borderRight: '1px solid black',
      backgroundColor: !answer
        ? 'white'
        : index === answer.correct
          ? 'lightgreen'
          : index === answer.answer
            ? 'pink'
            : 'white',
    };
    return style;
  }

  return (
    <div style={{marginTop: '2vh'}}>
      <div style={{paddingBottom: '5px', textAlign: 'center'}}>{question.title}</div>
      <div style={{borderTop: '1px solid black', borderLeft: '1px solid black'}}>
        {
          question.answers.map((answer, index) => <div style={getButtonStyle(index)} key={index} onClick={() => onAnswer(index)}>{answer}</div>)
        }
      </div>
    </div>
  );
}