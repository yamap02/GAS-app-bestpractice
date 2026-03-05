import { TodoList } from './components/TodoList';

function App() {
    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="w-full flex justify-center mb-8">
                <h1 className="text-2xl font-bold text-gray-600">ToDo App created by Antigravity</h1>
            </div>
            <TodoList />
        </div>
    );
}

export default App;
