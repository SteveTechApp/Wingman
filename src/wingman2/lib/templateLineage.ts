/** A project at least one stored template was saved from. */
export type TemplateSourceProject = {
  id: string;
  /** The project's current name, so a rename reads as the name the rep knows. */
  name: string;
  /** The stored templates that came from it, in library order. */
  templateIds: string[];
};

/**
 * The projects the templates library can filter by, and what each one produced.
 *
 * A template names its source project by id, and the name lives in the project
 * store, so a project the store no longer holds has no label to offer and is not
 * a filter value. Nothing is hidden by that: its templates still list under
 * their market, and under every source while no source is chosen.
 */
export function templateSourceProjects(
  templates: readonly { id: string; sourceProjectId?: string }[],
  projects: readonly { id: string; name: string }[],
): TemplateSourceProject[] {
  const byId = new Map<string, TemplateSourceProject>();

  for (const template of templates) {
    const id = (template.sourceProjectId ?? "").trim();
    if (!id) continue;
    const project = projects.find((candidate) => candidate.id === id);
    if (!project) continue;

    const entry = byId.get(id) ?? { id, name: project.name, templateIds: [] };
    // A project renamed since the template was saved reads as its current name.
    entry.name = project.name;
    entry.templateIds.push(template.id);
    byId.set(id, entry);
  }

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** The records a stored template names, once they are found. */
export type TemplateLineageRecord = {
  project?: { id: string; name: string };
  template?: { id: string; name: string };
};

/**
 * Where a stored template came from, limited to the records this browser still
 * holds.
 *
 * Both halves are optional and resolved independently: a template can name the
 * project it was saved from and the design it was copied from, and losing one
 * record does not hide the other. A template is never its own source, so a
 * self-reference reads as no lineage at all.
 */
export function templateLineageRecord(
  template: { id: string; sourceProjectId?: string; sourceTemplateId?: string },
  projects: readonly { id: string; name: string }[],
  templates: readonly { id: string; name: string }[],
): TemplateLineageRecord {
  const project = projects.find((candidate) => candidate.id === template.sourceProjectId);
  const source = templates.find(
    (candidate) => candidate.id === template.sourceTemplateId && candidate.id !== template.id,
  );

  return {
    ...(project ? { project: { id: project.id, name: project.name } } : {}),
    ...(source ? { template: { id: source.id, name: source.name } } : {}),
  };
}

/**
 * The stored templates a project produced, in library order.
 *
 * The reverse of the template's own lineage line: the project record asks
 * whether this room has been published as a starting point, and a room can have
 * been saved more than once. Nothing is rebuilt here — an id that no longer
 * exists simply stops being listed, because a link to a deleted template has
 * nowhere to go.
 */
export function templatesSavedFromProject(
  projectId: string,
  templates: readonly { id: string; name: string; sourceProjectId?: string }[],
): { id: string; name: string }[] {
  const id = (projectId ?? "").trim();
  if (!id) return [];
  return templates
    .filter((template) => template.sourceProjectId === id)
    .map((template) => ({ id: template.id, name: template.name }));
}

/** Whether a template is one the chosen source project produced. */
export function templateMatchesSourceProject(
  template: { id: string; sourceProjectId?: string },
  sourceProjectId: string | null,
): boolean {
  return !sourceProjectId || template.sourceProjectId === sourceProjectId;
}
