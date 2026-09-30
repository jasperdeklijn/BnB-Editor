"use client"
import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { quoteAction } from "@/app/editor/quotes/actions"
import { Textarea } from "@/components/ui/textarea"

export function QuoteEntryActions({requestId,entryId}:{requestId?:string;entryId?:string}) {
  const [pending,start]=useTransition(),[error,setError]=useState("")
  const router=useRouter()
  const [message,setMessage]=useState(""),[messageKey,setMessageKey]=useState(()=>crypto.randomUUID())
  return <div className="my-3"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={pending} onClick={()=>start(async()=>{
    setError("");const result=await quoteAction({action:"start",requestId,entryId})
    if(result.success) router.push(`/editor/quotes?quote=${result.quoteId}`);else setError(result.error)
  })}>{pending?"Even geduld…":"Offerte maken / openen"}</Button>{requestId?<Button type="button" variant="outline" disabled={pending} onClick={()=>start(async()=>{const result=await quoteAction({action:"link",requestId});setError(result.success?"Klantlink verstuurd.":result.error)})}>Klantpagina versturen</Button>:null}</div>{requestId?<details className="mt-3"><summary className="cursor-pointer text-sm">Bericht delen op klantpagina</summary><Textarea aria-label="Gedeeld klantbericht" className="my-2" maxLength={8000} value={message} onChange={e=>setMessage(e.target.value)}/><Button type="button" disabled={pending||!message.trim()} onClick={()=>start(async()=>{const result=await quoteAction({action:"message",requestId,message,key:messageKey});setError(result.success?"Bericht gedeeld op klantpagina.":result.error);if(result.success){setMessage("");setMessageKey(crypto.randomUUID());router.refresh()}})}>Bericht delen</Button><Button type="button" variant="ghost" disabled={pending} onClick={()=>{if(window.confirm("Alle klantlinks voor deze aanvraag intrekken?"))start(async()=>{const result=await quoteAction({action:"revoke",requestId});setError(result.success?"Toegang ingetrokken.":result.error)})}}>Klanttoegang intrekken</Button></details>:null}{error?<p role="status" className="mt-2 text-sm">{error}</p>:null}</div>
}
