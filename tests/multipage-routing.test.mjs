import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
const load = createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const { resolveWebsiteRoute, snapshotRedirect, customerSiteBase } = load("lib/website-routing.ts")
const pages = [{ id: "home", slug: "", isHome: true }, { id: "about", slug: "about", isHome: false }]
const locales = [{ locale: "nl-NL", pathSegment: "nl", isDefault: true }, { locale: "en-GB", pathSegment: "en", isDefault: false }]

test("imported footer references are validated and remapped across pages", () => {
  const { parseImport, normalizeImport } = load("lib/import/schema.ts")
  const input = { format: "flexpagina", version: 2, title: "Import", pages: [{key:"home",title:"Home",slug:"",isHome:true},{key:"about",title:"About",slug:"about"}], sections: [
    {key:"about-content",type:"about",pageKey:"about",content:{title:"About",description:"Details"}},
    {key:"footer",type:"footer",scope:"site_footer",content:{companyName:"Company",columns:[{title:"Links",links:[{label:"About",href:"section:about:about-content"}]}]}},
  ] }
  let next=0
  const result=normalizeImport(parseImport(JSON.stringify(input)),()=>`id-${++next}`)
  assert.equal(result.sections[1].data.columns[0].links[0].href,`section:${result.pages[1].id}:${result.sections[0].id}`)
  input.sections[1].content.columns[0].links[0].href="page:missing"
  assert.throws(()=>parseImport(JSON.stringify(input)),/ontbrekende pagina/)
})

test("root, page and translated paths resolve the same stable page identities", () => {
  for (const [path,id,locale] of [[[],"home","nl-NL"],[["about"],"about","nl-NL"],[["en"],"home","en-GB"],[["en","about"],"about","en-GB"]]) {
    const result = resolveWebsiteRoute(pages,locales,path)
    assert.equal(result.page.id,id); assert.equal(result.locale.locale,locale)
  }
  for (const path of [["de"],["de","about"],["nl"],["missing"],["en","missing"],["about","nested"]]) assert.equal(resolveWebsiteRoute(pages,locales,path),null)
})

test("redirects use published page identity and locale, and platform bases cannot steal customer paths", () => {
  const snapshot = { pages,locales,redirects:[{fromSlug:"old-about",toPageId:"about"}] }
  assert.equal(snapshotRedirect(snapshot,["old-about"]),"/about")
  assert.equal(snapshotRedirect(snapshot,["en","old-about"]),"/en/about")
  assert.equal(customerSiteBase("customer","flexpagina.nl"),"/site/customer")
  assert.equal(customerSiteBase("customer","localhost:3000",true),"/preview/customer")
  assert.equal(customerSiteBase("customer","customer.flexpagina.nl"),"")
  assert.equal(customerSiteBase("customer","www.customer.example"),"")
})

test("multipage imports assign fresh IDs, typed targets and explicit shared slots", () => {
  const { parseImport, normalizeImport } = load("lib/import/schema.ts")
  const input = { format:"flexpagina",version:2,title:"Site",pages:[{key:"home",title:"Home",slug:"",isHome:true},{key:"about",title:"About",slug:"about"}],sections:[
    {key:"menu",type:"nav",scope:"site_header",content:{brandName:"Site",navLinks:[]}},
    {key:"hero",type:"hero",pageKey:"home",content:{title:"Home",ctaHref:"section:about:about-content"}},
    {key:"about-content",type:"about",pageKey:"about",content:{title:"About",description:"Details"}},
  ] }
  let counter=0
  const normalized=normalizeImport(parseImport(JSON.stringify(input)),()=>`fresh-${++counter}`)
  assert.equal(normalized.pages.length,2)
  assert.equal(normalized.sections[0].scope,"site_header")
  assert.equal(normalized.sections[1].data.ctaHref,`section:${normalized.pages[1].id}:${normalized.sections[2].id}`)
  assert.equal(normalized.sections[2].pageId,normalized.pages[1].id)
  assert.throws(()=>parseImport(JSON.stringify({...input,pages:input.pages.map(page=>({...page,isHome:false}))})),/startpagina/)
})
