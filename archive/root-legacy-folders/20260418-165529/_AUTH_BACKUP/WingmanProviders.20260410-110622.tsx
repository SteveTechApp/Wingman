import * as React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { ProjectProvider } from "@/context/ProjectContext";

export default function WingmanProviders(props: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <ProjectProvider>
          {props.children}
        </ProjectProvider>
      </UserProvider>
    </AuthProvider>
  );
}

