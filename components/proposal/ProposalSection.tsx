import React, { ReactNode } from 'react';

interface ProposalSectionProps {
  title: string;
  children: ReactNode;
}

const ProposalSection: React.FC<ProposalSectionProps> = ({ title, children }) => {
  return (
    <section>
      <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4">{title}</h2>
      {children}
    </section>
  );
};

export default ProposalSection;