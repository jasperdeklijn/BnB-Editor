import assert from 'node:assert/strict'
import test from 'node:test'
import {createRequire} from 'node:module'
const load=createRequire(import.meta.url)('../scripts/load-import-module.cjs')
const {readAllQueryRows}=load('lib/supabase/pagination.ts')
test('large page collections remain complete under a low hosted row cap',async()=>{
  const rows=Array.from({length:1201},(_,id)=>({id}));const offsets=[]
  const query={range(from,to){offsets.push(from);return Promise.resolve({data:rows.slice(from,Math.min(from+100,to+1)),count:rows.length,error:null})}}
  const result=await readAllQueryRows(query)
  assert.deepEqual(result.data,rows);assert.equal(offsets.length,13)
})
test('a failed later batch cannot produce a partial publication snapshot',async()=>{
  const query={range(from){return Promise.resolve({data:from?null:[{id:1}],count:2,error:from?{message:'Database unavailable'}:null})}}
  await assert.rejects(readAllQueryRows(query),/Database unavailable/)
})
