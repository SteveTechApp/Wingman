/**
 * useTeamMembers — Fetches workspace team members for the team projects view.
 * Caches the result in state and provides a lookup map by user ID.
 */
import { useEffect, useMemo, useState } from "react";
import { getWorkspaceTeam, type TeamMember } from "../api/wingmanApi";

type TeamMembersState = {
  members: TeamMember[];
  currentUserId: string | null;
  loading: boolean;
};

export function useTeamMembers(): TeamMembersState & {
  getMemberName: (ownerId: string | undefined) => string;
  getMemberInitials: (ownerId: string | undefined) => string;
} {
  const [state, setState] = useState<TeamMembersState>({
    members: [],
    currentUserId: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchTeam() {
      try {
        const response = await getWorkspaceTeam();
        if (cancelled) return;
        if (response.ok && response.team) {
          setState({
            members: response.team,
            currentUserId: response.currentUserId ?? null,
            loading: false,
          });
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchTeam();
    return () => { cancelled = true; };
  }, []);

  const memberById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const member of state.members) {
      map.set(member.id, member);
    }
    return map;
  }, [state.members]);

  const getMemberName = useMemo(() => {
    return (ownerId: string | undefined): string => {
      if (!ownerId) return "Unknown";
      return memberById.get(ownerId)?.name ?? "Unknown";
    };
  }, [memberById]);

  const getMemberInitials = useMemo(() => {
    return (ownerId: string | undefined): string => {
      const name = getMemberName(ownerId);
      return name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };
  }, [getMemberName]);

  return { ...state, getMemberName, getMemberInitials };
}
