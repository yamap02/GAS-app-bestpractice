import {
    assertSafeTodoId,
    createMockTodo,
    parseTodoPayload,
    parseTodoListPayload,
} from '../../frontend/src/api/gasSecurity';

describe('frontend gas security guards', () => {
    test('parseTodoPayload accepts well-formed todo payloads', () => {
        const todo = createMockTodo({
            id: '123e4567-e89b-42d3-a456-426614174000',
            title: 'Ship secure frontend',
            createdAt: 1_713_456_789_000,
        });

        expect(parseTodoPayload(todo, 'todo')).toEqual(todo);
    });

    test('parseTodoPayload rejects malformed ids', () => {
        expect(() =>
            parseTodoPayload(
                createMockTodo({
                    id: 'todo-1',
                }),
                'todo',
            ),
        ).toThrow('Unexpected response format for todo');
    });

    test('parseTodoPayload rejects invalid timestamps', () => {
        expect(() =>
            parseTodoPayload(
                createMockTodo({
                    createdAt: Number.POSITIVE_INFINITY,
                }),
                'todo',
            ),
        ).toThrow('Unexpected response format for todo');
    });

    test('parseTodoListPayload rejects non-array payloads', () => {
        expect(() => parseTodoListPayload({ invalid: true }, 'todos')).toThrow('Unexpected response format for todos');
    });

    test('assertSafeTodoId rejects non-uuid ids before API invocation', () => {
        expect(() => assertSafeTodoId('../etc/passwd')).toThrow('Invalid todo id.');
    });
});
