import type { UserProfile } from "@/utils/types/user"

export const defaultUserState: UserProfile = {
  name: "",
  email: "",
  company: "",
  logoUrl: "",
  language: "en",
  unitSystem: "metric",
  showBackground: true,
  zoomLevel: 1,
  customProductDatabase: []
}