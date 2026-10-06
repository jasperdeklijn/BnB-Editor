import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
function load(file, dependencies = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(file),"utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  Function("module","exports","require",compiled.outputText)(module,module.exports,(specifier) => dependencies[specifier] ?? require(specifier))
  return module.exports
}
const helpers = load("lib/website-links.ts")
const { encodeWebsiteLink, parseWebsiteLink, resolveWebsiteLink, safeWebsiteUrl, invalidWebsiteLinks } = helpers
const { resolveNavigationLinks, materializeNavigationTranslationSource, applySectionTranslation } = load("lib/i18n/section-translations.ts")
const pages = [
  {id:"home-id",websiteId:"website",title:"Home",slug:"",isHome:true,position:0,includeInPublication:true,showInNavigation:true,seo:{}},
  {id:"about-id",websiteId:"website",title:"Over ons",slug:"over-ons",isHome:false,position:1,includeInPublication:true,showInNavigation:true,seo:{}},
]

test("page/section references follow path changes and preserve locale and section identity", () => {
  const page = encodeWebsiteLink({type:"page",pageId:"about-id"})
  const section = encodeWebsiteLink({type:"section",pageId:"about-id",sectionId:"team-id"})
  assert.deepEqual(parseWebsiteLink(section),{type:"section",pageId:"about-id",sectionId:"team-id"})
  assert.equal(resolveWebsiteLink(page,pages,"home-id"),"/over-ons")
  assert.equal(resolveWebsiteLink(section,pages,"home-id","en"),"/en/over-ons#section-team-id")
  assert.equal(resolveWebsiteLink(section,pages,"about-id","en"),"#section-team-id")
  assert.equal(resolveWebsiteLink(page,[pages[0],{...pages[1],slug:"team"}],"home-id"),"/team")
  assert.equal(resolveWebsiteLink("page:home-id",pages,"about-id","de"),"/de")
  assert.equal(resolveWebsiteLink("page:deleted",pages,"home-id"),"")
})

test("external/relative/contact URLs are supported and executable or malformed schemes are rejected", () => {
  for (const href of ["https://example.test/path","http://example.test","/contact#formulier","#section-one","mailto:info@example.test","tel:+31612345678"]) {
    assert.equal(safeWebsiteUrl(href),href)
    assert.equal(resolveWebsiteLink(href,pages,"home-id"),href)
  }
  for (const href of ["javascript:alert(1)","data:text/html,hello","//evil.test","/\\evil.test","https://test\n.test","java\tscript:alert(1)","page:","section:no-page"]) assert.equal(safeWebsiteUrl(href),"")
})

test("custom navigation keeps configured page, section and URL links instead of regenerating the current page's sections", () => {
  const nav = {id:"nav",type:"nav",data:{navigationMode:"custom",navLinks:[
    {sectionId:"link-about",label:"Over ons",href:"page:about-id",enabled:true},
    {sectionId:"link-team",label:"Team",href:"section:about-id:team-id",enabled:true},
    {sectionId:"link-hidden",label:"Verborgen",href:"https://example.test",enabled:false},
  ]}}
  const result = resolveNavigationLinks(nav.data,[{id:"hero",type:"hero",data:{title:"Home"}}])
  assert.deepEqual(result,nav.data.navLinks)
  const source = materializeNavigationTranslationSource(nav,[])
  const localized = applySectionTranslation(source,{navLinks:[
    {sectionId:"link-about",label:"About"},{sectionId:"link-team",label:"Team"},{sectionId:"link-hidden",label:"Hidden",href:"javascript:bad"},
  ]})
  assert.equal(localized.data.navLinks[0].href,"page:about-id")
  assert.equal(localized.data.navLinks[0].label,"About")
  assert.equal(localized.data.navLinks[2].enabled,false)
  assert.equal(localized.data.navLinks[2].href,"https://example.test")
})

test("editor links switch tabs, respect modifier clicks, and public links navigate normally", async () => {
  let context
  const calls = []
  const mockedReact = {createContext:()=>({}),useContext:()=>context}
  const { WebsiteLink } = load("components/editor/website-links-context.tsx", {
    react:mockedReact,"@/lib/website-links":helpers,
  })
  context = {pages,activePageId:"home-id",websiteId:"website",localePath:"en",editor:true,navigate:async(...args)=>{calls.push(args);return true}}
  const link = WebsiteLink({href:"section:about-id:team-id",children:"Team"})
  assert.equal(link.props.href,"/editor?websiteId=website&pageId=about-id#section-team-id")
  let prevented = false
  link.props.onClick({button:0,preventDefault:()=>{prevented=true}})
  assert.equal(prevented,true)
  assert.deepEqual(calls,[["about-id","team-id"]])
  prevented = false
  link.props.onClick({button:0,ctrlKey:true,preventDefault:()=>{prevented=true}})
  assert.equal(prevented,false)
  assert.equal(calls.length,1)
  context = {...context,editor:false}
  const published = WebsiteLink({href:"section:about-id:team-id",children:"Team"})
  assert.equal(published.props.href,"/en/over-ons#section-team-id")
  published.props.onClick({button:0,preventDefault:()=>{prevented=true}})
  assert.equal(prevented,false)
  context = {...context,basePath:"/preview/owner-site"}
  assert.equal(WebsiteLink({href:"page:home-id"}).props.href,"/preview/owner-site/en")
  context = {...context,basePath:undefined}
  const external = WebsiteLink({href:"https://example.test",children:"Extern"})
  external.props.onClick({button:0,preventDefault:()=>{prevented=true}})
  assert.equal(prevented,false)
  const missing = WebsiteLink({href:"page:removed",children:"Verwijderd"})
  assert.equal(missing.props.href,undefined)
  missing.props.onClick({button:0,preventDefault:()=>{prevented=true}})
  assert.equal(prevented,true)
})

test("publication rejects removed/excluded pages and sections on the wrong page, including nested CTA/footer links", () => {
  const sections = new Map([["team-id","about-id"],["hero-id","home-id"]])
  assert.deepEqual(invalidWebsiteLinks({navLinks:[{href:"section:about-id:team-id"}],ctaHref:"page:home-id"},pages,sections),[])
  assert.deepEqual(invalidWebsiteLinks({columns:[{links:[{href:"section:home-id:team-id"}]}],plans:[{ctaHref:"page:deleted"}]},pages,sections),["section:home-id:team-id","page:deleted"])
  assert.deepEqual(invalidWebsiteLinks({ctaHref:"page:about-id"},[pages[0]],sections),["page:about-id"])
  assert.deepEqual(invalidWebsiteLinks({ctaHref:"#section-team-id"},pages,sections,"home-id"),["#section-team-id"])
  assert.deepEqual(invalidWebsiteLinks({ctaHref:"#section-hero-id"},pages,sections,"home-id"),[])
})

test("the rendered selector exposes page/section/URL modes and preserves external values", () => {
  const React = require("react")
  const {renderToStaticMarkup} = require("react-dom/server")
  const context = load("components/editor/website-links-context.tsx",{"@/lib/website-links":helpers})
  const { SectionLinkSelect } = load("components/editor/section-link-select.tsx",{
    "./website-links-context":context,"@/lib/website-links":helpers,
    "@/components/ui/input":{Input:(props)=>React.createElement("input",props)},
  })
  const render = (value) => renderToStaticMarkup(React.createElement(context.WebsiteLinksProvider,{value:{pages,activePageId:"home-id",localePath:"",sectionOptions:[{value:"hero-id",label:"Welkom"}]}},
    React.createElement(SectionLinkSelect,{value,onChange:()=>{},options:[],ariaLabel:"Linkdoel"})))
  const page = render("page:about-id")
  for (const mode of ["Pagina","Sectie","Webadres"]) assert.ok(page.includes(mode))
  assert.match(page,/value="about-id" selected=""/)
  assert.ok(page.includes("Doel: /over-ons"))
  const section = render("section:home-id:hero-id")
  assert.match(section,/value="hero-id" selected=""/)
  assert.ok(section.includes("#section-hero-id"))
  assert.ok(render("https://example.test").includes('value="https://example.test"'))
  assert.ok(render("page:deleted").includes("Deze pagina bestaat niet meer"))
})
