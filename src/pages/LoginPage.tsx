import { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { routeMap, normalizeAppRoute } from "@/core/wingman/routeMap";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = normalizeAppRoute(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
      routeMap.app.dashboard,
  );

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    navigate(redirectTo, { replace: true });
  }

  return (
    <form onSubmit={handleLogin}>
      <h1>Login</h1>
      <button type="submit">Sign in</button>
    </form>
  );
}