/* eslint-disable @typescript-eslint/no-require-imports -- Local controlled provider smoke. */
const fs=require("node:fs")
const load=require("./load-import-module.cjs")
const {extractSourcePage}=load("lib/import/source-site.ts")
const {generateWebsiteImport}=load("lib/import/ai-website.ts")
const sources=[
  extractSourcePage('<title>Testbedrijf</title><meta name="description" content="Een eigen testfixture"><body><h1>Welkom bij Testbedrijf</h1><p>Wij helpen bezoekers hun eigen website helder te presenteren. Deze tekst is uitsluitend een testfixture.</p><a href="/over-ons">Over ons</a></body>',"https://example.com/"),
  extractSourcePage('<title>Over Testbedrijf</title><body><h1>Over ons</h1><p>Ons fictieve team maakt overzichtelijke websites. We werken samen met de eigenaar en controleren iedere pagina voordat deze gepubliceerd wordt.</p><a href="/">Home</a></body>',"https://example.com/over-ons"),
]
generateWebsiteImport(sources,AbortSignal.timeout(110000)).then(result=>{
  fs.mkdirSync("output/ai-website",{recursive:true})
  fs.writeFileSync("output/ai-website/synthetic-provider.json",JSON.stringify(result.document,null,2))
  console.log(JSON.stringify({pages:result.document.pages.length,sections:result.document.sections.length,warnings:result.warnings,generation:result.generation}))
}).catch(error=>{console.error(JSON.stringify({failed:true,name:error.name,message:error.constructor===Error?error.message:undefined,causeName:error.cause?.name,status:error.cause?.statusCode,issues:error.issues?.map(issue=>({path:issue.path,code:issue.code}))}));process.exitCode=1})
