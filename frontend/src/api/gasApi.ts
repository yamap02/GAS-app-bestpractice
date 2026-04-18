import type { Todo } from '../types/todo';
import { MAX_TODO_TITLE_LENGTH } from '../constants/todo';
import {
    assertSafeTodoId,
    createMockTodo,
    parseDeleteTodoPayload,
    parseTodoListPayload,
    parseTodoPayload,
    parseToggleTodoPayload,
} from './gasSecurity';

type GasMethod = 'getTodos' | 'addTodo' | 'toggleTodo' | 'deleteTodo';
type GasRunnerApi = Window['google']['script']['run'];

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

function parseJson<T>(raw: string, parser: (value: unknown, errorContext: string) => T, errorContext: string): T {
    return parser(JSON.parse(raw) as unknown, errorContext);
}

export async function getTodos(): Promise<Todo[]> {
    if (!isGasAvailable()) {
        return [createMockTodo({ title: 'Start using the ToDo app', createdAt: Date.now() })];
    }
    return parseJson(await callGas('getTodos'), parseTodoListPayload, 'getTodos');
}

export async function addTodo(title: string): Promise<Todo> {
    const trimmed = title.trim();
    if (trimmed.length === 0) throw new Error('タイトルを入力してください。');
    if (trimmed.length > MAX_TODO_TITLE_LENGTH) {
        throw new Error(`タイトルは${MAX_TODO_TITLE_LENGTH}文字以内で入力してください。`);
    }

    if (!isGasAvailable()) {
        return createMockTodo({ title: trimmed, createdAt: Date.now() });
    }
    return parseJson(await callGas('addTodo', trimmed), parseTodoPayload, 'addTodo');
}

export async function toggleTodo(id: string): Promise<Todo | null> {
    const safeId = assertSafeTodoId(id);
    if (!isGasAvailable()) return null;
    return parseJson(await callGas('toggleTodo', safeId), parseToggleTodoPayload, 'toggleTodo').todo;
}

export async function deleteTodo(id: string): Promise<boolean> {
    const safeId = assertSafeTodoId(id);
    if (!isGasAvailable()) return true;
    return parseJson(await callGas('deleteTodo', safeId), parseDeleteTodoPayload, 'deleteTodo').success;
}
