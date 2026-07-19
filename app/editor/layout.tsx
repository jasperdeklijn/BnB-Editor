import { redirect } from "next/navigation"
import { EditorLayoutClient } from "@/components/editor/editor-layout-client"
import { getEditorBootstrap } from "@/lib/editor-bootstrap"

export const metadata = {
  title: "Editor | Website Maker",
  description: "Bouw en beheer uw website",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, avatarUrl, displayName, businessCategory } = await getEditorBootstrap()
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <EditorLayoutClient
      avatarUrl={avatarUrl}
      displayName={displayName}
      initialBusinessCategory={businessCategory}
    >
      {children}
    </EditorLayoutClient>
  )
}
