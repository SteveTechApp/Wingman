import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUturnLeftIcon } from '../components/Icons';

const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-20 flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <h2 className="text-2xl font-bold mt-2">Page Not Found</h2>
      <p className="text-text-secondary mt-2">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 max-w-xs"
      >
        <ArrowUturnLeftIcon className="h-5 w-5" />
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;