import type { Todo } from '../types/todo';

export interface DeleteTodoResponse {
    success: boolean;
}

export interface ToggleTodoResponse {
    todo: Todo | null;
}
