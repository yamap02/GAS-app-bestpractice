import { TodoService } from '../todoService';
import { TODOS_STORAGE_KEY } from '../todoStore';

describe('TodoService', () => {
    let mockPropertiesGet: jest.Mock;
    let mockPropertiesSet: jest.Mock;
    let mockPropertiesDelete: jest.Mock;
    let mockCacheGet: jest.Mock;
    let mockCachePut: jest.Mock;
    let mockCacheRemove: jest.Mock;
    let mockLoggerLog: jest.Mock;

    beforeEach(() => {
        // Mock PropertiesService
        mockPropertiesGet = jest.fn();
        mockPropertiesSet = jest.fn();
        mockPropertiesDelete = jest.fn();
        global.PropertiesService = {
            getUserProperties: () => ({
                getProperty: mockPropertiesGet,
                setProperty: mockPropertiesSet,
                deleteProperty: mockPropertiesDelete,
            }),
        } as unknown as typeof PropertiesService;

        // Mock CacheService
        mockCacheGet = jest.fn();
        mockCachePut = jest.fn();
        mockCacheRemove = jest.fn();
        global.CacheService = {
            getUserCache: () => ({
                get: mockCacheGet,
                put: mockCachePut,
                remove: mockCacheRemove,
            }),
        } as unknown as typeof CacheService;

        // Mock Utilities
        global.Utilities = {
            getUuid: () => 'test-uuid-1234',
        } as unknown as typeof Utilities;

        mockLoggerLog = jest.fn();
        global.Logger = {
            log: mockLoggerLog,
        } as unknown as typeof Logger;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getTodos should return empty array when no data exists', () => {
        mockCacheGet.mockReturnValue(null);
        mockPropertiesGet.mockReturnValue(null);

        const todos = TodoService.getTodos();

        expect(todos).toEqual([]);
        expect(mockCacheGet).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockPropertiesGet).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
    });

    test('getTodos should return data from cache and skip properties', () => {
        const cachedTodos = [{ id: '1', title: 'Cached Todo', completed: false, createdAt: 1000 }];
        mockCacheGet.mockReturnValue(JSON.stringify(cachedTodos));

        const todos = TodoService.getTodos();

        expect(todos).toEqual(cachedTodos);
        expect(mockCacheGet).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockPropertiesGet).not.toHaveBeenCalled(); // Should not fall back
    });

    test('getTodos should fall back to properties and update cache if cache is empty', () => {
        const propsTodos = [{ id: '2', title: 'Props Todo', completed: true, createdAt: 2000 }];
        mockCacheGet.mockReturnValue(null);
        mockPropertiesGet.mockReturnValue(JSON.stringify(propsTodos));

        const todos = TodoService.getTodos();

        expect(todos).toEqual(propsTodos);
        expect(mockCacheGet).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockPropertiesGet).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockCachePut).toHaveBeenCalledWith(TODOS_STORAGE_KEY, JSON.stringify(propsTodos), 21600);
    });

    test('getTodos should evict cache when cached data is invalid JSON', () => {
        mockCacheGet.mockReturnValue('{bad json');
        mockPropertiesGet.mockReturnValue(null);

        const todos = TodoService.getTodos();

        expect(todos).toEqual([]);
        expect(mockCacheRemove).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
    });

    test('getTodos should reset storage when persisted data is invalid', () => {
        mockCacheGet.mockReturnValue(null);
        mockPropertiesGet.mockReturnValue('{"foo":"bar"}');

        const todos = TodoService.getTodos();

        expect(todos).toEqual([]);
        expect(mockPropertiesDelete).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
        expect(mockCacheRemove).toHaveBeenCalledWith(TODOS_STORAGE_KEY);
    });

    test('addTodo should update both properties and cache', () => {
        const newTodos = [{ id: '3', title: 'New Todo', completed: false, createdAt: 3000 }];
        mockCacheGet.mockReturnValue(JSON.stringify(newTodos));

        TodoService.addTodo('Write tests');

        const savedData = JSON.parse(mockPropertiesSet.mock.calls[0][1]) as Array<{ id: string }>;
        expect(savedData).toHaveLength(2);
        expect(savedData[1].id).toBe('test-uuid-1234');
        expect(mockPropertiesSet).toHaveBeenCalledWith(TODOS_STORAGE_KEY, mockPropertiesSet.mock.calls[0][1]);
        expect(mockCachePut).toHaveBeenCalledWith(TODOS_STORAGE_KEY, mockPropertiesSet.mock.calls[0][1], 21600);
    });
});
