import * as React from "react";
import { AuthProvider } from "@/context";
import { UserProvider } from "@/context";
import { ProjectProvider } from "@/context";
import { GenerationProvider } from "@/context";

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