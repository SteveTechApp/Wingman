import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import SideNav from "@/app/navigation/SideNav";
import AppFooter from "@/components/layout/AppFooter";
import GuruFab from "@/guru/GuruFab";

export default function AppShell(){
  return (
    <div className="wm-app-root">
      <TopBar/>
      <div style={{display:"grid",gridTemplateColumns:"230px 1fr"}}>
        <SideNav/>
        <main className="wm-container wm-page">
          <Outlet/>
          <AppFooter/>
        </main>
      </div>
      <GuruFab />
    </div>
  );
}