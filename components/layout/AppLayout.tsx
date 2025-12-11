import React, { useState } from 'react';
import { useUserContext } from '../../context/UserContext';

import Header from './Header';
import Footer from './Footer';
import ComparisonTray from '../ComparisonTray';
import ProfileModal from '../ProfileModal';

import FeedbackModal from '../FeedbackModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isProfileModalOpen, closeProfileModal, userProfile } = useUserContext();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const showBg = userProfile.showBackground;

  return (
    <div 
        className="text-text-primary flex flex-col bg-app-bg shadow-2xl relative isolate overflow-hidden w-screen h-screen"
    >
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
      
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full w-full bg-content-overlay/95 backdrop-blur-sm">
        <Header />
        <main className="flex-grow flex flex-col relative overflow-hidden min-h-0">
          {/* Children must handle their own scrolling (e.g., h-full w-full overflow-y-auto) */}
          {children}
        </main>
        <Footer onFeedbackClick={() => setIsFeedbackModalOpen(true)} />
      </div>

      {/* Floating UI Layer is outside the content layer to not be affected by its background */}
      <ComparisonTray />
      <ProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} />
    </div>
  );
};

export default AppLayout;