import * as React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { ProjectProvider } from "@/context/ProjectContext";
import { GenerationProvider } from "@/context/GenerationContext";

export default function WingmanProviders(props: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <ProjectProvider>
          <GenerationProvider>{props.children}</GenerationProvider>
        </ProjectProvider>
      </UserProvider>
    </AuthProvider>
  );
}