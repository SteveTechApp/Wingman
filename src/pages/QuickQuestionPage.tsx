import React, { useState, useEffect, useRef } from 'react';
import { useUserContext } from '../context/UserContext';
import { createChatSession } from '../services/assistantService';
import type { Chat } from '@google/genai';
import { Message } from '../utils/types';
import ChatMessage from '../components/quickQuestion/ChatMessage';
import TypingIndicator from '../components/quickQuestion/TypingIndicator';
import ChatInputForm from '../components/quickQuestion/ChatInputForm';
import PresetQuestions from '../components/quickQuestion/PresetQuestions';

const QuickQuestionPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile } = useUserContext();

  const chatRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createChatSession(userProfile);
    setMessages([
      { role: 'model', content: "Hello! As your WyreStorm AI assistant, how can I help you with our products or AV technology today?" }
    ]);
  }, [userProfile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        throw new Error("Chat session not initialized.");
      }
      const response = await chatRef.current.sendMessage({ message: textToSend });
      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setMessages(prev => [...prev, { role: 'model', content: `Sorry, I encountered an error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden p-4 md:p-6">
      <div className="max-w-4xl mx-auto animate-fade-in-fast flex flex-col h-full">
        <div className="text-center mb-6 flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">Wingman AI Chat</h1>
          <p className="text-lg text-text-secondary">Ask technical questions or get product recommendations.</p>
        </div>

        {/* Main Container with Current Process Header */}
        <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-xl flex-grow flex flex-col overflow-hidden">
          {/* Current Process Header */}
          <div className="bg-accent text-white px-4 py-3 flex-shrink-0">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              Current Process: AI Assistant
            </h2>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-grow overflow-y-auto space-y-4 p-4 custom-scrollbar">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Input Section */}
          <div className="p-4 border-t border-border-color flex-shrink-0 bg-background">
            {/* Input Container with Label */}
            <div className="border border-border-color rounded-lg p-3 bg-input-bg mb-3">
              <label htmlFor="chat-input" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                Your Question
              </label>
              <ChatInputForm
                input={input}
                setInput={setInput}
                handleSend={() => handleSend()}
                isLoading={isLoading}
              />
            </div>
            <PresetQuestions handleSend={handleSend} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickQuestionPage;