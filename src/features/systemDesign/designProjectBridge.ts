import { getActiveProjectContext, updateActiveProjectBrief, updateProjectStatus } from "@/features/projects/projectDraftStore";
import type { TemplateSeed, VideoWallSeed } from "./designTypes";
import { readDesignBundle, summariseDesignBundle, writeDesignBundle } from "./designBundleStore";
import { buildDesignBundle } from "./cableScheduleEngine";
import { readDesignSeeds } from "./designSeed";

export function saveTemplateSeedToProject(seed: TemplateSeed) {
  const ctx = getActiveProjectContext();
  if (!ctx) return false;

  updateActiveProjectBrief({
    designInputs: {
      ...(ctx.brief as any).designInputs,
      template: seed,
    },
  } as any);

  updateProjectStatus(ctx.projectId, "In Progress");
  return true;
}

export function saveVideoWallSeedToProject(seed: VideoWallSeed) {
  const ctx = getActiveProjectContext();
  if (!ctx) return false;

  updateActiveProjectBrief({
    designInputs: {
      ...(ctx.brief as any).designInputs,
      videoWall: seed,
    },
  } as any);

  updateProjectStatus(ctx.projectId, "In Progress");
  return true;
}

export function saveCurrentDesignBundleToProject() {
  const ctx = getActiveProjectContext();
  if (!ctx) return false;

  const seeds = readDesignSeeds();
  const bundle = buildDesignBundle(seeds.discovery, seeds.template, seeds.videoWall);
  writeDesignBundle(bundle);

  const summary = summariseDesignBundle(bundle);

  updateActiveProjectBrief({
    designInputs: {
      ...(ctx.brief as any).designInputs,
      template: bundle.template,
      videoWall: bundle.videoWall,
    },
    designBundle: bundle,
    proposal: {
      ...((ctx.brief as any).proposal ?? {}),
      designSummary: summary.proposalSummary,
      cableScheduleSummary: summary.cableSummary,
      diagramSummary: summary.diagramSummary,
    },
  } as any);

  updateProjectStatus(ctx.projectId, "In Progress");
  return true;
}

export function readProjectAwareDesignSummary() {
  const stored = readDesignBundle();
  if (stored) return summariseDesignBundle(stored);

  const seeds = readDesignSeeds();
  const bundle = buildDesignBundle(seeds.discovery, seeds.template, seeds.videoWall);
  return summariseDesignBundle(bundle);
}