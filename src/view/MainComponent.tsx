import React, {useEffect} from 'react';
import './Main.css';
import {db} from '../firebase';
import {doc, onSnapshot} from 'firebase/firestore';
import {
  boardDocumentId,
  boardsCollectionId,
  gameSizeState,
  gameState,
  moveState
} from '../state';
import {Game} from '../model';
import GameComponent from './GameComponent';
import CreateGameComponent from './CreateGameComponent';
import {Move} from '../model/Move';
import {useRecoilState, useSetRecoilState} from 'recoil';

export default function MainComponent() {
  const [game, setGame] = useRecoilState(gameState);
  console.log('game', game);

  const setGameSize = useSetRecoilState(gameSizeState);
  const setMove = useSetRecoilState(moveState);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, boardsCollectionId, boardDocumentId), (doc) => {
      const game = doc.data() as Game | undefined;
      console.log('current game', game);
      if (!game || Object.keys(game).length === 0)
      {
        setGame(undefined);
        setMove(undefined);
      }
      else {
        let updateGameSize = false;
        setGame(old => {
          if (!old || (old.id !== game.id &&
              (old.size.rows !== game.size.rows ||
               old.size.cols !== game.size.cols)))
          {
            updateGameSize = true;
          }

          return game;
        });
        const nextMove = game.snapshots.length === 0 ? undefined : Move.Create(game.snapshots.length - 1);
        setMove(nextMove);

        if (updateGameSize)
        {
          setGameSize(game.size);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="Main">
      <CreateGameComponent canPlayerChange={game !== undefined && game.snapshots.length === 0} />
      { game && <GameComponent key={game.id} game={game} />}
    </div>
  );
}

