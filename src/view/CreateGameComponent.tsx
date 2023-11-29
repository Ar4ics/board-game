import React from 'react';
import {CreateGame} from '../utils';
import {boardDocumentId, boardsCollectionId, currentPlayerState, gameSizeState, players} from '../state';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {GameSize} from '../model';
import {useRecoilState} from 'recoil';

interface CreateGameComponentProps {
  canPlayerChange: boolean,
}

export default function CreateGameComponent({ canPlayerChange } : CreateGameComponentProps) {
  const [gameSize, setGameSize] = useRecoilState(gameSizeState);
  console.log('gameSize', gameSize);
  const [player, setPlayer] = useRecoilState(currentPlayerState);
  console.log('player', player);

  function onGameSizeChange(val: Partial<GameSize>)
  {
    const size = {...gameSize, ...val};
    setGameSize(size);
  }

  async function startNewGame()
  {
    const newGame = CreateGame(players, gameSize);
    await setDoc(doc(db, boardsCollectionId, boardDocumentId), newGame);
  }

  function onPlayerChange() {
    const playerIndex = players.findIndex(color => color === player);
    const newIndex = playerIndex === players.length - 1 ? 0 : playerIndex + 1;
    setPlayer(players[newIndex]);
  }

  return (
    <div className="Main">
      <div className="inputControls">
        <input className="inputCell" type="number" min="3" max="10" value={gameSize.rows} onChange={event => onGameSizeChange({rows: parseInt(event.target.value)})} />
        <input className="inputCell" type="number" min="3" max="10" value={gameSize.cols} onChange={event => onGameSizeChange({cols: parseInt(event.target.value)})} />
      </div>
      <div className="controls">
        <button className="controlCell" onClick={() => startNewGame()}>
          Новая игра
        </button>
        <button className="controlCell" disabled={!canPlayerChange} onClick={() => onPlayerChange()}>
          Изменить цвет
        </button>
      </div>
    </div>
  );
}