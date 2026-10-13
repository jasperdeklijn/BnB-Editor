interface QueryBatch<T> { data: T[] | null; error: { message: string } | null; count?: number | null }
/** Callers request an exact count so a hosted max_rows below 500 cannot truncate results. */
export async function readAllQueryRows<T>(query: { range(from: number, to: number): PromiseLike<QueryBatch<T>> }): Promise<QueryBatch<T> & { data: T[] }> {
  const rows: T[] = []
  for (let offset = 0; ; ) {
    const batch = await query.range(offset, offset + 499)
    if (batch.error) throw new Error(batch.error.message)
    const data = batch.data ?? []
    rows.push(...data)
    offset += data.length
    if (!data.length || (batch.count != null ? offset >= batch.count : data.length < 500)) return {data: rows,error:null}
  }
}
