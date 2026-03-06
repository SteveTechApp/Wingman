import { useState } from "react"
import type { UserProfile } from "@/utils/types/user"
import { DEFAULT_USER_PROFILE } from "@/state/defaults"

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE)

  function updateUserProfile(patch: Partial<UserProfile>) {
    setProfile(prev => ({ ...prev, ...patch }))
  }

  return {
    profile,
    updateUserProfile,
    setProfile
  }
}