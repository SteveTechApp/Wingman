import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function TopBar() {
  const { isAuthed, user, signOut } = useAuth();

  return (
    <div className="wm-spread">
      <div className="wm-row">
        <Link className="wm-link" to={isAuthed ? "/app/dashboard" : "/"}>
          <span className="wm-chip">Wingman</span>
        </Link>
        <span className="wm-p">Commercial-grade workspace</span>
      </div>

      <div className="wm-row">
        {isAuthed ? (
          <>
            <span className="wm-p">{user?.email ?? "Signed in"}</span>
            <button className="wm-btn" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <Link className="wm-btn wm-btn-primary" to="/">Sign in</Link>
        )}
      </div>
    </div>
  );
}