import { TodoService } from '../todoService';
import type { Todo } from '../todoTypes';

describe('TodoService', () => {
    const createRepository = (todos: Todo[] = []) => {
        let state = [...todos];

        return {
            readTodos: jest.fn(() => [...state]),
            writeTodos: jest.fn((nextTodos: Todo[]) => {
                state = [...nextTodos];
            }),
        };
    };

    test('addTodo should create and persist a new todo using injected dependencies', () => {
        const repository = createRepository();
        const service = new TodoService(repository, {
            createId: () => 'generated-id',
            getCurrentTime: () => 1234,
        });

        const todo = service.addTodo('Write tests');

        expect(todo).toEqual({
            id: 'generated-id',
            title: 'Write tests',
            completed: false,
            createdAt: 1234,
        });
        expect(repository.writeTodos).toHaveBeenCalledWith([todo]);
    });

    test('toggleTodo should persist the toggled todo when id exists', () => {
        const repository = createRepository([
            { id: 'todo-1', title: 'First', completed: false, createdAt: 100 },
            { id: 'todo-2', title: 'Second', completed: true, createdAt: 200 },
        ]);
        const service = new TodoService(repository, {
            createId: () => 'unused',
            getCurrentTime: () => 0,
        });

        const updated = service.toggleTodo('todo-1');

        expect(updated).toEqual({
            id: 'todo-1',
            title: 'First',
            completed: true,
            createdAt: 100,
        });
        expect(repository.writeTodos).toHaveBeenCalledWith([
            { id: 'todo-1', title: 'First', completed: true, createdAt: 100 },
            { id: 'todo-2', title: 'Second', completed: true, createdAt: 200 },
        ]);
    });

    test('toggleTodo should return null and skip persistence when id does not exist', () => {
        const repository = createRepository([{ id: 'todo-1', title: 'First', completed: false, createdAt: 100 }]);
        const service = new TodoService(repository, {
            createId: () => 'unused',
            getCurrentTime: () => 0,
        });

        const updated = service.toggleTodo('missing-id');

        expect(updated).toBeNull();
        expect(repository.writeTodos).not.toHaveBeenCalled();
    });

    test('deleteTodo should return false and skip persistence when id does not exist', () => {
        const repository = createRepository([{ id: 'todo-1', title: 'First', completed: false, createdAt: 100 }]);
        const service = new TodoService(repository, {
            createId: () => 'unused',
            getCurrentTime: () => 0,
        });

        expect(service.deleteTodo('missing-id')).toBe(false);
        expect(repository.writeTodos).not.toHaveBeenCalled();
    });
});
