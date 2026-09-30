"use client"
import {useEffect,useState} from "react"
import {useRouter} from "next/navigation"

export function PortalEntry() {
  const router=useRouter(),[status,setStatus]=useState("")
  useEffect(()=>{
    const fragment=new URLSearchParams(window.location.hash.slice(1)),token=fragment.get("access")
    if(!token)return
    window.history.replaceState(null,"",window.location.pathname)
    setStatus("Uw persoonlijke pagina openen…")
    void fetch("/api/customer-request/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})})
      .then(response=>{if(!response.ok)throw new Error();setStatus("");router.refresh()})
      .catch(()=>setStatus("Deze link is niet beschikbaar. Vraag de ondernemer om een nieuwe link."))
  },[router])
  return <p role="status" className="my-3 text-sm">{status}</p>
}
