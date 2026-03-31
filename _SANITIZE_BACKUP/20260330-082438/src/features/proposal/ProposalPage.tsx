import { useProjectContext } from "@/context/ProjectContext";
import { WingmanUxShell } from "@/features/wingmanUx/WingmanUxShell";

export default function ProposalPage() {
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;

  if (!project) {
    return (
      <div className="wmx-loading-card">
        <div className="wmx-loading-title">No active project</div>
        <div className="wmx-loading-copy">
          Select or create a project before opening proposal output.
        </div>
      </div>
    );
  }

  const projectState = {
    projectName: project.name ?? "New Wingman Project",
    customer: project.customer ?? "",
    roomType: project.roomType ?? "",
    application: project.application ?? "",

    sourceCount:
      Number(
        project.discovery?.sources ??
          project.discovery?.sourceCount ??
          0,
      ) || 0,

    displayCount:
      Number(
        project.discovery?.displays ??
          project.discovery?.displayCount ??
          0,
      ) || 0,

    distanceM:
      Number(
        project.discovery?.distance ??
          project.discovery?.distanceM ??
          project.distanceM ??
          0,
      ) || 0,

    resolution: project.discovery?.resolution ?? project.resolution ?? "",
    notes: project.discovery?.notes ?? project.notes ?? "",

    avGuide: {
      usb:
        project.avGuide?.usb ||
        (project.discovery?.usbRequired
          ? "USB / BYOD required"
          : "No USB requirement"),
      audio: project.avGuide?.audio ?? "",
      control:
        project.avGuide?.control ||
        (project.discovery?.networkReady
          ? "Network-routed control likely required"
          : ""),
    },

    videoWall: {
      wallType:
        project.videoWall?.wallType ||
        (project.discovery?.videoWall ? "Video Wall" : ""),
    },
  };

  return <WingmanUxShell projectState={projectState} />;
}