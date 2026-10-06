import type { StoredProject } from "../../data/projectStore";
import type { DiscoverySnapshot } from "../../data/workflowHandoff";
import { canonicalDiscoveryQuestions } from "./discoveryQuestions";
import type { DiscoveryAnswers, DiscoveryNotes } from "./discoveryTypes";

export function discoverySnapshotFromProject(project: StoredProject): DiscoverySnapshot {
  const brief = project.discoveryBrief ?? {};
  const answers: DiscoveryAnswers = {};
  const notes: DiscoveryNotes = {};
  const confirmed: Record<string, boolean> = {};
  for (const row of brief.discoveryConversation ?? []) {
    const question = canonicalDiscoveryQuestions.find((item) => item.id === row.stepId);
    const exact = question?.options.find((option) => option.label === row.answer || option.value === row.answer);
    const matches = exact ? [exact] : question?.options.filter((option) => row.answer.split(", ").includes(option.label)) ?? [];
    if (matches.length) answers[row.stepId] = question?.selectionMode === "multiple" ? matches.map((option) => option.value) : matches[0].value;
    // Keep wording that cannot be mapped to a listed choice for review in Discovery.
    notes[row.stepId] = [matches.length ? "" : row.answer, row.note].filter(Boolean).join("\n");
    confirmed[row.stepId] = row.confirmed === true && matches.length > 0;
  }
  const room = brief.roomModel ?? {};
  return { projectId: project.id, projectName: project.name, activeStepIndex: 0, brief, savedAt: project.updatedAt ?? "", state: { answers, notes, confirmed, clientName: room.clientName ?? project.owner, contactName: room.contactName ?? "", siteName: room.siteName ?? "", topology: brief.topology ?? room.topology } };
}
