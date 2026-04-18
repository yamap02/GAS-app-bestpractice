export const MAX_TODO_TITLE_LENGTH = 500;

export const TODO_ERROR_MESSAGES = {
    load: 'タスクの読み込みに失敗しました。ページを再読み込みしてください。',
    addFallback: 'タスクの追加に失敗しました。',
    update: 'タスクの更新に失敗しました。',
    delete: 'タスクの削除に失敗しました。',
    missing: '対象タスクが見つかりませんでした。最新状態を確認してください。',
} as const;
