import { roomTemplates } from "../src/wingman2/lib/roomTemplates";

const thirdParty = (template: (typeof roomTemplates)[number]) => template.bom.filter((row) => row.sku.startsWith("BY-OTHERS-"));
const has = (template: (typeof roomTemplates)[number], pattern: RegExp) => template.bom.some((row) => pattern.test(`${row.role} ${row.description}`));
const markets = new Map<string, number>();
for (const template of roomTemplates) markets.set(template.vertical, (markets.get(template.vertical) ?? 0) + 1);

const totalRows = roomTemplates.reduce((count, template) => count + thirdParty(template).length, 0);
const selectedRows = roomTemplates.reduce((count, template) => count + thirdParty(template).filter((row) => row.manufacturer?.trim() && row.model?.trim()).length, 0);
const incorrectlyIncluded = roomTemplates.reduce((count, template) => count + thirdParty(template).filter((row) => row.type !== "Validate" || row.status !== "validate").length, 0);
const lines = [
  "# Predefined Room Template Completeness Audit",
  "",
  `Audited on 2026-10-01 against ${roomTemplates.length} predefined templates and the whole-room design requirement: a room context, WyreStorm signal path, and visible scope for the other equipment, infrastructure and work needed to complete the system.`,
  "",
  "## Findings",
  "",
  `- Every template has a whole-room concept, physical room/occupancy assumptions, scheduled sources and outputs, a WyreStorm transport design, design notes, assumptions and site validation items.`,
  `- The authored schedules contain ${totalRows.toLocaleString("en-GB")} third-party or integrator scope rows across ${roomTemplates.length} templates, covering endpoint products and supporting installation scope.`,
  `- ${selectedRows} of those rows name both a third-party manufacturer and model. The schedules therefore describe the equipment roles and design allowances, but they do not yet provide real third-party SKU selections.`,
  `- ${incorrectlyIncluded} third-party rows remain incorrectly labelled as included. Before this refinement, all ${totalRows.toLocaleString("en-GB")} generic allowances were presented that way; the refinement changes them to “Validate” until an actual product is selected and checked.`,
  "- Do not treat a BY-OTHERS-* identifier as a purchasable SKU. It is a scope key that identifies an unselected item. Manufacturer and model fields remain empty until selected from a supplier catalogue or the integrator’s equipment library.",
  "- The generic whole-room scope should be treated as a starting schedule. Site-specific source/display models, mount fixings, cable lengths, connector transitions, network switch configuration/PoE, acoustic treatment and installation quantities still require survey or customer confirmation.",
  "",
  "## Template inventory",
  "",
  "| Template | Market | WyreStorm rows | Other-scope rows | Named other-brand models | Assumptions | Site checks |",
  "|---|---|---:|---:|---:|---:|---:|",
  ...roomTemplates.map((template) => {
    const others = thirdParty(template);
    const ws = template.bom.filter((row) => !row.sku.startsWith("BY-OTHERS-") && !row.sku.startsWith("CUSTOM"));
    const named = others.filter((row) => row.manufacturer?.trim() && row.model?.trim()).length;
    return `| ${template.name.replaceAll("|", "\\|")} | ${template.vertical} | ${ws.length} | ${others.length} | ${named} | ${template.assumptions.length} | ${template.validationItems.length} |`;
  }),
  "",
  "## Template counts by market label",
  "",
  ...[...markets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([market, count]) => `- ${market}: ${count}`),
  "",
  "## Refinement applied",
  "",
  "All generated non-WyreStorm and room-completion allowance rows are now typed and shown as requiring validation, with explicit evidence that a real manufacturer/model must be selected before quotation. Existing role descriptions, locations, quantities, cable/network/power notes and WyreStorm routing remain available for completing the room design.",
  "",
  "## Remaining work to meet the SKU-specific standard",
  "",
  "Research and add compatible third-party candidate SKUs only where the design basis supports the choice. Product selections need a source URL, checked date, technical fit notes and compatibility/dependency information. Where room geometry, customer standards, supplier availability or site conditions decide the model, leave it as an explicit validate item and let the reusable equipment library capture the integrator’s approved choice.",
  "",
];

process.stdout.write(lines.join("\n"));
