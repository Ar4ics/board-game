import {Move} from '../model/Move';
import {atom, selector} from 'recoil';
import {AnswerSnapshot, Game, GameSize, MoveSnapshot, Player, QuestionSnapshot} from '../model';
import {collection, getDocs, orderBy, where, limit, query} from 'firebase/firestore';
import {db} from '../firebase';

export const playersColors = ['orange', 'lightblue', 'lightgreen', 'pink', 'aqua'];
export const boardsCollectionId = 'boards';
export const movesCollectionId = 'moves';
export const questionsCollectionId = 'questions';
export const answersCollectionId = 'answers';

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
      return {
        color: playersColors[0]
      } as Player;
    }

    try {
      const json = localStorage.getItem('player');
      if (!json) {
        return game.players[0];
      }

      const player = JSON.parse(json) as Player;
      if (game.players.find(p => p.color === player.color)) {
        return player;
      }

      return game.players[0];
    } catch {
      return game.players[0];
    }
  }
});

const getGameQuery = selector({
  key: 'getGameQuery',
  get: async () => {
    return await getGame();
  },
});

async function getGame(): Promise<Game | undefined> {
  const querySnapshot = await getDocs(query(collection(db, boardsCollectionId), orderBy('date', 'desc'), limit(1)));
  const games = querySnapshot.docs.map(doc => doc.data());
  if (games.length === 0) {
    return undefined;
  }

  const game = games[0] as Game;
  const querySnapshot1 = await getDocs(query(collection(db, boardsCollectionId, game.id, movesCollectionId), orderBy('date', 'asc')));
  const moves = querySnapshot1.docs.map(doc => doc.data() as MoveSnapshot);

  const querySnapshot2 = await getDocs(query(collection(db, boardsCollectionId, game.id, questionsCollectionId), orderBy('date', 'asc')));
  const questions = querySnapshot2.docs.map(doc => doc.data() as QuestionSnapshot);

  const lastQuestion = questions.at(-1);
  if (!lastQuestion) {
    return {...game, moves, questions: [], answers: []};
  }

  const querySnapshot3 = await getDocs(query(collection(db, boardsCollectionId, game.id, answersCollectionId), where('question', '==', lastQuestion.question.id), orderBy('date', 'asc')));
  const answers = querySnapshot3.docs.map(doc => doc.data() as AnswerSnapshot);

  return {...game, moves, questions, answers};
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
export const currentPlayerState = atom<Player>({
  key: 'currentPlayerState',
  default: getCurrentPlayerQuery,
});