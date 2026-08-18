import { redirect } from "next/navigation"
import { getCurrentUser, toPublicUser } from "@/lib/auth"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return <DashboardClient user={toPublicUser(user)} />
}
