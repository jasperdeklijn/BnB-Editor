"use client"
import {useState,useTransition} from "react"
import {quoteAction} from "@/app/editor/quotes/actions"
export function ReceiptSetting({initial,businessId}:{initial:boolean;businessId:string}) {
  const [value,setValue]=useState(initial),[message,setMessage]=useState(""),[pending,start]=useTransition()
  return <div className="mb-5 rounded-lg border p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value} disabled={pending} onChange={e=>{const next=e.target.checked;start(async()=>{const result=await quoteAction({action:"receipt-setting",id:businessId,message:String(next)});if(result.success)setValue(next);setMessage(result.success?"Instelling opgeslagen.":result.error)})}}/>Ontvangstbevestiging met klantpagina naar nieuwe aanvragers sturen</label><p role="status" className="text-sm">{message}</p></div>
}
