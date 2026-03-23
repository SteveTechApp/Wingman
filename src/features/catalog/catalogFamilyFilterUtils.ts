import {
  CatalogueFilterState,
  CatalogueProductRecord,
  FamilyDefinition,
  FamilyFilterGroup,
  SOLUTION_FAMILIES,
  SolutionFamily
} from "./catalogFamilyFilterModel";

function normalise(value: string | null | undefined): string {
  return (value ?? "").toString().trim().toLowerCase();
}

function normaliseList(values: (string | null | undefined)[] | null | undefined): string[] {
  return (values ?? [])
    .map(v => normalise(v))
    .filter(Boolean);
}

function includesAny(haystack: string[], needles: string[]): boolean {
  if (needles.length === 0) return true;
  return needles.some(n => haystack.includes(n));
}

function expandSelectedValues(group: FamilyFilterGroup, selectedValues: string[] | undefined): string[] {
  if (!selectedValues || selectedValues.length === 0) return [];

  const optionMap = new Map(
    group.options.map(option => [
      normalise(option.id),
      [option.id, ...(option.aliases ?? [])].map(normalise).filter(Boolean)
    ])
  );

  return Array.from(
    new Set(
      selectedValues.flatMap(value => {
        const key = normalise(value);
        return optionMap.get(key) ?? [key];
      })
    )
  );
}

function fieldValue(product: CatalogueProductRecord, groupId: string): string[] {
  switch (groupId) {
    case "series":
      return normaliseList([product.series]);
    case "role":
      return normaliseList([product.role]);
    case "matrixType":
      return normaliseList([product.matrixType]);
    case "presentationType":
      return normaliseList([product.presentationType]);
    case "extenderType":
      return normaliseList([product.extenderType]);
    case "videoWallType":
      return normaliseList([product.videoWallType]);
    case "audioType":
      return normaliseList([product.audioType]);
    case "controlType":
      return normaliseList([product.controlType]);
    case "applications":
      return normaliseList(product.applicationTags ?? []);
    case "mount":
      return normaliseList(product.mountTags ?? []);
    case "features":
      return normaliseList(product.featureTags ?? []);
    case "io": {
      const blob = [product.sku, product.name, product.searchText].map(normalise).join(" ");
      const matches: string[] = [];
      const sizes = ["4x4", "8x8", "8x12", "10x7", "16x16"];
      for (const size of sizes) {
        if (blob.includes(size)) matches.push(size);
      }
      return matches;
    }
    case "accessoryType": {
      const blob = [product.name, product.searchText].map(normalise).join(" ");
      const matches: string[] = [];
      if (blob.includes("matrix dock")) matches.push("matrix-dock");
      if (blob.includes("dongle")) matches.push("dongle");
      if (blob.includes("dock")) matches.push("dock");
      if (blob.includes("mount")) matches.push("mounting");
      return matches;
    }
    default:
      return [];
  }
}

export function getFamilyDefinition(family: SolutionFamily | null): FamilyDefinition | undefined {
  return SOLUTION_FAMILIES.find(x => x.id === family);
}

export function resolveFamily(product: CatalogueProductRecord): SolutionFamily | null {
  const seed = [
    product.family,
    product.series,
    product.role,
    product.matrixType,
    product.presentationType,
    product.extenderType,
    product.videoWallType,
    product.audioType,
    product.controlType,
    ...(product.featureTags ?? []),
    ...(product.applicationTags ?? []),
    product.name,
    product.searchText,
    product.sku
  ]
    .filter(Boolean)
    .map(normalise)
    .join(" ");

  if (seed.includes("nhd") || seed.includes("networkhd") || seed.includes("av over ip") || seed.includes("avoip")) return "avoip";
  if (seed.includes("matrix")) return "matrix";
  if (seed.includes("presentation") || seed.includes("wireless") || seed.includes("apollo")) return "presentation";
  if (seed.includes("extender") || seed.includes("hdbaset tx") || seed.includes("hdbaset rx")) return "extender";
  if (seed.includes("video wall") || seed.includes("videowall")) return "videoWall";
  if (seed.includes("amplifier") || seed.includes("microphone") || seed.includes("audio de-embed")) return "audio";
  if (seed.includes("touch") || seed.includes("keypad") || seed.includes("protocol")) return "control";
  if (seed.includes("accessory") || seed.includes("dock") || seed.includes("dongle")) return "accessory";

  return null;
}

export function productMatchesFamily(product: CatalogueProductRecord, family: SolutionFamily | null): boolean {
  if (!family) return true;
  return resolveFamily(product) === family;
}

export function productMatchesGroup(
  product: CatalogueProductRecord,
  group: FamilyFilterGroup,
  selectedValues: string[] | undefined
): boolean {
  if (!selectedValues || selectedValues.length === 0) return true;
  const values = fieldValue(product, group.id);
  return includesAny(values, expandSelectedValues(group, selectedValues));
}

export function productMatchesSearch(product: CatalogueProductRecord, search: string): boolean {
  const q = normalise(search);
  if (!q) return true;
  const blob = [
    product.sku,
    product.name,
    product.family,
    product.series,
    product.role,
    product.matrixType,
    product.presentationType,
    product.extenderType,
    product.videoWallType,
    product.audioType,
    product.controlType,
    product.searchText,
    ...(product.featureTags ?? []),
    ...(product.applicationTags ?? []),
    ...(product.mountTags ?? [])
  ]
    .filter(Boolean)
    .map(normalise)
    .join(" ");
  return blob.includes(q);
}

export function filterCatalogueProducts(
  products: CatalogueProductRecord[],
  state: CatalogueFilterState
): CatalogueProductRecord[] {
  const familyDef = getFamilyDefinition(state.family);

  return products.filter(product => {
    if (!productMatchesFamily(product, state.family)) return false;
    if (!productMatchesSearch(product, state.search)) return false;

    if (!familyDef) return true;

    for (const group of familyDef.groups) {
      const selectedValues = state.selected[group.id];
      if (!productMatchesGroup(product, group, selectedValues)) {
        return false;
      }
    }

    return true;
  });
}

export function hasActiveFamilyFilters(state: CatalogueFilterState): boolean {
  if (state.family) return true;
  if (normalise(state.search).length > 0) return true;
  return false;
}

export function toggleSelectedValue(
  state: CatalogueFilterState,
  groupId: string,
  value: string,
  mode: "single" | "multi"
): CatalogueFilterState {
  const current = state.selected[groupId] ?? [];
  const exists = current.includes(value);

  if (mode === "single") {
    return {
      ...state,
      selected: {
        ...state.selected,
        [groupId]: exists ? [] : [value]
      }
    };
  }

  return {
    ...state,
    selected: {
      ...state.selected,
      [groupId]: exists ? current.filter(x => x !== value) : [...current, value]
    }
  };
}
