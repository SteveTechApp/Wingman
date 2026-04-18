import featureAuditManifest from "./feature-audit.json";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";

export type FeatureAuditStatus = "wired" | "partial";

type FeatureAuditEntry = {
  routeKey: WingmanRouteKey;
  status: FeatureAuditStatus;
  summary: string;
  needed: string[];
};

export const featureAuditStatusMeta: Record<
  FeatureAuditStatus,
  { label: string; className: string }
> = {
  wired: {
    label: "Wired",
    className: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  partial: {
    label: "Needs completion",
    className: "border-amber-200 bg-amber-100 text-amber-700",
  },
};

const manifest = featureAuditManifest as FeatureAuditEntry[];

export const featureAudit = manifest.map((entry) => ({
  ...entry,
  route: routeCatalogByKey[entry.routeKey],
  statusMeta: featureAuditStatusMeta[entry.status],
}));
