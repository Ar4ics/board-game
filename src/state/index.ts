import {Move} from '../model/Move';
import {atom, selector} from 'recoil';
import {Game, GameSize, MoveSnapshot} from '../model';
import {collection, getDocs, orderBy, query} from 'firebase/firestore';
import {db} from '../firebase';

export const playersColors = ['orange', 'lightblue', 'lightgreen', 'pink', 'aqua'];
export const boardsCollectionId = 'boards';
export const movesCollectionId = 'moves';

const getMoveQuery = selector({
  key: 'getMoveQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game) {
      return undefined;
    }

    return game.moves.length === 0 ? undefined : Move.Create(game.moves.length);
  }
});

const getGameSizeQuery = selector({
  key: 'getGameSizeQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game) {
      return { rows: 5, cols: 5 };
    }

    return game.size;
  }
});

const getPlayersCountQuery = selector({
  key: 'getPlayersCountQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game) {
      return 2;
    }

    return game.players.length;
  }
});

const getCurrentPlayerQuery = selector({
  key: 'getCurrentPlayerQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game) {
      return playersColors[0];
    }

    const lastMove = game.moves.at(-1);
    if (lastMove) {
      return lastMove.move.player;
    }

    return playersColors[0];
  }
});

const getGameQuery = selector({
  key: 'getGameQuery',
  get: async () => {
    return await getGame();
  },
});

async function getGame(): Promise<Game | undefined> {
  const querySnapshot = await getDocs(query(collection(db, boardsCollectionId), orderBy('date', 'desc')));
  const games = querySnapshot.docs.map(doc => doc.data());
  if (games.length === 0) {
    return undefined;
  }

  const game = games[0] as Game;
  const querySnapshot1 = await getDocs(query(collection(db, boardsCollectionId, game.id, movesCollectionId), orderBy('date', 'asc')));
  const moves = querySnapshot1.docs.map(doc => doc.data() as MoveSnapshot);

  return {...game, moves};
}

export const gameState = atom<Game | undefined>({
  key: 'gameState',
  default: getGameQuery,
});
export const gameSizeState = atom<GameSize>({
  key: 'gameSizeState',
  default: getGameSizeQuery
});
export const moveState = atom<Move | undefined>({
  key: 'moveState',
  default: getMoveQuery,
});
export const playersCountState = atom<number>({
  key: 'playersCountState',
  default: getPlayersCountQuery,
});
export const currentPlayerState = atom<string>({
  key: 'currentPlayerState',
  default: getCurrentPlayerQuery,
});