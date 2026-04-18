import { toJson } from './todoCodec';
import { TodoService } from './todoService';
import { isValidTitle, isValidId, MAX_TITLE_LENGTH } from './validation';

// Extend the global object to hold GAS entry points properly
declare global {
    var doGet: (e: GoogleAppsScript.Events.DoGet) => GoogleAppsScript.HTML.HtmlOutput;
    var getTodos: () => string;
    var addTodo: (title: string) => string;
    var toggleTodo: (id: string) => string;
    var deleteTodo: (id: string) => string;
}

global.doGet = (_e: GoogleAppsScript.Events.DoGet) => {
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('React ToDo App')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
};

const todoService = TodoService.createDefault();

function ensureValidTitle(title: string): string {
    if (!isValidTitle(title)) {
        throw new Error(`Invalid title: must be a non-empty string (max ${MAX_TITLE_LENGTH} characters).`);
    }
    return title.trim();
}

function ensureValidId(id: string): string {
    if (!isValidId(id)) {
        throw new Error('Invalid id: must be a valid UUID v4.');
    }
    return id;
}

global.getTodos = () => {
    return toJson(todoService.getTodos());
};

global.addTodo = (title: string) => {
    return toJson(todoService.addTodo(ensureValidTitle(title)));
};

global.toggleTodo = (id: string) => {
    return toJson({ todo: todoService.toggleTodo(ensureValidId(id)) });
};

global.deleteTodo = (id: string) => {
    return toJson({ success: todoService.deleteTodo(ensureValidId(id)) });
};
