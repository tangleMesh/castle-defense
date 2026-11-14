import { connectDb } from './db';
import { MatchRepo } from './matches';
import { SavedGameRepo } from './savedGames';
import { UserRepo } from './users';

/** Public surface of a class (lets tests swap in an in-memory implementation). */
type Api<T> = { [K in keyof T]: T[K] };

export interface Persistence {
  users: Api<UserRepo>;
  matches: Api<MatchRepo>;
  savedGames: Api<SavedGameRepo>;
  close(): Promise<void>;
}

export async function createPersistence(url: string, dbName?: string): Promise<Persistence> {
  const c = await connectDb(url, dbName);
  return {
    users: new UserRepo(c),
    matches: new MatchRepo(c),
    savedGames: new SavedGameRepo(c),
    close: () => c.close(),
  };
}

export * from './db';
export { EMPTY_STATS, toPublic } from './users';
