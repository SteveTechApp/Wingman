import { runAudit, writeReport } from "./check-wingman-style-drift-baseline.mjs";

const audit = runAudit();
writeReport(audit);
console.log(`Hard-coded hex colours: ${audit.totals.hex}`);
console.log(`rgb/rgba colours: ${audit.totals.rgb}`);
console.log(`Inline style attributes: ${audit.totals.inlineStyle}`);
console.log(`Arbitrary Tailwind colours: ${audit.totals.arbitraryTailwind}`);
console.log(`Page-specific CSS sections: ${audit.totals.pageSections}`);
console.log(`Legacy info-pill/submode-chip occurrences: ${audit.totals.legacyPills}`);
console.log("Report written to: reports/wingman-style-drift-audit.md");
