interface ErrorBannerProps {
    message: string;
    onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
    return (
        <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="エラーを閉じる"
                className="shrink-0 text-red-500 hover:text-red-700"
            >
                ✕
            </button>
        </div>
    );
}
