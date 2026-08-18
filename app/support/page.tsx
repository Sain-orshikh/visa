import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SupportClient } from "@/components/support-client"

export const metadata: Metadata = {
  title: "Support — Passage",
}

export default async function SupportPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return <SupportClient />
}
