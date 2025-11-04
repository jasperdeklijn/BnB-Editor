import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-6">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-amber-950">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-amber-900">Website Not Found</h2>
        <p className="mb-8 text-lg text-amber-800">This website doesn't exist or hasn't been published yet.</p>
        <Button asChild className="bg-amber-700 hover:bg-amber-800">
          <Link href="/editor">
            <Home className="mr-2 h-4 w-4" />
            Go to Editor
          </Link>
        </Button>
      </div>
    </div>
  )
}
