"use client"
import {useState,useTransition} from "react"
import {useRouter} from "next/navigation"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {portalCopy} from "@/lib/quotes/i18n"

export function CustomerActions({versionId,locale}:{versionId?:string;locale?:string}) {
  const [pending,start]=useTransition(),[notice,setNotice]=useState(""),[codeId,setCodeId]=useState(""),[code,setCode]=useState(""),[name,setName]=useState(""),[note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false),[decision,setDecision]=useState("")
  const [messageKey,setMessageKey]=useState(()=>crypto.randomUUID())
  const router=useRouter()
  const copy=portalCopy(locale)
  function send(input:Record<string,unknown>) {start(async()=>{setNotice("");try{const response=await fetch("/api/customer-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.error);if(result.codeId){setCodeId(result.codeId);setNotice(copy.sentCode)}else{setNotice(copy.saved);setNote("");setCodeId("");setMessageKey(crypto.randomUUID());router.refresh()}}catch{setNotice(copy.error)}})}
  return <div className="mt-4 space-y-3">{versionId?<>{!codeId?<div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={()=>{setDecision(copy.accept);send({action:"code",versionId,decision:"accepted"})}}>{copy.accept}</Button><Button variant="outline" disabled={pending} onClick={()=>{setDecision(copy.decline);send({action:"code",versionId,decision:"declined"})}}>{copy.decline}</Button></div>:<fieldset className="space-y-3 rounded-lg border p-3"><legend>{decision}</legend><label className="block text-sm">{copy.name}<Input autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><label className="block text-sm">{copy.code}<Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><label className="block text-sm">{copy.note}<Textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{copy.statement}</label><Button disabled={pending||!confirmed||code.length!==6||name.trim().length<2} onClick={()=>send({action:"decide",codeId,code,name,note,confirmed})}>{copy.confirm}</Button><Button variant="ghost" disabled={pending} onClick={()=>setCodeId("")}>{copy.back}</Button></fieldset>}</>:<><label className="block text-sm">{copy.question}<Textarea value={note} maxLength={8000} onChange={e=>setNote(e.target.value)}/></label><Button disabled={pending||!note.trim()} onClick={()=>send({action:"message",body:note,key:messageKey})}>{copy.send}</Button></>}<p role="status" className="text-sm">{pending?copy.wait:notice}</p></div>
}
