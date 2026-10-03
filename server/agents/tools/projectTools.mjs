export async function getProjectContext({ workspaceId, projectId, deps = {} }) {
  if (typeof deps.getProjectContext === "function") {
    return deps.getProjectContext({ workspaceId, projectId });
  }

  return {
    workspaceId: workspaceId || null,
    projectId: projectId || null,
    customerName: null,
    roomType: null,
    existingProjectData: {},
    sourceDocuments: [],
  };
}

export async function listMissingDiscoveryFields({ userInput, deps = {} }) {
  if (typeof deps.listMissingDiscoveryFields === "function") {
    return deps.listMissingDiscoveryFields({ userInput });
  }

  const text = String(userInput || "").toLowerCase();
  const missing = [];
  if (!text.includes("source")) missing.push("source count");
  if (!text.includes("display") && !text.includes("screen")) missing.push("display count");
  if (!/\d+\s*m/.test(text)) missing.push("maximum cable distance");
  if (!text.includes("usb")) missing.push("USB requirement");
  if (!text.includes("control")) missing.push("control requirement");
  return missing;
}
