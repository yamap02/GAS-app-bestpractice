import type { Todo } from './todoTypes';

export function isTodo(value: unknown): value is Todo {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as Todo).id === 'string' &&
        typeof (value as Todo).title === 'string' &&
        typeof (value as Todo).completed === 'boolean' &&
        typeof (value as Todo).createdAt === 'number'
    );
}

export function isTodoArray(value: unknown): value is Todo[] {
    return Array.isArray(value) && value.every(isTodo);
}

export function parseTodoArray(raw: string): Todo[] | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        return isTodoArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function toJson<T>(value: T): string {
    return JSON.stringify(value);
}
