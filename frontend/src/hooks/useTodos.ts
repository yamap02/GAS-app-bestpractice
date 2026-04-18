import { startTransition, useEffect, useState } from 'react';
import * as gasApi from '../api/gasApi';
import { TODO_ERROR_MESSAGES } from '../constants/todo';
import type { Todo } from '../types/todo';

export function useTodos() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const clearError = () => setErrorMessage(null);

    const loadTodos = async () => {
        setIsLoading(true);
        clearError();
        try {
            const nextTodos = await gasApi.getTodos();
            startTransition(() => {
                setTodos(nextTodos);
            });
        } catch (error) {
            console.error('Failed to load todos:', error);
            setErrorMessage(TODO_ERROR_MESSAGES.load);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadTodos();
    }, []);

    const addTodo = async (rawTitle: string): Promise<boolean> => {
        const title = rawTitle.trim();
        if (!title) return false;

        clearError();
        try {
            const newTodo = await gasApi.addTodo(title);
            startTransition(() => {
                setTodos((prev) => [...prev, newTodo]);
            });
            return true;
        } catch (error) {
            console.error('Failed to add todo:', error);
            setErrorMessage(error instanceof Error ? error.message : TODO_ERROR_MESSAGES.addFallback);
            return false;
        }
    };

    const toggleTodo = async (id: string) => {
        let previousTodos: Todo[] = [];
        setTodos((prev) => {
            previousTodos = prev;
            return prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo));
        });
        clearError();

        try {
            const updatedTodo = await gasApi.toggleTodo(id);
            if (updatedTodo === null) {
                startTransition(() => {
                    setTodos(previousTodos);
                });
                setErrorMessage(TODO_ERROR_MESSAGES.missing);
            }
        } catch (error) {
            console.error('Failed to toggle todo:', error);
            startTransition(() => {
                setTodos(previousTodos);
            });
            setErrorMessage(TODO_ERROR_MESSAGES.update);
        }
    };

    const deleteTodo = async (id: string) => {
        let previousTodos: Todo[] = [];
        setTodos((prev) => {
            previousTodos = prev;
            return prev.filter((todo) => todo.id !== id);
        });
        clearError();

        try {
            const isDeleted = await gasApi.deleteTodo(id);
            if (!isDeleted) {
                startTransition(() => {
                    setTodos(previousTodos);
                });
                setErrorMessage(TODO_ERROR_MESSAGES.missing);
            }
        } catch (error) {
            console.error('Failed to delete todo:', error);
            startTransition(() => {
                setTodos(previousTodos);
            });
            setErrorMessage(TODO_ERROR_MESSAGES.delete);
        }
    };

    return {
        todos,
        isLoading,
        errorMessage,
        clearError,
        addTodo,
        toggleTodo,
        deleteTodo,
        completedCount: todos.filter((todo) => todo.completed).length,
    };
}
