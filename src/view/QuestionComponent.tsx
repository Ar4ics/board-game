import {AnswerSnapshot, Game, MoveSnapshot, Player, PlayerAnswer, QuestionSnapshot} from '../model';
import {answersCollectionId, boardsCollectionId, movesCollectionId} from '../state';
import React, {useEffect, useRef, useState} from 'react';
import {doc, serverTimestamp, setDoc, Timestamp, updateDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {GetRandomLevel, GetRandomQuestion} from '../utils';

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
    timerRef.current = window.setTimeout(async () => {
      console.log('timer action launched');
      await sendEmptyAnswer();
    }, timeout);

    return () => {
      console.log('timer cleared');
      window.clearTimeout(timerRef.current);
    };
  }, [answer]);

  // useEffect(() => {
  //   async function unload(e: BeforeUnloadEvent) {
  //     e.preventDefault();
  //     if (!answer) {
  //       await sendEmptyAnswer();
  //     }
  //   }
  //
  //   window.addEventListener('beforeunload', unload);
  //
  //   return () => {
  //     window.removeEventListener('beforeunload', unload);
  //   };
  // }, [answer]);

  async function sendEmptyAnswer() {
    switch (questionSnapshot.questionType) {
      case 0: {
        await sendMove(0.75);
        break;
      }
      case 1: {
        await sendMove(0.5);
        break;
      }
      case 2: {
        break;
      }
      case 3: {
        break;
      }
      case 4: {
        if (player.color === questionSnapshot.move.player.color) {
          await sendMove(-1);
        }

        break;
      }
    }

    await sendAnswer(-1, Timestamp.now(), 0);
    await toNextPlayer();
    await toNextQuestion();
  }

  async function onAnswer(index: number) {
    console.log('player', player);
    console.log('answer', index);

    if (answer) {
      return;
    }

    const clientDate = Timestamp.now();
    const time = clientDate.toMillis() - (questionSnapshot.date as Timestamp).toMillis();
    console.log('think time, ms', time);
    console.log('move sent started', new Date());
    setAnswer({answer: index, correct: question.correct});

    const isCorrect = question.correct === index;
    switch (questionSnapshot.questionType) {
      case 0: {
        await sendMove(isCorrect ? 1.5 : 1);
        break;
      }
      case 1: {
        await sendMove(isCorrect ? 2 : 0.5);
        break;
      }
      case 2: {
        if (isCorrect) {
          await sendMove(2.5);
        }
        break;
      }
      case 3: {
        if (isCorrect) {
          if (player.color === questionSnapshot.move.player.color) {
            await sendMove(3.5);
          }
          else {
            await sendMove(0.75);
          }
        }
        break;
      }
      case 4: {
        if (isCorrect) {
          if (player.color === questionSnapshot.move.player.color) {
            await sendMove(4);
          }
          else {
            await sendMove(1.25);
          }
        } else {
          if (player.color === questionSnapshot.move.player.color) {
            await sendMove(-0.5);
          }
        }
        break;
      }
      case 5: {
        if (isCorrect) {
          await sendMove(3);
        }
        break;
      }
    }

    await sendAnswer(index, clientDate, time);
    await toNextPlayer();
    await toNextQuestion();
  }

  async function sendMove(value: number) {
    const move = {...questionSnapshot.move, player};
    const snapshot: MoveSnapshot = {date: serverTimestamp(), move, value};
    const docRef = doc(db, boardsCollectionId, game.id, movesCollectionId, `${move.x}_${move.y}`);

    try {
      await setDoc(docRef, snapshot);
      console.log('move sent', new Date());
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function sendAnswer(answer: number, clientDate: Timestamp, thinkTime: number) {
    const snapshot: AnswerSnapshot = {date: serverTimestamp(), question: question.id, player, answer, clientDate, thinkTime};
    const docRef = doc(db, boardsCollectionId, game.id, answersCollectionId, `${question.id}_${player.color}`);

    try {
      await setDoc(docRef, snapshot);
      console.log('answer sent', new Date());
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function toNextPlayer() {
    const playerIndex = game.players.findIndex(color => color.color === questionSnapshot.move.player.color);
    const newIndex = playerIndex === game.players.length - 1 ? 0 : playerIndex + 1;
    const nextPlayer = game.players[newIndex];

    try {
      const gameRef = doc(db, boardsCollectionId, game.id);
      await updateDoc(gameRef, {
        movePlayer: nextPlayer
      });
      console.log('next player sent', new Date());
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function toNextQuestion() {
    if (game.questions.length % game.players.length === 0) {
      const level = GetRandomLevel();
      const question = GetRandomQuestion(level);

      try {
        const gameRef = doc(db, boardsCollectionId, game.id);
        await updateDoc(gameRef, {question});
        console.log('next question sent', new Date());
      } catch (e: unknown) {
        console.error(e);
      }
    }
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