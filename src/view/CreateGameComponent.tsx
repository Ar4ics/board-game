import React from 'react';
import {CreateGame} from '../utils';
import {boardsCollectionId, currentPlayerState, gameSizeState, playersColors, playersCountState} from '../state';
import {doc, setDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {useRecoilState} from 'recoil';
import {Game} from '../model';

interface CreateGameComponentProps {
  game: Game | undefined,
}

export default function CreateGameComponent({ game } : CreateGameComponentProps) {
  const [gameSize, setGameSize] = useRecoilState(gameSizeState);
  console.log('gameSize', gameSize);
  const [player, setPlayer] = useRecoilState(currentPlayerState);
  console.log('player', player);

  const [playersCount, setPlayersCount] = useRecoilState(playersCountState);

  function onGameSizeChange(e: React.ChangeEvent<HTMLInputElement>)
  {
    const size = {...gameSize, [e.target.name]: parseInt(e.target.value)};
    setGameSize(size);
  }

  async function startNewGame()
  {
    const newPlayers = playersColors.slice(0, playersCount);
    const newGame = CreateGame(newPlayers, gameSize);
    await setDoc(doc(db, boardsCollectionId, newGame.id), newGame);
  }

  function onPlayerChange() {
    if (!game) {
      return;
    }

    const players = game.players;

    const playerIndex = players.findIndex(color => color === player);
    const newIndex = playerIndex === players.length - 1 ? 0 : playerIndex + 1;
    setPlayer(players[newIndex]);
  }

  const playersAll = [...Array(playersColors.length - 1).keys()].map(x => x + 2);
  const selectHandler = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setPlayersCount(count);
  };

  return (
    <div className="inputControls" style={{marginTop: '5vh'}}>
      <div>
        <input name="rows" className="xyCell" type="number" min="3" max="10" value={gameSize.rows} onChange={onGameSizeChange} />
        <input name="cols" className="xyCell" type="number" min="3" max="10" value={gameSize.cols} onChange={onGameSizeChange} />
        <select value={playersCount} onChange={(e) => selectHandler(e)}>
          {playersAll.map(count => (
            <option key={count}>{count}</option>
          ))}
        </select>
      </div>
      <div></div>
      <button onClick={() => startNewGame()}>
        Новая игра
      </button>
      <button hidden={!game} onClick={() => onPlayerChange()}>
        Изменить цвет
      </button>
    </div>
  );
}