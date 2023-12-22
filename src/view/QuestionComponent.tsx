import {
  AnswerSnapshot,
  Game,
  isCompetitive,
  MoveAttemptSnapshot,
  MoveSnapshot,
  Player,
  PlayerAnswer,
  QuestionSnapshot
} from '../model';
import {answersCollectionId, boardsCollectionId, moveAttemptsCollectionId, movesCollectionId} from '../state';
import React, {useEffect, useRef, useState} from 'react';
import {doc, serverTimestamp, setDoc, Timestamp} from 'firebase/firestore';
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

  const [on, setOn] = useState(!isCompetitive(questionSnapshot.questionType));
  console.log('on', on);

  const timerRef = useRef<number>();
  const timeout = 10000;

  const question = questionSnapshot.question;

  useEffect(() => {
    if (on) {
      return;
    }

    console.log('delay time', questionSnapshot.delayTime);
    const ref = window.setTimeout(() => {
      setOn(true);
    }, questionSnapshot.delayTime);

    return () => {
      window.clearTimeout(ref);
    };
  }, []);

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
    const attempt = sendMoveAttempt(false);

    switch (questionSnapshot.questionType) {
      case 0: {
        await sendMove(1, attempt);
        break;
      }
      case 1: {
        await sendMove(0.5, attempt);
        break;
      }
    }

    await sendAnswer(-1, Timestamp.now(), 0);
  }

  async function onAnswer(index: number) {
    if (answer || !on) {
      return;
    }

    console.log('player', player, 'answered', index);

    const clientDate = Timestamp.now();
    const time = clientDate.toMillis() - (questionSnapshot.date as Timestamp).toMillis();
    console.log('think time, ms', time);
    console.log('move sent started', new Date());
    setAnswer({answer: index, correct: question.correct});

    const isCorrect = question.correct === index;
    const attempt = sendMoveAttempt(isCorrect);

    switch (questionSnapshot.questionType) {
      case 0: {
        await sendMove(isCorrect ? 1.5 : 1, attempt);
        break;
      }
      case 1: {
        await sendMove(isCorrect ? 2 : 0.5, attempt);
        break;
      }
      case 2: {
        if (isCorrect) {
          await sendMove(2.5, attempt);
        }
        break;
      }
      case 4: {
        if (isCorrect) {
          if (player.color === questionSnapshot.move.player.color) {
            await sendMove(3.5, attempt);
          }
          else {
            await sendMove(1, attempt);
          }
        }
        break;
      }
      case 5: {
        if (isCorrect) {
          if (player.color === questionSnapshot.move.player.color) {
            await sendMove(4, attempt);
          }
          else {
            await sendMove(1.5, attempt);
          }
        }
        break;
      }
    }

    await sendAnswer(index, clientDate, time);
  }

  function sendMoveAttempt(isCorrect: boolean): MoveAttemptSnapshot {
    const move = {...questionSnapshot.move, player};

    const moveAttemptDate = Timestamp.fromMillis((questionSnapshot.date as Timestamp).toDate().getTime() + questionSnapshot.delayTime);
    const snapshot: MoveAttemptSnapshot = {questionId: questionSnapshot.id, date: serverTimestamp(), move, isCorrect, moveAttemptDate, questionType: questionSnapshot.questionType};
    const docRef = doc(db, boardsCollectionId, game.id, moveAttemptsCollectionId, `${questionSnapshot.id}_${player.color}`);

    setDoc(docRef, snapshot).then(() => console.log('move attempt sent', new Date()));

    return snapshot;
  }

  async function sendMove(value: number, attempt: MoveAttemptSnapshot) {
    const move = {...questionSnapshot.move, player};
    const snapshot: MoveSnapshot = {questionId: attempt.questionId, questionType: attempt.questionType, date: serverTimestamp(), move, value};
    const docRef = doc(db, boardsCollectionId, game.id, movesCollectionId, `${move.x}_${move.y}`);

    try {
      await setDoc(docRef, snapshot);
      console.log('move sent', new Date());
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function sendAnswer(answer: number, clientDate: Timestamp, thinkTime: number) {
    const snapshot: AnswerSnapshot = {date: serverTimestamp(), questionId: questionSnapshot.id, player, answer, clientDate, thinkTime};
    const docRef = doc(db, boardsCollectionId, game.id, answersCollectionId, `${questionSnapshot.id}_${player.color}`);

    try {
      await setDoc(docRef, snapshot);
      console.log('answer sent', new Date());
    } catch (e: unknown) {
      console.error(e);
    }
  }

  function getButtonStyle(index: number) {
    const style: React.CSSProperties = {
      padding: '5px',
      borderBottom: '1px solid black', borderRight: '1px solid black',
      backgroundColor: !on ? 'lightgray' : !answer
        ? 'white'
        : index === answer.correct
          ? 'lightgreen'
          : index === answer.answer
            ? 'pink'
            : 'white',
    };
    return style;
  }

  const questionStyle: React.CSSProperties = {
    borderTop: '1px solid black',
    borderLeft: '1px solid black',
  };

  return (
    <div style={{marginTop: '1vh'}}>
      <div style={{paddingBottom: '5px', textAlign: 'center'}}>{question.title}</div>
      <div style={questionStyle}>
        {
          question.answers.map((answer, index) => <div style={getButtonStyle(index)} key={index} onClick={() => onAnswer(index)}>{answer}</div>)
        }
      </div>
    </div>
  );
}