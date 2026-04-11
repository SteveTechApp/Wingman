import * as React from "react";
import type { UserProfile } from "@/utils/types/user";
import { createStrictContext } from "./createStrictContext";
import { useWingman, wingmanActions } from "@/state/useWingman";
import { useAuth } from "./AuthContext";

export type UserContextType = {
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;

  userProfile: UserProfile;
  updateUserProfile: (patch: Partial<UserProfile>) => void;

  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
};

const [UserContext, useUserContext] = createStrictContext<UserContextType>("User");

export { useUserContext };

export function UserProvider(props: { children: React.ReactNode }) {
  const isAuthenticated = useWingman((s) => s.auth.isAuthed);
  const userProfile = useWingman((s) => s.user.profile);
  const auth = useAuth();

  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  const setIsAuthenticated = React.useCallback((v: boolean) => {
    if (!v) {
      void auth.signOut();
    }
  }, [auth]);

  const updateUserProfile = React.useCallback((patch: Partial<UserProfile>) => {
    wingmanActions.updateUserProfile(patch);
  }, []);

  const openProfileModal = React.useCallback(() => setIsProfileModalOpen(true), []);
  const closeProfileModal = React.useCallback(() => setIsProfileModalOpen(false), []);

  const value = React.useMemo<UserContextType>(() => ({
    isAuthenticated,
    setIsAuthenticated,
    userProfile,
    updateUserProfile,
    isProfileModalOpen,
    openProfileModal,
    closeProfileModal,
  }), [isAuthenticated, setIsAuthenticated, userProfile, updateUserProfile, isProfileModalOpen, openProfileModal, closeProfileModal]);

  return <UserContext.Provider value={value}>{props.children}</UserContext.Provider>;
}

