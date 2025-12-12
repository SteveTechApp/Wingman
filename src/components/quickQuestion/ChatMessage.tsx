import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../../utils/types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const { role, content } = message;
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-xl prose ${isUser ? 'bg-accent text-text-on-accent' : 'bg-background border border-border-color'}`}>
                <ReactMarkdown
                  components={{
                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline" />
                  }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default ChatMessage;