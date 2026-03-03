import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import Footer from "@/app/components/Footer";

export default function PublicShell() {
  
  
  /* __WM_PUBLICSHELL_HIDE_TOPBAR_NO__V1__ */
  const showTopBar = (typeof window !== "undefined" ? window.location.pathname : "") !== "/";

return (
    <div className="wm-shell">
      {showTopBar ? <TopBar /> : null}
      <main className="wm-main wm-main-public">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}




