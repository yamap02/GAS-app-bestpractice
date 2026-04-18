import { MAX_TODO_TITLE_LENGTH } from '../constants/todo';
import type { Todo } from '../types/todo';
import type { DeleteTodoResponse, ToggleTodoResponse } from './contracts';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

function isSafeTodoTitle(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TODO_TITLE_LENGTH;
}

function isSafeTodoId(value: unknown): value is string {
    return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

function isSafeTimestamp(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isTodo(value: unknown): value is Todo {
    return (
        isPlainObject(value) &&
        isSafeTodoId(value.id) &&
        isSafeTodoTitle(value.title) &&
        typeof value.completed === 'boolean' &&
        isSafeTimestamp(value.createdAt)
    );
}

function isTodoArray(value: unknown): value is Todo[] {
    return Array.isArray(value) && value.every(isTodo);
}

function isDeleteTodoResponse(value: unknown): value is DeleteTodoResponse {
    return isPlainObject(value) && typeof value.success === 'boolean';
}

function isToggleTodoResponse(value: unknown): value is ToggleTodoResponse {
    return isPlainObject(value) && 'todo' in value && (value.todo === null || isTodo(value.todo));
}

export function assertSafeTodoId(id: string): string {
    if (!isSafeTodoId(id)) {
        throw new Error('Invalid todo id.');
    }

    return id;
}

export function parseTodoPayload(value: unknown, errorContext: string): Todo {
    if (!isTodo(value)) {
        throw new Error(`Unexpected response format for ${errorContext}`);
    }

    return value;
}

export function parseTodoListPayload(value: unknown, errorContext: string): Todo[] {
    if (!isTodoArray(value)) {
        throw new Error(`Unexpected response format for ${errorContext}`);
    }

    return value;
}

export function parseDeleteTodoPayload(value: unknown, errorContext: string): DeleteTodoResponse {
    if (!isDeleteTodoResponse(value)) {
        throw new Error(`Unexpected response format for ${errorContext}`);
    }

    return value;
}

export function parseToggleTodoPayload(value: unknown, errorContext: string): ToggleTodoResponse {
    if (!isToggleTodoResponse(value)) {
        throw new Error(`Unexpected response format for ${errorContext}`);
    }

    return value;
}

export function createMockTodo(overrides: Partial<Todo> = {}): Todo {
    return {
        id: overrides.id ?? '123e4567-e89b-42d3-a456-426614174000',
        title: overrides.title ?? 'Local fallback todo',
        completed: overrides.completed ?? false,
        createdAt: overrides.createdAt ?? 1_700_000_000_000,
    };
}
