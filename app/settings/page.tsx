import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser, toPublicUser } from "@/lib/auth"
import { SettingsClient } from "@/components/settings-client"

export const metadata: Metadata = {
  title: "Settings — Passage",
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return <SettingsClient user={toPublicUser(user)} />
}
