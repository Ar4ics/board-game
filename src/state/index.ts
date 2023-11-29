import {Move} from '../model/Move';
import {atom, selector} from 'recoil';
import {Game, GameSize} from '../model';
import {doc, getDoc} from 'firebase/firestore';
import {db} from '../firebase';

export const players = ['orange', 'lightblue'];
export const boardsCollectionId = 'boards';
export const boardDocumentId = 'main';

export const getMoveQuery = selector({
  key: 'getMoveQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game)
    {
      return undefined;
    }

    return game.snapshots.length === 0 ? undefined : Move.Create(game.snapshots.length - 1);
  }
});

export const getGameSizeQuery = selector({
  key: 'getGameSizeQuery',
  get: ({get}) => {
    const game = get(getGameQuery);
    if (!game)
    {
      return { rows: 5, cols: 5 };
    }

    return game.size;
  }
});

async function getGame(): Promise<Game | undefined> {
  const docRef = doc(db, boardsCollectionId, boardDocumentId);
  const docSnap = await getDoc(docRef);
  const game = docSnap.data() as Game | undefined;
  if (!game || Object.keys(game).length === 0)
  {
    return undefined;
  }

  return game;
}

export const getGameQuery = selector({
  key: 'getGameQuery',
  get: async () => {
    return await getGame();
  },
});

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
export const currentPlayerState = atom<string>({
  key: 'currentPlayerState',
  default: players[0],
});