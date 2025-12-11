import React from 'react';
import { UserProfile } from '../../utils/types';
import Logo from '../layout/Logo';

interface CertificateProps {
  userProfile: UserProfile;
}

const Certificate: React.FC<CertificateProps> = ({ userProfile }) => {
  const today = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background-secondary border-4 border-accent rounded-lg shadow-2xl text-center">
      <div className="mb-6">
        <Logo className="justify-center text-3xl" />
        <h2 className="text-xl font-semibold text-text-secondary mt-1">Training Academy</h2>
      </div>
      
      <p className="text-lg text-text-secondary mb-4">This certificate is proudly presented to</p>
      
      <h1 className="text-4xl font-bold text-accent mb-4">{userProfile.name}</h1>
      
      <p className="text-lg text-text-secondary mb-8">for successfully completing all modules of the WyreStorm Wingman AV Foundations training course.</p>
      
      <div className="flex justify-between items-center text-left">
        <div>
          <p className="text-sm font-bold border-t border-border-color pt-2">Date of Completion</p>
          <p className="text-text-secondary">{today}</p>
        </div>
        <div>
          <p className="text-sm font-bold border-t border-border-color pt-2">Issuing Authority</p>
          <p className="text-text-secondary">WyreStorm Technologies</p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;