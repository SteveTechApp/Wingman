import React from 'react';
import { DesignFeedbackItem } from '../utils/types';

interface FeedbackCategoryProps {
  title: string;
  items: DesignFeedbackItem[] | undefined;
  icon: React.ReactNode;
}

const FeedbackCategory: React.FC<FeedbackCategoryProps> = ({ title, items, icon }) => {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <ul className="space-y-2 pl-2 border-l-2 border-border-color ml-3">
        {items.map((item, index) => (
          <li key={index} className="p-3 bg-background rounded-md text-sm ml-4">
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FeedbackCategory;