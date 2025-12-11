import React from 'react';

interface ChatInputFormProps {
    input: string;
    setInput: (value: string) => void;
    handleSend: () => void;
    isLoading: boolean;
}

const ChatInputForm: React.FC<ChatInputFormProps> = ({
    input,
    setInput,
    handleSend,
    isLoading,
}) => {
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full p-3 rounded-lg bg-input-bg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 ring-offset-background focus:ring-accent shadow-sm border border-border-color"
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="btn btn-primary px-6 disabled:opacity-50"
                aria-label="Ask question"
            >
                ASK
            </button>
        </form>
    );
};

export default ChatInputForm;