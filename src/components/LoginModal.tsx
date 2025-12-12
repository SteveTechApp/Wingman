
import React, { useState } from 'react';
import InfoModal from './InfoModal';
import { useUserContext } from '../context/UserContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { userProfile, updateUserProfile, setIsAuthenticated } = useUserContext();
  const [formData, setFormData] = useState({
    name: userProfile.name !== 'AV Professional' ? userProfile.name : '',
    company: userProfile.company !== 'Your Company' ? userProfile.company : '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
        ...userProfile,
        name: formData.name,
        company: formData.company
    });
    setIsAuthenticated(true);
    onLoginSuccess();
    onClose();
  };

  const footer = (
    <button 
        type="submit" 
        form="login-form" 
        className="w-full btn btn-primary text-lg"
    >
        Log In & Save Project
    </button>
  );

  return (
    <InfoModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Save Your Progress" 
        className="max-w-md"
        footer={footer}
    >
      <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-accent-bg-subtle rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-text-secondary">Please log in to store your projects, templates, and settings securely.</p>
      </div>

      <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Full Name</label>
            <input 
                type="text" 
                required
                className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
        </div>
        <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Company</label>
            <input 
                type="text" 
                required
                className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
                placeholder="Acme Integrators"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
            />
        </div>
        <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary uppercase">Email Address</label>
            <input 
                type="email" 
                required
                className="w-full p-3 rounded-lg border border-border-color bg-input-bg focus:ring-2 focus:ring-accent outline-none"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
            />
        </div>
      </form>
    </InfoModal>
  );
};

export default LoginModal;
