import * as React from "react";

import { useProjectContext } from "@/context";
import { PlusIcon } from "../Icons";

interface AssignedInputsProps {
  outputId: string;
}

const AssignedInputs: React.FC<AssignedInputsProps> = ({ outputId }) => {
  const { projectData, activeRoomId } = useProjectContext();
  const room = projectData?.rooms.find((r) => r.id === activeRoomId);

  // Placeholder logic (currently shows first input only)
  const assignedInputs = room?.ioRequirements
    ?.filter((io) => io.type === "input")
    ?.slice(0, 1);

  const handleAddClick = () => {
    // This feature needs a real picker + state update wiring.
    // For now, make the button visibly "do something" and avoid dead UI.
    console.info("AssignedInputs: add input clicked for output:", outputId);
    alert("Input assignment UI is not implemented yet.");
  };

  return (
    <div>
      <h5 className="text-xs font-bold mb-1">Assigned Inputs</h5>

      <div className="flex flex-wrap gap-1">
        {assignedInputs?.map((input) => (
          <div
            key={input.id}
            className="bg-background-secondary text-xs font-medium rounded-full py-0.5 px-2"
          >
            {input.name}
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center w-5 h-5 bg-background-secondary rounded-full hover:bg-border-color"
          aria-label="Assign an input"
          title="Assign an input"
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default AssignedInputs;