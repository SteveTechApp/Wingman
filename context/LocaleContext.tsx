import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUserContext } from './UserContext';
import { LanguageCode } from '../utils/types';

// This is a placeholder for a more robust i18n solution like i18next.

interface LocaleContextType {
  language: LanguageCode;
  // Add t() function for translations later
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useUserContext();

  const value = useMemo(() => ({
    language: userProfile.language || 'en-GB',
  }), [userProfile.language]);
  
  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocaleContext = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
};