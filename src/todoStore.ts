import { Todo } from './todoTypes';

export const TODOS_STORAGE_KEY = 'todo_app_data';
const CACHE_TTL_SECONDS = 21600; // 6 hours

function isTodoArray(value: unknown): value is Todo[] {
    if (!Array.isArray(value)) return false;
    return value.every(
        (item) =>
            item !== null &&
            typeof item === 'object' &&
            typeof (item as Todo).id === 'string' &&
            typeof (item as Todo).title === 'string' &&
            typeof (item as Todo).completed === 'boolean' &&
            typeof (item as Todo).createdAt === 'number',
    );
}

function parseTodos(raw: string): Todo[] | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        return isTodoArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function log(level: 'WARN' | 'ERROR', message: string): void {
    Logger.log(`[${level}] TodoStore: ${message}`);
}

export class TodoStore {
    static readTodos(): Todo[] {
        const cache = CacheService.getUserCache();
        const cachedData = cache?.get(TODOS_STORAGE_KEY);

        if (cachedData) {
            const parsedCache = parseTodos(cachedData);
            if (parsedCache) {
                return parsedCache;
            }
            cache?.remove(TODOS_STORAGE_KEY);
            log('WARN', 'Invalid cache data detected and evicted.');
        }

        const properties = PropertiesService.getUserProperties();
        const persistedData = properties.getProperty(TODOS_STORAGE_KEY);

        if (!persistedData) return [];

        const parsedPersisted = parseTodos(persistedData);
        if (!parsedPersisted) {
            properties.deleteProperty(TODOS_STORAGE_KEY);
            cache?.remove(TODOS_STORAGE_KEY);
            log('ERROR', 'Invalid storage data detected and reset.');
            return [];
        }

        try {
            cache?.put(TODOS_STORAGE_KEY, persistedData, CACHE_TTL_SECONDS);
        } catch {
            log('WARN', 'Failed to warm cache after reading persisted data.');
        }

        return parsedPersisted;
    }

    static writeTodos(todos: Todo[]): void {
        const serialized = JSON.stringify(todos);

        const properties = PropertiesService.getUserProperties();
        properties.setProperty(TODOS_STORAGE_KEY, serialized);

        try {
            CacheService.getUserCache()?.put(TODOS_STORAGE_KEY, serialized, CACHE_TTL_SECONDS);
        } catch {
            log('WARN', 'Failed to update cache after persisting data.');
        }
    }
}
