export interface Profile {
  name: string
  domains: string[]
  createdAt?: string
}

/** Profiles keyed by profile id ("default", "profile_<timestamp>", ...) */
export type Profiles = Record<string, Profile>
