import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";

export type RoomTemplateVerificationState = "VERIFIED" | "NOT VERIFIED";

export type RoomTemplateIntegrityIssueCode =
  | "NO_GOVERNED_BASELINE"
  | "REQUIRED_ITEM_REMOVED"
  | "REQUIRED_QUANTITY_CHANGED"
  | "REQUIRED_SKU_CHANGED"
  | "UNREVIEWED_ITEM_ADDED"
  | "NETWORKHD_FAMILY_MIX"
  | "NETWORKHD_CONTROLLER_MISSING"
  | "NETWORKHD_600_SWITCH_MISSING"
  | "MULTIVIEW_FAMILY_MISMATCH"
  | "WIRELESS_RECEIVER_MISSING";

export type RoomTemplateIntegrityIssue = {
  code: RoomTemplateIntegrityIssueCode;
  severity: "error" | "warning";
  message: string;
  resolution: string;
  rowId?: string;
  sku?: string;
};

export type RoomTemplateIntegrityResult = {
  status: RoomTemplateVerificationState;
  isVerified: boolean;
  edited: boolean;
  summary: string;
  issues: RoomTemplateIntegrityIssue[];
  baselineVersion?: string;
  verifiedAt?: string;
  verifiedBy?: string;
};

function normaliseSku(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

function rowIsActive(row: TemplateBomRow): boolean {
  return row.qty > 0 && row.status !== "excluded";
}

function rowIsCore(row: TemplateBomRow): boolean {
  return rowIsActive(row) && row.type !== "Optional";
}

function networkHdFamily(sku: string): "100" | "500" | "600" | null {
  const value = normaliseSku(sku);

  if (/^NHD-600/.test(value)) return "600";
  if (/^NHD-(500|0401-MV)/.test(value)) return "500";
  if (/^NHD-1/.test(value)) return "100";

  return null;
}

function rowSearchText(row: TemplateBomRow): string {
  return `${row.sku} ${row.description} ${row.role}`.toUpperCase();
}

function addIssue(
  issues: RoomTemplateIntegrityIssue[],
  issue: RoomTemplateIntegrityIssue,
): void {
  const duplicate = issues.some(
    (item) =>
      item.code === issue.code &&
      item.rowId === issue.rowId &&
      item.sku === issue.sku &&
      item.message === issue.message,
  );

  if (!duplicate) issues.push(issue);
}

export function assessRoomTemplateIntegrity(
  baselineTemplate: RoomTemplate,
  currentRows: TemplateBomRow[],
): RoomTemplateIntegrityResult {
  const verification = baselineTemplate.verification;

  if (!verification?.baseline?.length) {
    const issues: RoomTemplateIntegrityIssue[] = [
      {
        code: "NO_GOVERNED_BASELINE",
        severity: "error",
        message:
          "This design does not have a governed Wingman verification baseline.",
        resolution:
          "Start from a built-in verified room template or obtain a complete pre-sales design review.",
      },
    ];

    return {
      status: "NOT VERIFIED",
      isVerified: false,
      edited: true,
      summary:
        "NOT VERIFIED â€” the design cannot be approved for real-world deployment because no governed baseline is available.",
      issues,
    };
  }

  const issues: RoomTemplateIntegrityIssue[] = [];
  const baselineById = new Map(
    verification.baseline.map((row) => [row.id, row]),
  );
  const baselineBySku = new Map(
    verification.baseline.map((row) => [normaliseSku(row.sku), row]),
  );

  for (const baselineRow of verification.baseline) {
    const row =
      currentRows.find((item) => item.id === baselineRow.id) ??
      currentRows.find(
        (item) => normaliseSku(item.sku) === normaliseSku(baselineRow.sku),
      );

    if (!row || !rowIsActive(row)) {
      addIssue(issues, {
        code: "REQUIRED_ITEM_REMOVED",
        severity: "error",
        rowId: baselineRow.id,
        sku: baselineRow.sku,
        message: `${baselineRow.sku} (${baselineRow.role}) is required by the verified template but is no longer included.`,
        resolution:
          "Restore the required baseline item and quantity, or replace it only after a governed technical review.",
      });
      continue;
    }

    if (normaliseSku(row.sku) !== normaliseSku(baselineRow.sku)) {
      addIssue(issues, {
        code: "REQUIRED_SKU_CHANGED",
        severity: "error",
        rowId: baselineRow.id,
        sku: row.sku,
        message: `${baselineRow.sku} has been replaced by ${row.sku || "a blank SKU"} without a governed equivalence decision.`,
        resolution:
          "Restore the baseline SKU or obtain technical approval for the replacement and all affected dependencies.",
      });
    }

    if (row.qty !== baselineRow.qty) {
      addIssue(issues, {
        code: "REQUIRED_QUANTITY_CHANGED",
        severity: "error",
        rowId: baselineRow.id,
        sku: row.sku,
        message: `${baselineRow.sku} has quantity ${row.qty}; the verified baseline quantity is ${baselineRow.qty}.`,
        resolution:
          "Restore the verified quantity or re-engineer endpoint counts, switching capacity, licences, power and network capacity.",
      });
    }
  }

  for (const row of currentRows.filter(rowIsActive)) {
    const knownById = baselineById.has(row.id);
    const knownBySku = baselineBySku.has(normaliseSku(row.sku));
    const templateOptional = baselineTemplate.bom.some(
      (item) =>
        item.type === "Optional" &&
        (item.id === row.id ||
          normaliseSku(item.sku) === normaliseSku(row.sku)),
    );

    if (!knownById && !knownBySku && !templateOptional) {
      addIssue(issues, {
        code: "UNREVIEWED_ITEM_ADDED",
        severity: "warning",
        rowId: row.id,
        sku: row.sku,
        message: `${row.sku} has been added outside the governed template baseline.`,
        resolution:
          "Check signal compatibility, product role, power, control, USB, audio and all upstream/downstream dependencies.",
      });
    }
  }

  const coreRows = currentRows.filter(rowIsCore);
  const coreSkus = coreRows.map((row) => normaliseSku(row.sku));
  const families = Array.from(
    new Set(
      coreSkus
        .map(networkHdFamily)
        .filter((family): family is "100" | "500" | "600" => Boolean(family)),
    ),
  );

  if (families.length > 1) {
    addIssue(issues, {
      code: "NETWORKHD_FAMILY_MIX",
      severity: "error",
      message: `The edited design mixes NetworkHD ${families.join(", ")} product families in one routed AV system.`,
      resolution:
        "Keep NetworkHD 100, 500 and 600 architectures separate unless the design deliberately uses isolated systems with documented boundaries.",
    });
  }

  const hasNetworkHdEndpoint = coreSkus.some(
    (sku) => /^NHD-/.test(sku) && !/^NHD-(CTL|0401-MV)/.test(sku),
  );
  const hasNetworkHdController = coreSkus.some((sku) =>
    /^NHD-CTL-PRO/.test(sku),
  );

  if (hasNetworkHdEndpoint && !hasNetworkHdController) {
    addIssue(issues, {
      code: "NETWORKHD_CONTROLLER_MISSING",
      severity: "error",
      message:
        "The edited NetworkHD design no longer includes an NHD-CTL-PRO controller.",
      resolution:
        "Restore the governed NetworkHD controller and confirm system commissioning ownership.",
    });
  }

  if (families.includes("600")) {
    const hasTenGigSwitch = coreRows.some((row) =>
      /10G|TEN.?GIG|SDVOE/.test(rowSearchText(row)),
    );

    if (!hasTenGigSwitch) {
      addIssue(issues, {
        code: "NETWORKHD_600_SWITCH_MISSING",
        severity: "error",
        message:
          "NetworkHD 600 endpoints are present but the required 10G AV network switching scope is missing.",
        resolution:
          "Restore the governed 10G switch infrastructure, optics/copper media, port capacity, power and resilience scope.",
      });
    }
  }

  const has0401Mv = coreSkus.includes("NHD-0401-MV");
  if (has0401Mv && !families.includes("500")) {
    addIssue(issues, {
      code: "MULTIVIEW_FAMILY_MISMATCH",
      severity: "error",
      sku: "NHD-0401-MV",
      message:
        "NHD-0401-MV is present without a governed NetworkHD 500 source architecture.",
      resolution:
        "Use NHD-0401-MV with the correct NetworkHD 500 workflow or restore the original multiview design.",
    });
  }

  const has150Rx = coreSkus.includes("NHD-150-RX");
  if (has150Rx && !families.includes("100")) {
    addIssue(issues, {
      code: "MULTIVIEW_FAMILY_MISMATCH",
      severity: "error",
      sku: "NHD-150-RX",
      message:
        "NHD-150-RX is present without a governed NetworkHD 100 source architecture.",
      resolution:
        "Use NHD-150-RX only within the intended NetworkHD 100 workflow.",
    });
  }

  const hasDg2 = currentRows
    .filter(rowIsActive)
    .some((row) => normaliseSku(row.sku) === "APO-DG2");
  const hasCompatibleWirelessReceiver = currentRows
    .filter(rowIsCore)
    .some((row) => {
      const sku = normaliseSku(row.sku);
      return /^APO-VX20-UC(?:-V2)?$/.test(sku) || /-W$/.test(sku);
    });

  if (hasDg2 && !hasCompatibleWirelessReceiver) {
    addIssue(issues, {
      code: "WIRELESS_RECEIVER_MISSING",
      severity: "error",
      sku: "APO-DG2",
      message:
        "APO-DG2 is present without a compatible WyreStorm wireless receiver/base device.",
      resolution:
        "Restore APO-VX20-UC V2 or a confirmed compatible WyreStorm -W receiver product.",
    });
  }

  const edited =
    issues.length > 0 ||
    currentRows.some((row) => {
      const source = baselineTemplate.bom.find((item) => item.id === row.id);
      return (
        !source ||
        source.qty !== row.qty ||
        source.status !== row.status ||
        normaliseSku(source.sku) !== normaliseSku(row.sku)
      );
    });

  const isVerified = issues.length === 0;

  return {
    status: isVerified ? "VERIFIED" : "NOT VERIFIED",
    isVerified,
    edited,
    summary: isVerified
      ? "VERIFIED â€” this design matches the complete governed room-template baseline and its required technical dependencies."
      : "NOT VERIFIED â€” one or more edits have broken or changed the governed room-template baseline. It must not be relied on for real-world deployment without review.",
    issues,
    baselineVersion: verification.baselineVersion,
    verifiedAt: verification.verifiedAt,
    verifiedBy: verification.verifiedBy,
  };
}