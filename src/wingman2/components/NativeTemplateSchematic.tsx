import { useMemo } from "react";
import type { RoomTemplate, TemplateBomRow } from "../lib/roomTemplates";
import { templateBomToSchematicBrief } from "../lib/schematic/templateBomToSchematicBrief";
import { buildWingmanSchematic } from "../lib/schematic/wingmanSchematicEngine";
import { TechnicalSchematic } from "./TechnicalSchematic";

export function NativeTemplateSchematic({ template, rows }: { template: RoomTemplate; rows: TemplateBomRow[] }) {
  const model = useMemo(() => buildWingmanSchematic(templateBomToSchematicBrief(template, rows)), [template, rows]);
  return <TechnicalSchematic model={model} />;
}
