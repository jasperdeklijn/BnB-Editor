import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
const load=createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { buildWebsiteLiveSnapshot,isWebsiteLiveSnapshot }=load("lib/website-snapshot.ts")

test("publication assembles included pages and shared content, excludes draft copy and rejects dependencies on it",async()=>{
  const tables={
    websites:[{id:"site",user_id:"owner",business_id:null,title:"Site",slug:"site",seo:{title:"Default SEO"},theme_config:null,draft_version:"revision"}],
    businesses:[], website_locales:[{website_id:"site",locale:"nl-NL",path_segment:"nl",display_name:"Dutch",is_default:true,is_enabled:true,seo:{}}],
    website_pages:[{id:"home",website_id:"site",title:"Home",slug:"",is_home:true,position:0,show_in_navigation:true,include_in_publication:true,seo:{}},{id:"about",website_id:"site",title:"About",slug:"about",is_home:false,position:1,show_in_navigation:true,include_in_publication:true,seo:{title:"About SEO"}},{id:"draft",website_id:"site",title:"Draft",slug:"draft",is_home:false,position:2,include_in_publication:false,seo:{}}],
    website_sections:[{id:"header",website_id:"site",page_id:null,scope:"site_header",type:"nav",position:0,content:{navigationMode:"pages",brandName:"Brand"}},{id:"intro",website_id:"site",page_id:"home",scope:"page",type:"hero",position:1,content:{title:"Home",ctaEnabled:true,ctaHref:"page:about"}},{id:"about-intro",website_id:"site",page_id:"about",scope:"page",type:"hero",position:1,content:{title:"About",recipientEmail:"private@example.test"}},{id:"draft-intro",website_id:"site",page_id:"draft",scope:"page",type:"hero",position:1,content:{ctaEnabled:true,ctaHref:"page:missing"}}],
    section_transitions:[],website_section_translations:[],website_page_translations:[],website_page_redirects:[],
  }
  const supabase={from(table){let rows=tables[table]??[];const query={select(){return query},eq(key,value){rows=rows.filter(row=>row[key]===value);return query},or(){return query},order(){return query},limit(count){rows=rows.slice(0,count);return query},single(){return Promise.resolve({data:rows[0]??null,error:null})},maybeSingle(){return query.single()},then(resolve,reject){return Promise.resolve({data:rows,error:null}).then(resolve,reject)}};return query}}
  const snapshot=await buildWebsiteLiveSnapshot({supabase,websiteId:"site",userId:"owner"})
  assert.equal(isWebsiteLiveSnapshot(snapshot),true)
  assert.deepEqual(snapshot.pages.map(page=>page.id),["home","about"])
  assert.deepEqual(snapshot.sections.map(section=>section.id),["header","intro","about-intro"])
  assert.equal(snapshot.pages[1].locales[0].seo.title,"About SEO")
  assert.equal(snapshot.pages[1].sections[0].data.recipientEmail,undefined)
  tables.website_sections[1].content.ctaHref="page:draft"
  await assert.rejects(buildWebsiteLiveSnapshot({supabase,websiteId:"site",userId:"owner"}),/conceptpagina/)
  assert.equal(snapshot.pages[0].sections[0].data.ctaHref,"page:about")
})
