import { useCallback, useEffect, useMemo, useState } from 'react';
import * as gasApi from '../api/gasApi';
import { TODO_ERROR_MESSAGES } from '../constants/todo';
import type { Todo } from '../types/todo';

export function useTodos() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const clearError = useCallback(() => setErrorMessage(null), []);

    const loadTodos = useCallback(async () => {
        setIsLoading(true);
        clearError();
        try {
            setTodos(await gasApi.getTodos());
        } catch (error) {
            console.error('Failed to load todos:', error);
            setErrorMessage(TODO_ERROR_MESSAGES.load);
        } finally {
            setIsLoading(false);
        }
    }, [clearError]);

    useEffect(() => {
        void loadTodos();
    }, [loadTodos]);

    const addTodo = useCallback(
        async (rawTitle: string): Promise<boolean> => {
            const title = rawTitle.trim();
            if (!title) return false;

            clearError();
            try {
                const newTodo = await gasApi.addTodo(title);
                setTodos((prev) => [...prev, newTodo]);
                return true;
            } catch (error) {
                console.error('Failed to add todo:', error);
                setErrorMessage(error instanceof Error ? error.message : TODO_ERROR_MESSAGES.addFallback);
                return false;
            }
        },
        [clearError],
    );

    const toggleTodo = useCallback(
        async (id: string) => {
            setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
            clearError();

            try {
                await gasApi.toggleTodo(id);
            } catch (error) {
                console.error('Failed to toggle todo:', error);
                setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
                setErrorMessage(TODO_ERROR_MESSAGES.update);
            }
        },
        [clearError],
    );

    const deleteTodo = useCallback(
        async (id: string) => {
            let previousTodos: Todo[] = [];
            setTodos((prev) => {
                previousTodos = prev;
                return prev.filter((todo) => todo.id !== id);
            });
            clearError();

            try {
                await gasApi.deleteTodo(id);
            } catch (error) {
                console.error('Failed to delete todo:', error);
                setTodos(previousTodos);
                setErrorMessage(TODO_ERROR_MESSAGES.delete);
            }
        },
        [clearError],
    );

    const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos]);

    return {
        todos,
        isLoading,
        errorMessage,
        clearError,
        addTodo,
        toggleTodo,
        deleteTodo,
        completedCount,
    };
}
