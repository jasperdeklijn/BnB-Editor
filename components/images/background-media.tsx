"use client"

import { useEffect, useRef, useState } from "react"
import { isVideoSource, mediaPosterSource } from "@/lib/media"

export function BackgroundMedia({ src, position = "center" }: { src?: string; position?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!isVideoSource(src)) return
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      if (preference.matches) video.current?.pause()
      else void video.current?.play().catch(() => {})
    }
    apply()
    preference.addEventListener("change", apply)
    return () => preference.removeEventListener("change", apply)
  }, [src])
  if (!isVideoSource(src)) return null
  return <div data-media-background className="absolute inset-0 overflow-hidden">
    <video ref={video} src={src} poster={mediaPosterSource(src)} muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: position }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <button type="button" data-media-controls className="absolute bottom-3 right-3 z-30 rounded-md bg-black/70 px-3 py-2 text-xs font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={(event) => {
      event.stopPropagation()
      if (playing) video.current?.pause()
      else void video.current?.play().catch(() => {})
    }} aria-label={playing ? "Achtergrondvideo pauzeren" : "Achtergrondvideo afspelen"}>{playing ? "Pauzeren" : "Afspelen"}</button>
  </div>
}
