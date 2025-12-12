import { useState, useCallback } from 'react';
import { UserProfile } from '../utils/types';
import { useLocalStorage } from './useLocalStorage';

const defaultUserProfile: UserProfile = {
  name: 'AV Professional',
  company: 'Your Company',
  logoUrl: '',
  language: 'en-GB',
  unitSystem: 'metric',
  showBackground: true,
  zoomLevel: 100,
};

export const useUserProfile = () => {
  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('userProfile', defaultUserProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const updateUserProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
  }, [setUserProfile]);

  const openProfileModal = useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);


  return { userProfile, updateUserProfile, isProfileModalOpen, openProfileModal, closeProfileModal };
};