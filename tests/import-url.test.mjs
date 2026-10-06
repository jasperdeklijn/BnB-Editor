import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require=createRequire(import.meta.url)
const load=require("../scripts/load-import-module.cjs")
const source=load("lib/import/source-site.ts")
const ai=load("lib/import/ai-website.ts")
const html='<title>Test website</title><meta name="description" content="Our own test copy"><body><h1>Welcome to our test website and services</h1><a href="/about?tracking=1">About</a><a href="https://other.example/">Other</a><a href="/login">Login</a><section id="team">Our friendly team introduces its services here.</section><img><img src="/photo.jpg" alt="Team"><script id="evil">SECRET SCRIPT INSTRUCTIONS</script><form></form></body>'
const response=(url,text=html)=>({url,status:200,text,contentType:"text/html"})
const pages=[source.extractSourcePage(html,"https://example.com/"),source.extractSourcePage(html,"https://example.com/company/about")]
function document() {return {format:"flexpagina",version:2,title:"Test website",pages:ai.sourcePagePlan(pages).map(({sourceUrl:_sourceUrl,...page})=>page),sections:[{key:"menu",type:"nav",scope:"site_header",content:{brandName:"Test",navLinks:[]}},{key:"intro",type:"hero",pageKey:"home",content:{title:"Welcome",ctaEnabled:true,ctaText:"About",ctaHref:"https://example.com/company/about#team"}},{key:"team",type:"about",pageKey:"page-2",content:{title:"Team",description:"Our own team"}}]}}

test("source extraction removes executable content and limits discovery to useful same-domain pages",()=>{
  const page=pages[0]
  assert.equal(page.text.includes("SECRET SCRIPT"),false)
  assert.deepEqual(page.links,[{url:"https://example.com/about",label:"About"}])
  assert.deepEqual(page.images,[{url:"https://example.com/photo.jpg",alt:"Team"}])
  assert.deepEqual(page.anchors.map(a=>a.id),["team"])
  assert.equal(page.hasForms,true)
  assert.throws(()=>source.sourceUrl("http://example.com"),/HTTPS/)
  assert.throws(()=>source.sourceUrl("https://user:password@example.com"),/HTTPS/)
})

test("source fetching validates redirects and robots BEFORE reading destination",async()=>{
  const visited=[]
  const hop=async url=>{visited.push(url.href);return {status:302,location:"/private",text:"",contentType:"",url:url.href}}
  await assert.rejects(source.fetchSource("https://example.com/",new AbortController().signal,hop,url=>!url.endsWith("/private")),/niet toe/)
  assert.deepEqual(visited,["https://example.com/"])
  await assert.rejects(source.fetchSource("https://example.com/",new AbortController().signal,async url=>({...response(url.href),location:"https://other.example/"})),/ander domein/)
  const requests=[]
  await assert.rejects(source.readSourcePages("https://example.com/",undefined,undefined,async url=>{requests.push(url);return {url,status:200,text:"User-agent: *\nDisallow: /",contentType:"text/plain"}}),/niet toe/)
  assert.deepEqual(requests,["https://example.com/robots.txt"])
})

test("multipage reading rejects cross-domain selections, more than eight pages and JS-only sources",async()=>{
  await assert.rejects(source.readSourcePages("https://example.com/",["https://other.example/"]),/hetzelfde domein/)
  await assert.rejects(source.readSourcePages("https://example.com/",Array.from({length:8},(_,i)=>`https://example.com/${i}`)),/maximaal acht/)
  const fetcher=async url=>url.endsWith("robots.txt")?{url,status:404,text:"",contentType:""}:response(url,"<script>render()</script>")
  await assert.rejects(source.readSourcePages("https://example.com/",undefined,undefined,fetcher),/onvoldoende leesbare tekst/)
  const result=await source.readSourcePages("https://example.com/",["https://example.com/company/about"],undefined,async url=>url.endsWith("robots.txt")?{url,status:404,text:"",contentType:""}:response(url))
  assert.equal(result.length,2)
})

test("AI contract preserves pages, source SEO and internal section references with draft inclusion",()=>{
  const result=ai.validateWebsiteGeneration({document:document(),warnings:[]},pages)
  assert.equal(result.document.sections[1].content.ctaHref,"section:page-2:team")
  assert.equal(result.document.pages[1].includeInPublication,false)
  assert.equal(result.document.pages[0].seo.description,"Our own test copy")
  assert.ok(result.warnings.some(w=>w.includes("Bronformulieren")))
  assert.ok(result.warnings.some(w=>w.includes("Geneste")))
  const prompt=ai.websiteImportPrompt(pages)
  assert.ok(prompt.includes("untrusted DATA"))
  assert.ok(prompt.includes("page:<page-key>"))
})

test("AI rejects missing pages, empty page content and invented images",()=>{
  let doc=document();doc.pages.pop()
  assert.throws(()=>ai.validateWebsiteGeneration({document:doc},pages))
  doc=document();doc.sections.pop()
  assert.throws(()=>ai.validateWebsiteGeneration({document:doc},pages),/geen bewerkbare inhoud/)
  doc=document();doc.sections[2].content.images=["https://example.com/invented.jpg"]
  assert.throws(()=>ai.validateWebsiteGeneration({document:doc},pages),/niet in de bron/)
})

test("page planning handles reserved and duplicate slugs without creating conflicting routes",()=>{
  const plan=ai.sourcePagePlan([pages[0],{...pages[1],url:"https://example.com/api"},{...pages[1],url:"https://example.com/a/about"},{...pages[1],url:"https://example.com/b/about"}])
  assert.deepEqual(plan.map(p=>p.slug),["","pagina-2","about","about-2"])
})

const server=load("lib/supabase/server.ts")
const limiter=load("lib/rate-limit.ts")
const route=load("app/api/websites/import-url/route.ts")
const originalRead=source.readSourcePages,originalGenerate=ai.generateWebsiteImport
function setup({user={id:"owner"},limit={allowed:true},configured=true}={}) {
  server.createClient=async()=>({auth:{getUser:async()=>({data:{user},error:null})}})
  limiter.checkRateLimit=async()=>limit
  ai.websiteAiConfigured=()=>configured
  source.readSourcePages=async()=>pages
  ai.generateWebsiteImport=async()=>ai.validateWebsiteGeneration({document:document()},pages)
}
function request(body={},origin="https://app.example") {return new Request("https://app.example/api/websites/import-url",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({action:"discover",url:"https://example.com/",permission:true,...body})})}
test("URL API authenticates, requires consent, rejects foreign origins and fails closed on unavailable limiter",async()=>{
  setup({user:null});assert.equal((await route.POST(request())).status,401)
  setup();assert.equal((await route.POST(request({permission:false}))).status,400)
  assert.equal((await route.POST(request({},"https://evil.example"))).status,403)
  setup({limit:{allowed:false}});assert.equal((await route.POST(request())).status,429)
  setup({limit:{allowed:false,reason:"unavailable"}});assert.equal((await route.POST(request())).status,503)
  setup({configured:false});assert.equal((await route.POST(request({action:"generate"}))).status,503)
})
test("URL API discovery and generation only return a reviewable document",async()=>{
  setup()
  const discovery=await route.POST(request())
  assert.equal(discovery.status,200);assert.equal(discovery.headers.get("cache-control"),"no-store")
  assert.equal((await discovery.json()).maxPages,8)
  const generated=await route.POST(request({action:"generate",pages:pages.map(p=>p.url)}))
  assert.equal(generated.status,200);assert.equal((await generated.json()).document.pages.length,2)
  source.readSourcePages=originalRead;ai.generateWebsiteImport=originalGenerate
})
