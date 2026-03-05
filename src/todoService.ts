import { Todo } from './todoTypes';
import { TodoStore } from './todoStore';

export class TodoService {
    static getTodos(): Todo[] {
        return TodoStore.readTodos();
    }

    static addTodo(title: string): Todo {
        const todos = TodoStore.readTodos();
        const newTodo: Todo = {
            id: Utilities.getUuid(),
            title,
            completed: false,
            createdAt: Date.now(),
        };
        TodoStore.writeTodos([...todos, newTodo]);
        return newTodo;
    }

    static toggleTodo(id: string): Todo | null {
        const todos = TodoStore.readTodos();
        const index = todos.findIndex((t) => t.id === id);
        if (index === -1) return null;

        const updatedTodo = { ...todos[index], completed: !todos[index].completed };
        const updatedTodos = [...todos];
        updatedTodos[index] = updatedTodo;

        TodoStore.writeTodos(updatedTodos);
        return updatedTodo;
    }

    static deleteTodo(id: string): boolean {
        const todos = TodoStore.readTodos();
        const initialLength = todos.length;
        const newTodos = todos.filter((t) => t.id !== id);

        if (newTodos.length !== initialLength) {
            TodoStore.writeTodos(newTodos);
            return true;
        }
        return false;
    }
}
