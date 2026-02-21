import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const QuickQuestionFAB: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/ask') || pathname.startsWith('/app/tools/ask')) return null;

  return (
    <Link
      to="/ask"
      className="fixed bottom-8 right-8 btn-accent rounded-full p-4 shadow-2xl z-40 transition-transform duration-200 hover:scale-110"
      aria-label="Ask a quick question"
      title="Ask Guru"
    >
      ?
    </Link>
  );
};

export default QuickQuestionFAB;
