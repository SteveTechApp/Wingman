import * as React from "react";

const WM_ADMIN_GATE_KEY = "wm:product-intelligence:admin";
const WM_ADMIN_GATE_PASSWORD = "W1ngm4n!";

type Props = {
  children: React.ReactNode;
};

export default function ProductIntelligenceAdminGate({ children }: Props) {
  const [unlocked, setUnlocked] = React.useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(WM_ADMIN_GATE_KEY) === "ok";
    } catch {
      return false;
    }
  });

  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === WM_ADMIN_GATE_PASSWORD) {
      try {
        window.sessionStorage.setItem(WM_ADMIN_GATE_KEY, "ok");
      } catch {
      }
      setUnlocked(true);
      setPassword("");
      setError("");
      return;
    }

    setError("Incorrect admin password.");
  };

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="wm-admin-gate">
      <div className="wm-admin-gate__backdrop" />
      <div className="wm-admin-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="wm-admin-gate-title">
        <div className="wm-admin-gate__lock" aria-hidden="true">LOCK</div>
        <div id="wm-admin-gate-title" className="wm-admin-gate__title">
          ADMIN PERMISSION REQUIRED
        </div>
        <div className="wm-admin-gate__copy">
          This page is restricted to authorised Wingman administrators.
        </div>

        <form className="wm-admin-gate__form" onSubmit={onSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            className="wm-admin-gate__input"
            placeholder="Enter admin password"
            autoFocus
          />
          {error ? <div className="wm-admin-gate__error">{error}</div> : null}
          <button type="submit" className="wm-btn wm-admin-gate__button">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}