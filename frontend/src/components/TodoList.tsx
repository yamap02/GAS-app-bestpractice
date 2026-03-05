import { useState } from 'react';
import { MAX_TODO_TITLE_LENGTH } from '../constants/todo';
import { useTodos } from '../hooks/useTodos';
import { ErrorBanner } from './ErrorBanner';
import { TodoItem } from './TodoItem';

export function TodoList() {
    const [inputValue, setInputValue] = useState('');
    const { todos, isLoading, errorMessage, clearError, addTodo, toggleTodo, deleteTodo, completedCount } = useTodos();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = inputValue.trim();
        if (!title) return;

        setInputValue(''); // Optimistic clear
        const didAdd = await addTodo(title);
        if (!didAdd) {
            setInputValue(title); // Revert on error
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">My Tasks</h1>

            {errorMessage && <ErrorBanner message={errorMessage} onDismiss={clearError} />}

            <form onSubmit={handleAdd} className="mb-6 flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="What needs to be done?"
                    maxLength={MAX_TODO_TITLE_LENGTH}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Add
                </button>
            </form>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : todos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No tasks yet. Add one above!</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {todos.map((todo) => (
                            <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                        ))}
                    </ul>
                )}
            </div>

            {!isLoading && todos.length > 0 && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                    {completedCount} of {todos.length} tasks completed
                </div>
            )}
        </div>
    );
}
