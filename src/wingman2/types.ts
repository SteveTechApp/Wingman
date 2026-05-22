export type StatusVariant = "recommended" | "alternative" | "caution";

export type CompareRow = {
  label: string;
  competitor: string;
  wyrestorm: string;
  verdict: "Match" | "Better" | "Partial" | "Verify";
};
