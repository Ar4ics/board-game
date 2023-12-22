import React, {useEffect, useRef} from 'react';
import './Main.css';
import {db} from '../firebase';
import {collection, limit, onSnapshot, orderBy, query} from 'firebase/firestore';
import {
  boardsCollectionId,
  gameSizeState,
  gameState,
  moveState,
  movesCollectionId,
  playersCountState,
  currentPlayerState,
  questionsCollectionId,
  answersCollectionId,
  moveAttemptsCollectionId
} from '../state';
import {AnswerSnapshot, Game, MoveAttemptSnapshot, MoveSnapshot, Player, QuestionSnapshot} from '../model';
import GameComponent from './GameComponent';
import CreateGameComponent from './CreateGameComponent';
import {useRecoilState, useSetRecoilState} from 'recoil';
import {Move} from '../model/Move';

export default function MainComponent({isTest}: {isTest: boolean}) {
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

  function updatePlayer(game: Game) {
    setPlayer(old => {
      const player = game.players.find(p => p.color === old.color);
      if (!player) {
        return game.players.at(-1) as Player;
      }
      return player;
    });
  }

  useEffect(() => {
    let firstRun = true;
    const unsubscribe = onSnapshot(query(collection(db, boardsCollectionId), orderBy('date', 'desc'), limit(1)), (querySnapshot) => {
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
        return gameRef.current?.id === change.game.id;
      });

      if (changedGame && gameRef.current) {
        console.log('next player', changedGame.game.movePlayer);
        setGame({...gameRef.current, players: changedGame.game.players, movePlayer: changedGame.game.movePlayer, question: changedGame.game.question});
        updatePlayer(changedGame.game);
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
        updatePlayer(game);
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
        console.log('server moves', moves);

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
    const query1 = query(collection(db, boardsCollectionId, game.id, moveAttemptsCollectionId), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(query1, (querySnapshot) => {
      if (firstRun) {
        firstRun = false;
        return;
      }

      if (!querySnapshot.metadata.hasPendingWrites &&
          !querySnapshot.metadata.fromCache) {
        const moveAttempts = querySnapshot.docs.map(doc => doc.data() as MoveAttemptSnapshot);
        console.log('server move attempts', moveAttempts);

        setGame(game => {
          if (!game) {
            return game;
          }
          return {...game, moveAttempts};
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
        console.log('server questions changes', querySnapshot.docChanges().map(change => ({type: change.type, data: change.doc.data()})));

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
      <CreateGameComponent isTest={isTest} game={game} canPlayerChange={isTest || game !== undefined && game.questions.length === 0 && game.moves.length === 0} />
      { game && <GameComponent key={game.id} isTest={isTest} game={game} />}
    </div>
  );
}