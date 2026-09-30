import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {createRequire} from "node:module"
import ts from "typescript"
import {PDFDocument} from "pdf-lib"
const nativeRequire=createRequire(import.meta.url)
function load(file){const module={exports:{}};const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;Function('module','exports','require',js)(module,module.exports,id=>id==='./i18n'?load('lib/quotes/i18n.ts'):nativeRequire(id));return module.exports}
const {portalCopy,portalLocale}=load('lib/quotes/i18n.ts')
const {createQuotePdf}=load('lib/quotes/pdf.ts')
test('every supported locale has a complete customer copy and decision confirmation',()=>{
  const keys=Object.keys(portalCopy('nl-NL')).sort()
  for(const locale of ['nl-NL','en-GB','de-DE','fr-FR']){
    const copy=portalCopy(locale)
    assert.deepEqual(Object.keys(copy).sort(),keys)
    assert.ok(Object.values(copy).every(text=>text.trim().length))
    assert.notEqual(copy.accept,copy.decline)
    assert.equal(portalLocale(locale),locale)
  }
  assert.equal(portalLocale('untrusted'),'nl-NL')
})
test('quote PDF paginates long offers, arbitrary customer text and conditions',async()=>{
  const lines=Array.from({length:100},(_,i)=>({id:String(i),description:'Onderdeel '+i+' '+('langeomschrijving'.repeat(15)),quantity_milli:1000,unit_price_minor:10000,discount_minor:500,vat_rate_basis_points:2100,total_minor:11495}))
  const bytes=await createQuotePdf({locale:'fr-FR',title:'Devis été – 🎨',seller:{legal_name:'Bedrijf'},customer:{name:'Klant 🏠',email:'test@example.com'},lines,subtotalMinor:950000,vatTotalMinor:199500,totalMinor:1149500,terms:'Voorwaarden '.repeat(500)},'O-123-v2','2027-01-01T00:00:00Z')
  assert.equal(Buffer.from(bytes.subarray(0,4)).toString(),'%PDF')
  const document=await PDFDocument.load(bytes)
  assert.ok(document.getPageCount()>3)
  for(const page of document.getPages()){assert.equal(page.getWidth(),595);assert.equal(page.getHeight(),842)}
})
