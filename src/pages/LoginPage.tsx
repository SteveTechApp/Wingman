import * as React from "react";

import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md p-6 pt-10">
        <LoginForm subtitle="Sign into your workspace or continue in demo mode while deployment services are unavailable." />
      </div>
    </div>
  );
}
