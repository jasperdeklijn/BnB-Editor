"use client"

import type { ImgHTMLAttributes } from "react"
import { isVideoSource, mediaPosterSource } from "@/lib/media"

/** Existing image URLs and GIFs stay images; direct video URLs use a player. */
export function MediaImage({ src, alt = "", loading: _loading, mediaControls = true, ...props }: ImgHTMLAttributes<HTMLImageElement> & { mediaControls?: boolean }) {
  if (typeof src === "string" && isVideoSource(src)) {
    const { className, style, width, height, onClick, onDoubleClick, onDragStart, onDragOver, onDrop, ...attributes } = props
    return <video {...attributes as React.VideoHTMLAttributes<HTMLVideoElement>} src={src} poster={mediaPosterSource(src)} aria-label={alt || "Video"} className={className} style={{ aspectRatio: "16/9", ...style }} width={width} height={height} controls={mediaControls} muted={!mediaControls} tabIndex={mediaControls ? undefined : -1} playsInline preload="metadata"
      onClick={(event) => { if (mediaControls) event.stopPropagation(); (onClick as unknown as React.MouseEventHandler<HTMLVideoElement> | undefined)?.(event) }}
      onDoubleClick={onDoubleClick as unknown as React.MouseEventHandler<HTMLVideoElement>}
      onDragStart={onDragStart as unknown as React.DragEventHandler<HTMLVideoElement>}
      onDragOver={onDragOver as unknown as React.DragEventHandler<HTMLVideoElement>}
      onDrop={onDrop as unknown as React.DragEventHandler<HTMLVideoElement>}>Uw browser kan deze video niet afspelen.</video>
  }
  return <img {...props} src={src} alt={alt} loading={_loading} />
}
