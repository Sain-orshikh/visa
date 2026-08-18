import { FileText, IdCard, Landmark, Plane, Tag } from "lucide-react"
import type { UserCategory } from "./types"

export interface CategoryOption {
  key: string
  label: string
  Icon: typeof FileText
  /** Built-ins can't be renamed or removed; custom ones can. */
  builtIn: boolean
}

/**
 * The categories every account has. "Other" is deliberately excluded here —
 * it's the fallback bucket and always sorts last, see `resolveCategories`.
 */
export const BUILT_IN_CATEGORIES: CategoryOption[] = [
  { key: "identity", label: "Identity", Icon: IdCard, builtIn: true },
  { key: "financial", label: "Financial", Icon: Landmark, builtIn: true },
  { key: "travel", label: "Travel", Icon: Plane, builtIn: true },
]

export const OTHER_CATEGORY: CategoryOption = {
  key: "other",
  label: "Other",
  Icon: FileText,
  builtIn: true,
}

/** Built-ins, then the user's own, then the catch-all. */
export function resolveCategories(custom: UserCategory[] = []): CategoryOption[] {
  return [
    ...BUILT_IN_CATEGORIES,
    ...custom.map((c) => ({ key: c.id, label: c.label, Icon: Tag, builtIn: false })),
    OTHER_CATEGORY,
  ]
}

/** Maps a document's stored category onto a known key, falling back to "other". */
export function categoryKeyOf(category: string | null, categories: CategoryOption[]): string {
  const raw = (category ?? "").toLowerCase()
  return categories.some((c) => c.key === raw && c.key !== OTHER_CATEGORY.key) ? raw : OTHER_CATEGORY.key
}

/** Turns a label into a stable id. Used server-side when creating a category. */
export function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
