"use client"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { Globe, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ImportDocument } from "@/lib/import/schema"

export interface WebsiteImportResult {
  document:ImportDocument;warnings:string[]
  pages:Array<{sourceUrl:string;key:string;slug:string;title:string}>
}
type Discovery={url:string;title:string;pages:Array<{url:string;label:string;isHome:boolean}>;maxPages:number;aiReady:boolean}
export function ImportWebsiteUrl({disabled,onPrepared,onBusyChange}:{disabled:boolean;onPrepared:(result:WebsiteImportResult)=>void;onBusyChange:(busy:boolean)=>void}) {
  const id=useId()
  const [url,setUrl]=useState("")
  const [permission,setPermission]=useState(false)
  const [discovery,setDiscovery]=useState<Discovery|null>(null)
  const [selected,setSelected]=useState<string[]>([])
  const [extra,setExtra]=useState("")
  const [stage,setStage]=useState<"discover"|"generate"|null>(null)
  const [error,setError]=useState("")
  const controller=useRef<AbortController|null>(null)
  useEffect(()=>()=>controller.current?.abort(),[])
  async function run(action:"discover"|"generate") {
    controller.current?.abort()
    const request=new AbortController();controller.current=request
    setStage(action);setError("");onBusyChange(true)
    try {
      const response=await fetch("/api/websites/import-url",{method:"POST",signal:request.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({action,url:discovery?.url ?? url,permission,...(action==="generate"?{pages:selected}: {})})})
      const result=await response.json().catch(()=>{throw new Error("De server gaf geen geldig antwoord. Probeer later opnieuw.")})
      if(!response.ok)throw new Error(result.error || "De website kon niet worden omgezet.")
      if(controller.current!==request)return
      if(action==="discover") {setDiscovery(result);setSelected(result.pages.slice(0,Math.min(4,result.maxPages)).map((page:{url:string})=>page.url))}
      else onPrepared(result)
    } catch(error) {if(!request.signal.aborted)setError(error instanceof Error?error.message:"De verbinding is onderbroken.")}
    finally {if(controller.current===request){controller.current=null;setStage(null);onBusyChange(false)}}
  }
  function discover(event:FormEvent) {event.preventDefault();void run("discover")}
  function addPage() {
    if(!discovery)return
    try {
      const page=new URL(extra,discovery.url);page.search="";page.hash=""
      if(page.origin!==new URL(discovery.url).origin)throw new Error("Kies een pagina van hetzelfde domein.")
      if(discovery.pages.some(entry=>entry.url.replace(/\/$/,"")===page.href.replace(/\/$/,"")))throw new Error("Deze pagina staat al in de lijst.")
      setDiscovery({...discovery,pages:[...discovery.pages,{url:page.href,label:page.pathname,isHome:false}]})
      if(selected.length<discovery.maxPages)setSelected([...selected,page.href])
      setExtra("");setError("")
    } catch(error) {setError(error instanceof Error?error.message:"Controleer het pagina-adres.")}
  }
  const busy=Boolean(stage)
  return <section className="mt-6 space-y-4 rounded-xl border bg-muted/20 p-4 sm:p-5" aria-label="Website met AI overzetten">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Globe className="h-5 w-5 text-primary"/>Website met AI overzetten</h2><p className="mt-2 text-sm text-muted-foreground">Vul uw websiteadres in, kies de pagina&apos;s en bekijk hoe de inhoud overgaat naar bewerkbare FlexPagina-componenten.</p></div>
    <form onSubmit={discover} className="space-y-3">
      <Label htmlFor={`${id}-url`}>Openbaar websiteadres (HTTPS)</Label>
      <div className="flex flex-col gap-2 sm:flex-row"><Input id={`${id}-url`} type="url" required placeholder="https://uwwebsite.nl" value={url} disabled={busy||disabled} onChange={event=>{setUrl(event.target.value);setDiscovery(null);setSelected([]);setError("")}} className="min-h-11 min-w-0 flex-1"/><Button type="submit" disabled={busy||disabled||!permission||!url.trim()} className="min-h-11">{stage==="discover"?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Pagina&apos;s zoeken</Button></div>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={permission} disabled={busy||disabled} onChange={event=>setPermission(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary"/><span>Ik ben eigenaar of heb toestemming om deze inhoud en afbeeldingen te hergebruiken. De gekozen openbare pagina&apos;s mogen voor de omzetting door onze AI-dienst worden verwerkt.</span></label>
    </form>
    {discovery?<div className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Pagina&apos;s meenemen</h3><span className="text-sm text-muted-foreground">{selected.length} van maximaal {discovery.maxPages}</span></div>
      <p className="text-sm text-muted-foreground">Het ingevoerde adres wordt Home. Iedere andere gekozen pagina krijgt een eigen canvas-tab. Alleen openbare HTML-pagina&apos;s van dit domein worden gelezen.</p>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border bg-background p-2">{discovery.pages.map(page=><label key={page.url} className="flex min-h-11 min-w-0 items-start gap-3 rounded-md p-2 hover:bg-muted"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={selected.includes(page.url)} disabled={busy||disabled||page.isHome||(!selected.includes(page.url)&&selected.length>=discovery.maxPages)} onChange={event=>setSelected(current=>event.target.checked?[...current,page.url]:current.filter(url=>url!==page.url))}/><span className="min-w-0"><span className="block text-sm font-medium">{page.label||new URL(page.url).pathname}{page.isHome?" · Home":""}</span><span className="block break-all text-xs text-muted-foreground">{page.url}</span></span></label>)}</div>
      <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Extra pagina-adres" placeholder="Extra pagina die niet in het menu staat" value={extra} onChange={event=>setExtra(event.target.value)} disabled={busy||disabled}/><Button type="button" variant="outline" disabled={busy||disabled||!extra.trim()} onClick={addPage}>Pagina toevoegen</Button></div>
      {!discovery.aiReady?<p role="status" className="text-sm text-muted-foreground">De AI-dienst moet nog door de beheerder worden ingesteld. U kunt ondertussen een JSON-bestand importeren.</p>:null}
      <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={busy||disabled||!permission||!selected.length||!discovery.aiReady} onClick={()=>void run("generate")}><Sparkles className="mr-2 h-4 w-4"/>Gekozen pagina&apos;s omzetten</Button>
    </div>:null}
    {stage?<div role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin"/>{stage==="discover"?"Openbare pagina's zoeken…":"Pagina's lezen en omzetten naar componenten. Dit kan ongeveer een minuut duren…"}<Button type="button" variant="ghost" onClick={()=>{controller.current?.abort();controller.current=null;setStage(null);onBusyChange(false)}}>Stoppen</Button></div>:null}
    {error?<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:null}
  </section>
}
