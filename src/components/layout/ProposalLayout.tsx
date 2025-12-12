import React from 'react';

interface ProposalLayoutProps {
  children: React.ReactNode;
}

const ProposalLayout: React.FC<ProposalLayoutProps> = ({ children }) => {
  return (
    <div className="w-full min-h-screen bg-slate-200 p-4 sm:p-8 print:bg-white print:p-0 flex justify-center">
      {children}
    </div>
  );
};

export default ProposalLayout;
