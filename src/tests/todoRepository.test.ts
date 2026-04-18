import { CACHE_TTL_SECONDS, TODOS_STORAGE_KEY, TodoRepository } from '../todoRepository';

describe('TodoRepository', () => {
    let mockPropertiesGet: jest.Mock;
    let mockPropertiesSet: jest.Mock;
    let mockPropertiesDelete: jest.Mock;
    let mockCacheGet: jest.Mock;
    let mockCachePut: jest.Mock;
    let mockCacheRemove: jest.Mock;
    let mockLoggerLog: jest.Mock;

    beforeEach(() => {
        mockPropertiesGet = jest.fn();
        mockPropertiesSet = jest.fn();
        mockPropertiesDelete = jest.fn();
        mockCacheGet = jest.fn();
        mockCachePut = jest.fn();
        mockCacheRemove = jest.fn();
        mockLoggerLog = jest.fn();
    });

    const createRepository = () =>
        new TodoRepository(
            {
                getProperty: mockPropertiesGet,
                setProperty: mockPropertiesSet,
                deleteProperty: mockPropertiesDelete,
            },
            {
                get: mockCacheGet,
                put: mockCachePut,
                remove: mockCacheRemove,
            },
            { log: mockLoggerLog },
        );

    test('readTodos should return cached todos and skip properties lookup', () => {
        const cachedTodos = [{ id: '1', title: 'Cached Todo', completed: false, createdAt: 1000 }];
        mockCacheGet.mockReturnValue(JSON.stringify(cachedTodos));

        const todos = createRepository().readTodos();

        expect(todos).toEqual(cachedTodos);
        expect(mockPropertiesGet).not.toHaveBeenCalled();
    });

    test('readTodos should load from properties and warm the cache when cache is empty', () => {
        const persistedTodos = [{ id: '2', title: 'Persisted Todo', completed: true, createdAt: 2000 }];
        mockCacheGet.mockReturnValue(null);
        mockPropertiesGet.mockReturnValue(JSON.stringify(persistedTodos));

        const todos = createRepository().readTodos();

        expect(todos).toEqual(persistedTodos);
        expect(mockCachePut).toHaveBeenCalledWith(TODOS_STORAGE_KEY, JSON.stringify(persistedTodos), CACHE_TTL_SECONDS);
    });

    test('readTodos should evict invalid cache data', () => {
        mockCacheGet.mockReturnValue('{bad json');
        mockPropertiesGet.mockReturnValue(null);

        const todos = createRepository().readTodos();

        expect(todos).toEqual([]);
        expect(mockCacheRemove).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
    });

    test('readTodos should reset persisted data when storage content is invalid', () => {
        mockCacheGet.mockReturnValue(null);
        mockPropertiesGet.mockReturnValue('{"foo":"bar"}');

        const todos = createRepository().readTodos();

        expect(todos).toEqual([]);
        expect(mockPropertiesDelete).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockCacheRemove).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
    });

    test('writeTodos should update both properties and cache', () => {
        const todos = [{ id: '3', title: 'New Todo', completed: false, createdAt: 3000 }];

        createRepository().writeTodos(todos);

        expect(mockPropertiesSet).toHaveBeenCalledWith(TODOS_STORAGE_KEY, JSON.stringify(todos));
        expect(mockCachePut).toHaveBeenCalledWith(TODOS_STORAGE_KEY, JSON.stringify(todos), CACHE_TTL_SECONDS);
    });
});
