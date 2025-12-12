import React from 'react';

const TypingIndicator: React.FC = () => {
    return (
        <div className="flex justify-start">
            <div className="p-4 rounded-lg bg-background border border-border-color w-full max-w-sm animate-pulse">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-secondary">Thinking...</span>
                    <div className="w-full bg-border-color rounded-full h-2 overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-accent to-transparent animate-thinking-progress"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypingIndicator;