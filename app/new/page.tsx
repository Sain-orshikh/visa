import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { NewVisaWizard } from "@/components/new-visa-wizard"

export default async function NewVisaPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return <NewVisaWizard />
}
