import { getCurrentUser } from "@/lib/auth"
import { LandingClient } from "@/components/landing-client"

export default async function Home() {
  const user = await getCurrentUser()
  return <LandingClient isAuthenticated={Boolean(user)} />
}
