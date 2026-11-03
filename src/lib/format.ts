export const peso = (n: number) =>
  `₱ ${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`

export const pad = (n: number) => String(n).padStart(2, '0')

/** Local date as YYYY-MM-DD (avoids the UTC shift of toISOString). */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayStr = () => ymd(new Date())

export const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`

/** First day of the month after (y, m), as YYYY-MM-DD. */
export const nextMonthStart = (y: number, m: number) =>
  m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`

export const periodLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export const shortDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

export const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const text = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.'
