import type { Todo } from '../types/todo';
import type { DeleteTodoResponse, ToggleTodoResponse } from './contracts';
import { MAX_TODO_TITLE_LENGTH } from '../constants/todo';

type GasMethod = 'getTodos' | 'addTodo' | 'toggleTodo' | 'deleteTodo';
type GasRunnerApi = Window['google']['script']['run'];

function isTodo(value: unknown): value is Todo {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as Todo).id === 'string' &&
        typeof (value as Todo).title === 'string' &&
        typeof (value as Todo).completed === 'boolean' &&
        typeof (value as Todo).createdAt === 'number'
    );
}

function isTodoArray(value: unknown): value is Todo[] {
    return Array.isArray(value) && value.every(isTodo);
}

function isDeleteTodoResponse(value: unknown): value is DeleteTodoResponse {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as DeleteTodoResponse).success === 'boolean'
    );
}

function isToggleTodoResponse(value: unknown): value is ToggleTodoResponse {
    return (
        value !== null &&
        typeof value === 'object' &&
        'todo' in value &&
        (((value as ToggleTodoResponse).todo === null) || isTodo((value as ToggleTodoResponse).todo))
    );
}

function isGasAvailable(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof (window as Window & typeof globalThis).google !== 'undefined' &&
        !!(window as Window & typeof globalThis).google?.script?.run
    );
}

function invokeGasMethod(runner: GasRunnerApi, method: GasMethod, args: unknown[]): void {
    switch (method) {
        case 'getTodos':
            runner.getTodos();
            return;
        case 'addTodo':
            runner.addTodo(args[0] as string);
            return;
        case 'toggleTodo':
            runner.toggleTodo(args[0] as string);
            return;
        case 'deleteTodo':
            runner.deleteTodo(args[0] as string);
            return;
    }
}

function callGas(method: GasMethod, ...args: unknown[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (!isGasAvailable()) {
            reject(new Error('GAS runtime not available'));
            return;
        }

        const runner = (window as Window & typeof globalThis).google.script.run;
        const configuredRunner = runner
            .withSuccessHandler((response: string) => resolve(response))
            .withFailureHandler((error: Error) => reject(error));
        invokeGasMethod(configuredRunner, method, args);
    });
}

function parseJson<T>(raw: string, guard: (value: unknown) => value is T, errorMessage: string): T {
    const parsed: unknown = JSON.parse(raw);
    if (!guard(parsed)) {
        throw new Error(errorMessage);
    }
    return parsed;
}

export async function getTodos(): Promise<Todo[]> {
    if (!isGasAvailable()) {
        return [{ id: '1', title: 'Start using the ToDo app', completed: false, createdAt: Date.now() }];
    }
    return parseJson(await callGas('getTodos'), isTodoArray, 'Unexpected response format for getTodos');
}

export async function addTodo(title: string): Promise<Todo> {
    const trimmed = title.trim();
    if (trimmed.length === 0) throw new Error('タイトルを入力してください。');
    if (trimmed.length > MAX_TODO_TITLE_LENGTH) {
        throw new Error(`タイトルは${MAX_TODO_TITLE_LENGTH}文字以内で入力してください。`);
    }

    if (!isGasAvailable()) {
        return { id: Math.random().toString(), title: trimmed, completed: false, createdAt: Date.now() };
    }
    return parseJson(await callGas('addTodo', trimmed), isTodo, 'Unexpected response format for addTodo');
}

export async function toggleTodo(id: string): Promise<Todo | null> {
    if (!isGasAvailable()) return null;
    return parseJson(await callGas('toggleTodo', id), isToggleTodoResponse, 'Unexpected response format for toggleTodo').todo;
}

export async function deleteTodo(id: string): Promise<boolean> {
    if (!isGasAvailable()) return true;
    return parseJson(await callGas('deleteTodo', id), isDeleteTodoResponse, 'Unexpected response format for deleteTodo').success;
}
