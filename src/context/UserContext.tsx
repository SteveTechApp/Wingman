
import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';

export type UserContextType = ReturnType<typeof useUserProfile> & {
    isAuthenticated: boolean;
    setIsAuthenticated: (value: boolean) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile, updateUserProfile, isProfileModalOpen, openProfileModal, closeProfileModal } = useUserProfile();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Memoize the value to ensure stable object reference
  const value = useMemo(() => ({
      userProfile,
      updateUserProfile,
      isProfileModalOpen,
      openProfileModal,
      closeProfileModal,
      isAuthenticated,
      setIsAuthenticated
  }), [
      // Destructure userProfile properties if needed for granular control, 
      // but here we want to update on any profile change.
      userProfile, 
      updateUserProfile, 
      isProfileModalOpen, 
      openProfileModal, 
      closeProfileModal, 
      isAuthenticated
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};