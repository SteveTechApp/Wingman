export type UserProfile = {
  name: string
  email: string
  company: string

  showBackground?: boolean
  unitSystem?: "metric" | "imperial"
  logoUrl?: string
  language?: string
  zoomLevel?: number

  customProductDatabase?: any[]
}