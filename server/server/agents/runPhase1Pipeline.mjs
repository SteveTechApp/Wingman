import { runDiscoveryAgent } from "./discoveryAgent.mjs";
import { runArchitectAgent } from "./architectAgent.mjs";
import { runValidationAgent } from "./validationAgent.mjs";

export async function runPhase1Pipeline(input, deps = {}) {
  const discovery = await runDiscoveryAgent(input, deps);

  const architecture = await runArchitectAgent(
    {
      workspaceId: input?.workspaceId || null,
      projectId: input?.projectId || null,
      brief: discovery,
      options: input?.options || {},
    },
    deps
  );

  const validation = await runValidationAgent(
    {
      workspaceId: input?.workspaceId || null,
      projectId: input?.projectId || null,
      brief: discovery,
      architecture,
    },
    deps
  );

  return {
    ok: true,
    phase: "phase1",
    discovery,
    architecture,
    validation,
    status: validation?.status || "fail",
  };
}
