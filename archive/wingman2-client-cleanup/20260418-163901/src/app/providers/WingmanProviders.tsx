import { type ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { ProjectProvider } from "@/context/ProjectContext";

type WingmanProvidersProps = {
  children: ReactNode;
};

export default function WingmanProviders({ children }: WingmanProvidersProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <ProjectProvider>
            {children}
        </ProjectProvider>
      </UserProvider>
    </AuthProvider>
  );
}