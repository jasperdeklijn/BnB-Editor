import test from "node:test"
import assert from "node:assert/strict"
import {PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream} from "pdf-lib"
import { loadTypeScript as load } from "./helpers/load-typescript.mjs"
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
  assert.equal(document.getCreator(), "FlexPagina")
  assert.ok(document.getPageCount()>3)
  for(const page of document.getPages()){
    assert.equal(page.getWidth(),595);assert.equal(page.getHeight(),842)
    const contents = page.node.Contents()
    assert.ok(contents instanceof PDFArray)
    const operators = contents.asArray().map(ref => Buffer.from(decodePDFRawStream(document.context.lookup(ref, PDFRawStream)).decode()).toString()).join("\n")
    assert.match(operators, /<466C6578506167696E61>/) // FlexPagina header
    assert.match(operators, /<506F776572656420627920466C6578506167696E61>/) // Footer on every page
  }
})
