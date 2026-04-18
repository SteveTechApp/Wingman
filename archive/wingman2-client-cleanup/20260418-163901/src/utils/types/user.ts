import type { ThemeMode } from "./api";

export type UserProfile = {
  name: string
  email: string
  company: string

  showBackground?: boolean
  unitSystem?: "metric" | "imperial"
  logoUrl?: string
  language?: string
  theme?: ThemeMode
  zoomLevel?: number

  customProductDatabase?: any[]
}
