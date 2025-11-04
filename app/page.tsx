import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  // If user is logged in, redirect to editor
  if (data?.user) {
    redirect("/editor")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-6">
      <div className="max-w-3xl text-center">
        <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-amber-950 md:text-6xl">
          Build Your BnB Website in Minutes
        </h1>
        <p className="mb-8 text-pretty text-xl text-amber-900">
          Create a beautiful, professional website for your bed and breakfast with our easy drag-and-drop builder. No
          coding required.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
            <Link href="/auth/sign-up">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
