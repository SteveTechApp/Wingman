import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface EditableSectionProps {
  initialContent: string;
  onSave: (newContent: string) => void;
}

const EditableSection: React.FC<EditableSectionProps> = ({ initialContent, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);

  const handleSave = () => {
    onSave(content);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="prose max-w-none">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-48 p-2 border rounded-md font-sans text-base text-black bg-gray-50"
        />
        <div className="mt-2 flex gap-2">
          <button onClick={handleSave} className="bg-cyan-500 text-white font-bold py-1 px-3 rounded text-sm">Save</button>
          <button onClick={handleCancel} className="bg-gray-200 text-gray-800 font-bold py-1 px-3 rounded text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="prose max-w-none relative group" onClick={() => setIsEditing(true)}>
      <ReactMarkdown>{content}</ReactMarkdown>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-xs bg-gray-200 text-gray-800 p-1 rounded">Edit</button>
      </div>
    </div>
  );
};

export default EditableSection;