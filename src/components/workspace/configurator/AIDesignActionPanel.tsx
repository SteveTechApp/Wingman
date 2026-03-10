import * as React from "react";
import { useGenerationContext } from "../../../context/GenerationContext";
import { useProjectContext } from "@/context";
import { updateProject } from "@/features/projects/projectStore";
import { SparklesIcon } from "../../Icons";

type DesignTier = "Bronze" | "Silver" | "Gold";

const AIDesignActionPanel: React.FC = () => {
  const { handleDesignRoom } = useGenerationContext();
  const { projectData, activeRoomId, dispatchProjectAction } = useProjectContext();

  const activeProject = projectData?.activeProject;
  const legacyRooms = Array.isArray(projectData?.rooms) ? projectData.rooms : [];
  const room = legacyRooms.find((candidate: any) => candidate.id === activeRoomId);

  const hasEquipment = room
    ? Array.isArray(room.manuallyAddedEquipment) && room.manuallyAddedEquipment.length > 0
    : Array.isArray(activeProject?.catalog?.skus) && activeProject.catalog.skus.length > 0;

  const currentTier: DesignTier = (room?.designTier || activeProject?.proposal?.selectedTier || activeProject?.template?.tier || "Silver") as DesignTier;
  const canUpgrade = currentTier === "Bronze" || currentTier === "Silver";
  const canDowngrade = currentTier === "Silver" || currentTier === "Gold";

  const handleDesign = () => {
    void handleDesignRoom(activeRoomId || undefined);
  };

  const handleTierChange = async (newTier: DesignTier) => {
    if (room && activeRoomId) {
      dispatchProjectAction({
        type: "UPDATE_ROOM",
        payload: { ...room, designTier: newTier },
      });
    }

    if (activeProject?.id) {
      updateProject(activeProject.id, {
        proposal: {
          ...(activeProject.proposal ?? {}),
          selectedTier: newTier,
        },
      });
    }

    window.setTimeout(() => {
      void handleDesignRoom(activeRoomId || undefined);
    }, 100);
  };

  return (
    <div className="p-4 bg-accent-bg-subtle rounded-xl border-2 border-dashed border-accent-border-subtle">
      <button
        onClick={handleDesign}
        className="w-full btn btn-primary flex items-center justify-center gap-2 text-base animate-pulse-bright mb-3"
      >
        <SparklesIcon className="h-5 w-5" />
        {hasEquipment ? "Re-Design Room with AI" : "Design Room with AI"}
      </button>

      <div className="border-t border-accent-border-subtle pt-3 mt-3">
        <p className="text-xs text-text-secondary mb-2 text-center font-semibold">
          Current Tier: <span className="text-accent">{currentTier}</span>
        </p>

        <div className="grid grid-cols-2 gap-2">
          {canDowngrade ? (
            <button
              onClick={() => {
                const downgradeTo: DesignTier = currentTier === "Gold" ? "Silver" : "Bronze";
                void handleTierChange(downgradeTo);
              }}
              className="btn btn-secondary text-sm py-2"
            >
              Downgrade to {currentTier === "Gold" ? "Silver" : "Bronze"}
            </button>
          ) : null}

          {canUpgrade ? (
            <button
              onClick={() => {
                const upgradeTo: DesignTier = currentTier === "Bronze" ? "Silver" : "Gold";
                void handleTierChange(upgradeTo);
              }}
              className="btn btn-primary text-sm py-2"
            >
              Upgrade to {currentTier === "Bronze" ? "Silver" : "Gold"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-accent mt-2 text-center">
        {hasEquipment
          ? "AI will re-evaluate and update the design direction for the selected tier."
          : "AI will analyze requirements and generate a first-pass design direction."}
      </p>
    </div>
  );
};

export default AIDesignActionPanel;
