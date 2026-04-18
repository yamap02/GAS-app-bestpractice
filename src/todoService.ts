import { TodoRepository } from './todoRepository';
import type { Todo } from './todoTypes';

type TodoServiceDependencies = {
    createId: () => string;
    getCurrentTime: () => number;
};

export class TodoService {
    static createDefault(): TodoService {
        return new TodoService(TodoRepository.createUserScoped(), {
            createId: () => Utilities.getUuid(),
            getCurrentTime: () => Date.now(),
        });
    }

    constructor(
        private readonly repository: Pick<TodoRepository, 'readTodos' | 'writeTodos'>,
        private readonly dependencies: TodoServiceDependencies,
    ) {}

    getTodos(): Todo[] {
        return this.repository.readTodos();
    }

    addTodo(title: string): Todo {
        const todos = this.repository.readTodos();
        const newTodo: Todo = {
            id: this.dependencies.createId(),
            title,
            completed: false,
            createdAt: this.dependencies.getCurrentTime(),
        };
        this.repository.writeTodos([...todos, newTodo]);
        return newTodo;
    }

    toggleTodo(id: string): Todo | null {
        const todos = this.repository.readTodos();
        const index = todos.findIndex((t) => t.id === id);
        if (index === -1) return null;

        const updatedTodo = { ...todos[index], completed: !todos[index].completed };
        const updatedTodos = [...todos];
        updatedTodos[index] = updatedTodo;

        this.repository.writeTodos(updatedTodos);
        return updatedTodo;
    }

    deleteTodo(id: string): boolean {
        const todos = this.repository.readTodos();
        const initialLength = todos.length;
        const newTodos = todos.filter((t) => t.id !== id);

        if (newTodos.length !== initialLength) {
            this.repository.writeTodos(newTodos);
            return true;
        }
        return false;
    }
}
