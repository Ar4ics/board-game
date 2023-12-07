import React, {useEffect, useRef} from 'react';
import './Main.css';
import {db} from '../firebase';
import {collection, onSnapshot, orderBy, query} from 'firebase/firestore';
import {
  boardsCollectionId,
  gameSizeState,
  gameState,
  moveState,
  movesCollectionId,
  playersColors,
  playersCountState, currentPlayerState, questionsCollectionId, answersCollectionId
} from '../state';
import {AnswerSnapshot, Game, MoveSnapshot, QuestionSnapshot} from '../model';
import GameComponent from './GameComponent';
import CreateGameComponent from './CreateGameComponent';
import {useRecoilState, useSetRecoilState} from 'recoil';
import {Move} from '../model/Move';

export default function MainComponent() {
  const [game, setGame] = useRecoilState(gameState);
  console.log('game', game);
  const gameRef = useRef(game);

  React.useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const setGameSize = useSetRecoilState(gameSizeState);
  const setMove = useSetRecoilState(moveState);
  const setPlayer = useSetRecoilState(currentPlayerState);
  const setPlayersCount = useSetRecoilState(playersCountState);

  useEffect(() => {
    let firstRun = true;
    const unsubscribe = onSnapshot(query(collection(db, boardsCollectionId), orderBy('date', 'desc')), (querySnapshot) => {
      const games = querySnapshot.docs.map(doc => doc.data());
      console.log('server games', games);
      if (firstRun) {
        firstRun = false;
        return;
      }

      const changes = querySnapshot.docChanges().map(change => ({type: change.type, game: change.doc.data() as Game}));
      console.log('server games changes', changes);

      const changedGame = changes.find(change => {
        if (change.type !== 'modified') {
          return false;
        }
        return gameRef.current?.id == change.game.id;
      });

      if (changedGame && gameRef.current) {
        console.log('next player', changedGame.game.movePlayer);
        setGame({...gameRef.current, movePlayer: changedGame.game.movePlayer});
        return;
      }

      if (games.length === 0) {
        setGame(undefined);
        setMove(undefined);
      }
      else {
        const game = games[0] as Game;
        console.log('server game', game);
        setGame({...game, moves: [], questions: [], answers: []});
        setGameSize(game.size);
        setMove(undefined);
        setPlayer(old => {
          if (!game.players.some(color => color === old)) {
            return game.players.at(-1) ?? playersColors[0];
          }
          return old;
        });
        setPlayersCount(game.players.length);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!game) {
      return;
    }

    let firstRun = true;
    const query1 = query(collection(db, boardsCollectionId, game.id, movesCollectionId), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(query1, (querySnapshot) => {
      if (firstRun) {
        firstRun = false;
        return;
      }

      if (!querySnapshot.metadata.hasPendingWrites &&
          !querySnapshot.metadata.fromCache) {
        const moves = querySnapshot.docs.map(doc => doc.data() as MoveSnapshot);
        console.log('server snapshots', moves);

        setGame(game => {
          if (!game) {
            return game;
          }
          return {...game, moves};
        });
        setMove(Move.Create(moves.length));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [game?.id]);

  useEffect(() => {
    if (!game) {
      return;
    }

    let firstRun = true;
    const query1 = query(collection(db, boardsCollectionId, game.id, questionsCollectionId), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(query1, (querySnapshot) => {
      if (firstRun) {
        firstRun = false;
        return;
      }

      if (!querySnapshot.metadata.hasPendingWrites &&
          !querySnapshot.metadata.fromCache) {
        const questions = querySnapshot.docs.map(doc => doc.data() as QuestionSnapshot);
        console.log('server questions', questions);

        setGame(game => {
          if (!game) {
            return game;
          }
          return {...game, questions};
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [game?.id]);

  useEffect(() => {
    if (!game) {
      return;
    }

    let firstRun = true;
    const query1 = query(collection(db, boardsCollectionId, game.id, answersCollectionId), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(query1, (querySnapshot) => {
      if (firstRun) {
        firstRun = false;
        return;
      }

      if (!querySnapshot.metadata.hasPendingWrites &&
          !querySnapshot.metadata.fromCache) {
        const answers = querySnapshot.docs.map(doc => doc.data() as AnswerSnapshot);
        console.log('server answers', answers);

        setGame(game => {
          if (!game) {
            return game;
          }
          return {...game, answers};
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [game?.id]);

  return (
    <div className="Main">
      <CreateGameComponent game={game} canPlayerChange={game !== undefined && game.questions.length === 0 && game.moves.length === 0} />
      { game && <GameComponent key={game.id} game={game} />}
    </div>
  );
}

