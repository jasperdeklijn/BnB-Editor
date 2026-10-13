import assert from "node:assert/strict"
import test from "node:test"
import ts from "typescript"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const load=createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const analytics=load("lib/analytics/server.ts")
const admin=load("lib/supabase/admin.ts")
const limiter=load("lib/rate-limit.ts")
const site="00000000-0000-0000-0000-000000000011",page="00000000-0000-0000-0000-000000000012"
process.env.ANALYTICS_SIGNING_SECRET='test-secret-with-at-least-thirty-two-characters'
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key'
const deferred=[]
const mod={exports:{}}
const compiled=ts.transpileModule(readFileSync('app/api/analytics/visit/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
Function('module','exports','require',compiled.outputText)(mod,mod.exports,specifier=>{
  if(specifier==='next/server')return {after:fn=>deferred.push(fn),NextResponse:Response}
  return load(specifier.replace('@/','')+'.ts')
})
const token=analytics.createTrackingToken({websiteId:site,pageId:page,host:'customer.example',path:'/about'})
const body=()=>({token,sessionId:crypto.randomUUID(),events:[{id:crypto.randomUUID(),source:'search'}]})
const request=(value=body(),headers={})=>new Request('https://customer.example/api/analytics/visit',{method:'POST',headers:{origin:'https://customer.example',referer:'https://customer.example/about','user-agent':'Mozilla/5.0',...headers},body:typeof value==='string'?value:JSON.stringify(value)})
test('ingest runs one bounded batch after responding and skips bot/abuse/invalid inputs',async()=>{
  let connections=0;const writes=[]
  admin.createAdminClient=async()=>{connections++;return{rpc:async(name,args)=>{writes.push({name,args});return{error:null}}}}
  limiter.checkRateLimit=async()=>({allowed:true})
  const response=await mod.exports.POST(request())
  assert.equal(response.status,204);assert.equal(connections,0);assert.equal(deferred.length,1)
  await deferred.shift()()
  assert.equal(writes.length,1);assert.equal(writes[0].name,'ingest_website_analytics')
  assert.equal(writes[0].args.p_website_id,site);assert.equal(writes[0].args.p_page_id,page)
  assert.match(writes[0].args.p_visitor,/^[a-f0-9]{64}$/);assert.equal(writes[0].args.p_device,'desktop')
  assert.equal(JSON.stringify(writes).includes('customer.example'),false)
  for(const [value,headers,status] of [[{...body(),token:'forged'}, {},204],[body(),{'user-agent':'Googlebot'},204],[body(),{dnt:'1'},204],[body(),{referer:'https://customer.example/editor'},204],['invalid',{},400],['x'.repeat(9000),{},204],[{...body(),events:[{id:'bad',source:'search'}]}, {},400],[{...body(),events:[null]}, {},400],[{...body(),events:Array.from({length:21},()=>body().events[0])},{},204]]) {
    assert.equal((await mod.exports.POST(request(value,headers))).status,status)
    assert.equal(deferred.length,0)
  }
  limiter.checkRateLimit=async()=>({allowed:false})
  assert.equal((await mod.exports.POST(request())).status,204);assert.equal(deferred.length,0)
})
test('backend conversion recording requires valid website consent and never counts a browser click',async()=>{
  const writes=[]
  admin.createAdminClient=async()=>({rpc:async(name,args)=>{writes.push({name,args});return{error:null}}})
  await analytics.recordAnalyticsConversion(request(),'00000000-0000-0000-0000-000000000011','contact',page)
  assert.equal(writes.length,0)
  await analytics.recordAnalyticsConversion(request(body(),{cookie:'fp_analytics_'+site+'='+token}),site,'contact',page)
  assert.equal(writes.length,1);assert.equal(writes[0].name,'record_website_conversion');assert.equal(writes[0].args.p_kind,'contact')
  await analytics.recordAnalyticsConversion(request(body(),{cookie:'fp_analytics_'+site+'='+token}),page,'contact',page)
  assert.equal(writes.length,1)
})
