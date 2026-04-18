import { AppShell } from "../../wingman-v2/layout/AppShell";
import { DashboardPage as WingmanDashboardPage } from "../../wingman-v2/pages/DashboardPage";

export function DashboardPage() {
  return (
    <AppShell>
      <WingmanDashboardPage />
    </AppShell>
  );
}

export default DashboardPage;