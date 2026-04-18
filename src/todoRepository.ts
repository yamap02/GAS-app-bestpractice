import { parseTodoArray, toJson } from './todoCodec';
import type { Todo } from './todoTypes';

export const TODOS_STORAGE_KEY = 'todo_app_data';
export const CACHE_TTL_SECONDS = 21600;

type PropertiesStore = Pick<GoogleAppsScript.Properties.Properties, 'getProperty' | 'setProperty' | 'deleteProperty'>;
type CacheStore = Pick<GoogleAppsScript.Cache.Cache, 'get' | 'put' | 'remove'>;
type LoggerLike = Pick<typeof Logger, 'log'>;

function log(logger: LoggerLike, level: 'WARN' | 'ERROR', message: string): void {
    logger.log(`[${level}] TodoRepository: ${message}`);
}

export class TodoRepository {
    static createUserScoped(): TodoRepository {
        const properties = PropertiesService.getUserProperties();
        const cache = CacheService.getUserCache();

        return new TodoRepository(properties, cache, Logger);
    }

    constructor(
        private readonly properties: PropertiesStore,
        private readonly cache: CacheStore | null,
        private readonly logger: LoggerLike,
    ) {}

    readTodos(): Todo[] {
        const cachedData = this.cache?.get(TODOS_STORAGE_KEY);

        if (cachedData) {
            const parsedCache = parseTodoArray(cachedData);
            if (parsedCache) {
                return parsedCache;
            }
            this.cache?.remove(TODOS_STORAGE_KEY);
            log(this.logger, 'WARN', 'Invalid cache data detected and evicted.');
        }

        const persistedData = this.properties.getProperty(TODOS_STORAGE_KEY);
        if (!persistedData) {
            return [];
        }

        const parsedPersisted = parseTodoArray(persistedData);
        if (!parsedPersisted) {
            this.properties.deleteProperty(TODOS_STORAGE_KEY);
            this.cache?.remove(TODOS_STORAGE_KEY);
            log(this.logger, 'ERROR', 'Invalid storage data detected and reset.');
            return [];
        }

        try {
            this.cache?.put(TODOS_STORAGE_KEY, persistedData, CACHE_TTL_SECONDS);
        } catch {
            log(this.logger, 'WARN', 'Failed to warm cache after reading persisted data.');
        }

        return parsedPersisted;
    }

    writeTodos(todos: Todo[]): void {
        const serialized = toJson(todos);

        this.properties.setProperty(TODOS_STORAGE_KEY, serialized);

        try {
            this.cache?.put(TODOS_STORAGE_KEY, serialized, CACHE_TTL_SECONDS);
        } catch {
            log(this.logger, 'WARN', 'Failed to update cache after persisting data.');
        }
    }
}
