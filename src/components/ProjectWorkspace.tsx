import * as React from "react";
import { useProjectContext } from "@/context";

export default function ProjectWorkspace() {
  const { projectData, activeRoomId } = useProjectContext();

  const room = React.useMemo(() => {
    const rooms = (projectData as any)?.rooms ?? [];
    return rooms.find((r: any) => r.id === activeRoomId) ?? null;
  }, [projectData, activeRoomId]);

  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Project Workspace</div>
          <div className="wm-page-sub">Room workspace and tools.</div>
        </div>
      </div>

      <div className="wm-page-body">
        <div className="wm-card">
          {room ? (
            <div className="wm-muted">Active room: {(room as any).name ?? (room as any).id}</div>
          ) : (
            <div className="wm-muted">No active room selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

