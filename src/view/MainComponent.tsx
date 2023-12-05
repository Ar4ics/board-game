import React, {useEffect} from 'react';
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
  playersCountState, currentPlayerState
} from '../state';
import {Game, MoveSnapshot} from '../model';
import GameComponent from './GameComponent';
import CreateGameComponent from './CreateGameComponent';
import {useRecoilState, useSetRecoilState} from 'recoil';
import {Move} from '../model/Move';

export default function MainComponent() {
  const [game, setGame] = useRecoilState(gameState);
  console.log('game', game);

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

      if (games.length === 0) {
        setGame(undefined);
        setMove(undefined);
      }
      else {
        const game = games[0] as Game;
        console.log('server game', game);
        setGame({...game, moves: []});
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

        setGame({...game, moves});
        setMove(Move.Create(moves.length));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [game?.id]);

  return (
    <div className="Main">
      <CreateGameComponent game={game} />
      { game && <GameComponent key={game.id} game={game} />}
    </div>
  );
}

