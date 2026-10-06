import "server-only"
import { request } from "node:https"
import { setTimeout as wait } from "node:timers/promises"
import { load } from "cheerio"
import robotsParser from "robots-parser"
import { resolveImageDestination } from "./remote-images"
import { isHttpsUrl } from "./schema"

export const MAX_SOURCE_PAGES = 8
export const SOURCE_AGENT = "FlexPagina-Website-Import/1"
const MAX_BYTES = 1024 * 1024
export interface SourcePage {
  url: string; title: string; description: string; text: string
  links: Array<{ url: string; label: string }>
  images: Array<{ url: string; alt: string }>
  colors: string[]; fonts: string[]; hasForms: boolean; anchors:Array<{id:string;title:string}>
}
export interface SourceResponse { status: number; text: string; url: string; contentType: string; location?: string }

export function sourceUrl(value: string, base?: string): URL {
  const url = new URL(value, base)
  if (!isHttpsUrl(url.href)) throw new Error("Gebruik een openbaar HTTPS-websiteadres zonder inloggegevens.")
  url.hash = ""; url.search = ""
  return url
}
export function candidateUrl(value: string, base: string): string | null {
  try {
    if (!value.trim() || value.trim().startsWith("#")) return null
    const url = sourceUrl(value, base)
    if (url.origin !== new URL(base).origin || /\.(?:pdf|png|jpe?g|gif|webp|svg|zip|xml|txt|mp4|css|js)$/i.test(url.pathname)) return null
    if (/(?:^|\/)(?:wp-admin|wp-login|login|logout|account|checkout|cart|search)(?:\/|\.|$)/i.test(url.pathname)) return null
    url.pathname = url.pathname.replace(/\/$/, "") || "/"
    return url.href
  } catch { return null }
}

export function extractSourcePage(html: string, url: string): SourcePage {
  const $ = load(html)
  const clean = (value: string) => value.replace(/\s+/g, " ").trim()
  const title = clean($("title").first().text() || $("h1").first().text()).slice(0,160)
  const description = clean($("meta[name=description]").attr("content") ?? "").slice(0,500)
  const hasForms = $("form,iframe").length > 0
  const colors = [...new Set((html.match(/#[0-9a-f]{6}\b/gi) ?? []).map((value) => value.toLowerCase()))].slice(0,12)
  const fonts = [...new Set([...html.matchAll(/font-family\s*:\s*([^;}]{1,120})/gi)].map((entry) => entry[1]))].slice(0,5)
  $("script,style,noscript,template,svg,iframe,input,textarea,select").remove()
  const anchors=$("section[id],article[id],h1[id],h2[id],h3[id],main[id],div[id]").toArray().slice(0,40).map(element=>({id:$(element).attr("id")??"",title:clean($(element).text()).slice(0,150)}))
  const links = new Map<string,string>()
  $("a[href]").each((_, element) => {
    const target = candidateUrl($(element).attr("href") ?? "", url)
    if (target && links.size < 60) links.set(target, clean($(element).text()).slice(0,100))
  })
  const images = new Map<string,string>()
  $("img").each((_, element) => {
    try {
      const src=$(element).attr("src") || $(element).attr("data-src")
      if(!src)return
      const value = new URL(src,url)
      if (isHttpsUrl(value.href) && images.size < 12 && !/\.svg(?:\?|$)/i.test(value.href)) images.set(value.href,clean($(element).attr("alt") ?? "").slice(0,200))
    } catch { /* Unsupported source images are reported separately. */ }
  })
  $("h1,h2,h3,p,li,section,article,nav,footer,br").each((_, element) => { $(element).append("\n") })
  const text = ($("body").text() || $.root().text()).split(/\n+/).map(clean).filter(Boolean).join("\n").slice(0,16000)
  return { url,title,description,text,links:[...links].map(([url,label]) => ({url,label})),images:[...images].map(([url,alt]) => ({url,alt})),colors,fonts,hasForms,anchors }
}

async function fetchHop(url: URL, signal: AbortSignal): Promise<SourceResponse> {
  signal.throwIfAborted()
  const destination = await new Promise<Awaited<ReturnType<typeof resolveImageDestination>>>((resolve,reject)=>{
    const abort=()=>reject(new Error("Websiteadres controleren duurde te lang."))
    signal.addEventListener("abort",abort,{once:true})
    resolveImageDestination(url).then(resolve,reject).finally(()=>signal.removeEventListener("abort",abort))
  })
  signal.throwIfAborted()
  return new Promise((resolve,reject) => {
    const req=request(url,{agent:false,signal,family:destination.family,
      headers:{Accept:"text/html,text/plain;q=0.8","Accept-Encoding":"identity","User-Agent":SOURCE_AGENT},
      lookup:(_host,_options,callback)=>callback(null,destination.address,destination.family),
    },res=>{
      const status=res.statusCode ?? 0
      if ([301,302,303,307,308].includes(status)) { const location=res.headers.location; res.destroy(); resolve({status,location,text:"",url:url.href,contentType:""}); return }
      if (status!==200) { res.destroy(); resolve({status,text:"",url:url.href,contentType:""}); return }
      if ((res.headers["content-encoding"] && res.headers["content-encoding"]!=="identity") || Number(res.headers["content-length"] ?? 0)>MAX_BYTES) { res.destroy(); reject(new Error("Bronpagina is te groot of gebruikt een niet-ondersteunde codering.")); return }
      const chunks:Buffer[]=[]; let size=0
      res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>MAX_BYTES)res.destroy(new Error("Bronpagina is groter dan 1 MB."));else chunks.push(chunk)})
      res.on("error",()=>reject(new Error("Bronpagina kon niet volledig worden gelezen.")))
      res.on("aborted",()=>reject(new Error("Bronpagina is afgebroken.")))
      res.on("end",()=>resolve({status,text:Buffer.concat(chunks).toString("utf8"),url:url.href,contentType:String(res.headers["content-type"] ?? "")}))
    })
    req.on("error",()=>reject(new Error("De openbare website kon niet veilig worden opgehaald.")));req.end()
  })
}
export async function fetchSource(value: string, outerSignal: AbortSignal, hop=fetchHop, allowed?:(url:string)=>boolean): Promise<SourceResponse> {
  const signal=AbortSignal.any([outerSignal,AbortSignal.timeout(8000)])
  let url=sourceUrl(value)
  const origin=url.origin
  for(let index=0;index<=3;index++) {
    signal.throwIfAborted()
    if(allowed && !allowed(url.href))throw new Error("Deze website staat het ophalen van een gekozen of omgeleide pagina niet toe.")
    const response=await hop(url,signal)
    if(response.location) {
      if(index===3) throw new Error("Te veel websiteomleidingen.")
      url=sourceUrl(response.location,url.href)
      if(url.origin!==origin) throw new Error("De website verwijst naar een ander domein. Gebruik het uiteindelijke HTTPS-adres.")
    } else return {...response,url:url.href}
  }
  throw new Error("Bronpagina ontbreekt.")
}

export async function readSourcePages(value: string, selected?: string[], signal=AbortSignal.timeout(45000), fetcher=fetchSource) {
  const start=sourceUrl(value).href
  const chosen=[...new Set([start,...(selected ?? []).map((url)=>sourceUrl(url).href)])]
  if(chosen.length>MAX_SOURCE_PAGES || chosen.some((url)=>new URL(url).origin!==new URL(start).origin)) throw new Error("Kies maximaal acht pagina's van hetzelfde domein.")
  const robotsUrl=new URL("/robots.txt",start).href
  const robotsResponse=await fetcher(robotsUrl,signal)
  if(robotsResponse.status!==200 && robotsResponse.status!==404) throw new Error("De crawltoestemming kon niet worden gecontroleerd. Probeer het later opnieuw.")
  const robots=robotsParser(robotsUrl,robotsResponse.text)
  const delay=robots.getCrawlDelay(SOURCE_AGENT) ?? 0
  if(delay>3)throw new Error("Deze website vereist een langere crawlpauze. Bereid deze import handmatig voor.")
  const pages:SourcePage[]=[]
  for(const url of chosen) {
    signal.throwIfAborted()
    if(robots.isAllowed(url,SOURCE_AGENT)===false) throw new Error("Deze website staat het ophalen van een gekozen pagina niet toe.")
    if(pages.length>0 && delay>0)await wait(delay*1000,undefined,{signal})
    const response=await fetcher(url,signal,undefined,target=>robots.isAllowed(target,SOURCE_AGENT)!==false)
    if(robots.isAllowed(response.url,SOURCE_AGENT)===false) throw new Error("De omgeleide pagina staat ophalen niet toe.")
    if(response.status!==200 || !/text\/html|application\/xhtml\+xml/i.test(response.contentType)) throw new Error("Een gekozen pagina levert geen openbare HTML. Controleer het adres.")
    const page=extractSourcePage(response.text,response.url)
    if(page.text.length<40) throw new Error("Deze pagina bevat onvoldoende leesbare tekst. JavaScript-only websites moeten handmatig worden voorbereid.")
    if(!pages.some((entry)=>entry.url===page.url)) pages.push(page)
  }
  return pages
}
