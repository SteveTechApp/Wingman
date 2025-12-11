import React from 'react';
import { Link } from 'react-router-dom';

const QuickQuestionFAB: React.FC = () => {
  return (
    <Link
      to="/ask"
      className="fixed bottom-8 right-8 btn-accent rounded-full p-6 shadow-2xl z-40 transition-transform duration-200 hover:scale-110 animate-pulse-bright"
      aria-label="Ask a quick question"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-on-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </Link>
  );
};

export default QuickQuestionFAB;