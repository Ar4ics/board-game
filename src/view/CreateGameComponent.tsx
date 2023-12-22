import React from 'react';
import {CreateGame} from '../utils';
import {boardsCollectionId, currentPlayerState, gameSizeState, playersColors, playersCountState} from '../state';
import {doc, setDoc, updateDoc} from 'firebase/firestore';
import {db} from '../firebase';
import {useRecoilState} from 'recoil';
import {Game, Player} from '../model';

interface CreateGameComponentProps {
  isTest: boolean,
  game: Game | undefined,
  canPlayerChange: boolean,
}

export default function CreateGameComponent({ isTest, game, canPlayerChange } : CreateGameComponentProps) {
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
    const newPlayers = game && game.players.length === playersCount ? game.players : playersColors.slice(0, playersCount).map(p => ({color: p} as Player));
    const newGame = CreateGame(newPlayers.map(p => ({...p, isReady: isTest})), gameSize);
    await setDoc(doc(db, boardsCollectionId, newGame.id), newGame);

    const newPlayer = {...player, isReady: isTest};
    setPlayer(newPlayer);
    localStorage.setItem('player', JSON.stringify(newPlayer));
  }

  async function onPlayerChange() {
    if (!game) {
      return;
    }

    const players = game.players;

    const playerIndex = players.findIndex(p => p.color === player.color);
    const newIndex = playerIndex === players.length - 1 ? 0 : playerIndex + 1;
    const newPlayer = {...players[newIndex], isReady: isTest};
    const newPlayers = players.map(p => ({...p, isReady: isTest}));

    setPlayer(newPlayer);
    localStorage.setItem('player', JSON.stringify(newPlayer));

    const gameRef = doc(db, boardsCollectionId, game.id);
    await updateDoc(gameRef, {players: newPlayers});
  }

  async function onPlayerNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    console.log('name', name);
    if (!game || game.players.find(p => p.name === name)) {
      return;
    }

    const newPlayer = {...player, name};
    const players = changePlayer(newPlayer, game);

    setPlayer(newPlayer);
    localStorage.setItem('player', JSON.stringify(newPlayer));

    const gameRef = doc(db, boardsCollectionId, game.id);
    await updateDoc(gameRef, {players});

    if (game.movePlayer.color == newPlayer.color) {
      await updateDoc(gameRef, {movePlayer: newPlayer});
    }
  }

  const playersAll = [...Array(playersColors.length - 1).keys()].map(x => x + 2);
  const selectHandler = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    setPlayersCount(count);
  };

  async function onPlayerReady() {
    if (!game) {
      return;
    }

    const newPlayer = {...player, isReady: !player.isReady};
    const players = changePlayer(newPlayer, game);

    setPlayer(newPlayer);
    localStorage.setItem('player', JSON.stringify(newPlayer));

    const gameRef = doc(db, boardsCollectionId, game.id);
    await updateDoc(gameRef, {players});
  }

  function changePlayer(newPlayer: Player, game: Game): Player[] {
    const players = [...game.players];
    const playerIndex = players.findIndex(p => p.color === player.color);
    players[playerIndex] = newPlayer;
    return players;
  }

  return (
    <div className="inputControls" style={{marginTop: '2vh'}}>
      <div className="flexRight">
        <input name="rows" className="xyCell" type="number" min="3" max="10" value={gameSize.rows} onChange={onGameSizeChange} />
        <input name="cols" className="xyCell" type="number" min="3" max="10" value={gameSize.cols} onChange={onGameSizeChange} />
        <select value={playersCount} onChange={(e) => selectHandler(e)}>
          {playersAll.map(count => (
            <option key={count}>{count}</option>
          ))}
        </select>
      </div>
      <div><input placeholder="Ваш псевдоним" maxLength={30} value={player.name} onChange={onPlayerNameChange} /></div>
      <div className="flexRight">
        <button onClick={() => startNewGame()}>
          Новая игра
        </button>
      </div>
      <div>
        <button hidden={!game} disabled={!canPlayerChange} onClick={() => onPlayerChange()}>
          Изменить цвет
        </button>
      </div>
      <div></div>
      <div>
        {game && (game.questions.length > 0 ? '' : <button onClick={onPlayerReady}>{player.isReady ? 'Я не готов' : 'Я готов'}</button>)}
      </div>
    </div>
  );
}