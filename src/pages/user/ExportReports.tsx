
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Sheet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useUserData } from '../../context/UserData'
import { downloadCsv, monthStart, todayStr, ymd } from '../../lib/format'
import { PageLoader, PageTitle } from '../../components/ui'
import type { Expense } from '../../lib/types'

type Kind = 'detailed' | 'category' | 'monthly'
type Format = 'csv' | 'pdf'

const KINDS: {
  key: Kind
  title: string
  desc: string
  cols: string[]
}[] = [
  {
    key: 'detailed',
    title: 'Detailed report',
    desc: 'Every expense in the period, one row each.',
    cols: ['Date', 'Category', 'Note', 'Payment method', 'Amount'],
  },
  {
    key: 'category',
    title: 'Category summary',
    desc: 'Total spent per category with its share of spending.',
    cols: ['Category', 'Total', 'Share (%)', 'Number of expenses'],
  },
  {
    key: 'monthly',
    title: 'Monthly summary',
    desc: 'Total per month with change from the month before.',
    cols: ['Month', 'Total', 'Change (%)', 'Top category'],
  },
]

export default function ExportReports() {
  const { profile } = useAuth()
  const { tracked, catById } = useUserData()
  const [searchParams] = useSearchParams()

  // The URL determines the export format.
  // PDF icon: ?format=pdf
  // CSV icon: ?format=csv
  const format: Format =
    searchParams.get('format') === 'pdf' ? 'pdf' : 'csv'

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1

  const [kind, setKind] = useState<Kind>('detailed')
  const [period, setPeriod] = useState<
    'this' | 'last' | 'year' | 'custom'
  >('this')
  const [cFrom, setCFrom] = useState(monthStart(y, m))
  const [cTo, setCTo] = useState(todayStr())
  const [picked, setPicked] = useState<Set<number>>(
    new Set(tracked.map((c) => c.id))
  )
  const [archived, setArchived] = useState(false)
  const [asked, setAsked] = useState(false)

  const [from, to] =
    period === 'this'
      ? [monthStart(y, m), todayStr()]
      : period === 'last'
        ? [
            monthStart(
              m === 1 ? y - 1 : y,
              m === 1 ? 12 : m - 1
            ),
            ymd(new Date(y, m - 1, 0)),
          ]
        : period === 'year'
          ? [`${y}-01-01`, todayStr()]
          : [cFrom, cTo]

  const rangeBad = !!from && !!to && from > to
  const noCats = picked.size === 0

  const { data, isLoading } = useQuery({
    queryKey: ['export', profile?.id, from, to],
    enabled: !!profile && !rangeBad,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('spent_on', from)
        .lte('spent_on', to)
        .order('spent_on', { ascending: true })

      if (error) throw error

      return (rows as Expense[]).map((e) => ({
        ...e,
        amount: Number(e.amount),
      }))
    },
  })

  const rows = useMemo(() => {
    const list = (data ?? []).filter(
      (e) =>
        picked.has(e.category_id) &&
        (archived || !e.is_archived)
    )

    const name = (id: number) =>
      catById.get(id)?.name ?? ''

    if (kind === 'detailed') {
      return list.map((e) => [
        e.spent_on,
        name(e.category_id),
        e.note ?? '',
        e.payment_method,
        e.amount.toFixed(2),
      ])
    }

    if (kind === 'category') {
      const total = list.reduce(
        (t, e) => t + e.amount,
        0
      )

      const groups = new Map<
        number,
        { total: number; count: number }
      >()

      list.forEach((e) => {
        const current = groups.get(e.category_id)

        groups.set(e.category_id, {
          total: (current?.total ?? 0) + e.amount,
          count: (current?.count ?? 0) + 1,
        })
      })

      return [...groups.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([id, value]) => [
          name(id),
          value.total.toFixed(2),
          total
            ? ((value.total / total) * 100).toFixed(1)
            : '0',
          value.count,
        ])
    }

    const groups = new Map<
      string,
      Map<number, number>
    >()

    list.forEach((e) => {
      const key = e.spent_on.slice(0, 7)
      const inner =
        groups.get(key) ?? new Map<number, number>()

      inner.set(
        e.category_id,
        (inner.get(e.category_id) ?? 0) + e.amount
      )

      groups.set(key, inner)
    })

    let previous: number | null = null

    return [...groups.entries()]
      .sort()
      .map(([key, inner]) => {
        const total = [...inner.values()].reduce(
          (a, b) => a + b,
          0
        )

        const top = [...inner.entries()].sort(
          (a, b) => b[1] - a[1]
        )[0]

        const change =
          previous !== null && previous > 0
            ? (((total - previous) / previous) * 100).toFixed(1)
            : ''

        previous = total

        return [
          key,
          total.toFixed(2),
          change,
          top ? name(top[0]) : '',
        ]
      })
  }, [data, kind, picked, archived, catById])

  const cols = KINDS.find((k) => k.key === kind)!.cols

  const errorText = rangeBad
    ? 'Start date must be before end date.'
    : noCats
      ? 'Select at least one category.'
      : asked && !isLoading && rows.length === 0
        ? 'No data for the selected period.'
        : ''

  const fileName = `trackmo-pakeko-${kind}-${from.slice(0, 7)}.csv`

  const selectedCategories = tracked
    .filter((c) => picked.has(c.id))
    .map((c) => c.name)

  const periodLabel =
    period === 'this'
      ? 'This month'
      : period === 'last'
        ? 'Last month'
        : period === 'year'
          ? 'This year'
          : 'Custom range'

  const canExport =
    !rangeBad &&
    !noCats &&
    !isLoading &&
    rows.length > 0

  const download = () => {
    setAsked(true)

    if (!canExport) return

    downloadCsv(fileName, [cols, ...rows])
  }

  const printPdf = () => {
    setAsked(true)

    if (!canExport) return

    window.print()
  }

  const handleExport = () => {
    if (format === 'csv') {
      download()
    } else {
      printPdf()
    }
  }

  const toggleCat = (id: number) => {
    setPicked((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  if (isLoading && !data) return <PageLoader />

  return (
    <>
      <style>
        {`
          #report-print-area {
            display: none;
          }

          @media print {
            @page {
              size: landscape;
              margin: 12mm;
            }

            body * {
              visibility: hidden !important;
            }

            #report-print-area,
            #report-print-area * {
              visibility: visible !important;
            }

            #report-print-area {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              color: #111827 !important;
              background: white !important;
            }

            #report-print-area table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10pt;
            }

            #report-print-area th,
            #report-print-area td {
              border: 1px solid #d1d5db;
              padding: 7px;
              text-align: left;
              overflow-wrap: anywhere;
            }

            #report-print-area th {
              background: #f3f4f6 !important;
              font-weight: bold;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            #report-print-area tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            #report-print-area h1 {
              font-size: 20pt;
              font-weight: bold;
              margin-bottom: 8px;
            }

            #report-print-area .print-meta {
              margin-bottom: 5px;
              font-size: 10pt;
            }
          }
        `}
      </style>

      <PageTitle
        title={format === 'pdf' ? 'PDF Report' : 'CSV Export'}
        sub={
          format === 'pdf'
            ? 'Print your report or save it as a PDF file.'
            : 'Download your records as a CSV file.'
        }
      >
        <Link to="/app/reports" className="btn">
          Back to Reports
        </Link>
      </PageTitle>

      <section className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => {
          const selected = kind === k.key

          return (
            <label
              key={k.key}
              className={`flex cursor-pointer flex-col gap-2 rounded-xl p-4 ${
                selected
                  ? 'border-2 border-brand bg-[#e6f4f1]'
                  : 'border border-[#cbd3cf] bg-white'
              }`}
            >
              <span className="flex items-center justify-between">
                <b>{k.title}</b>
                <input
                  type="radio"
                  name="kind"
                  checked={selected}
                  onChange={() => setKind(k.key)}
                />
              </span>

              <span className="text-[13px] text-muted">
                {k.desc}
              </span>

              <span className="text-xs text-muted">
                <b>Columns:</b> {k.cols.join(', ')}
              </span>

              {selected && (
                <span className="text-xs font-bold text-brand">
                  Selected
                </span>
              )}
            </label>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card flex flex-col gap-3.5">
          <h2 className="text-base font-bold">Options</h2>

          <div>
            <label htmlFor="period" className="label">
              Period
            </label>

            <select
              id="period"
              className="input"
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as typeof period)
              }
            >
              <option value="this">This month</option>
              <option value="last">Last month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="from" className="label">
                Start date
              </label>
              <input
                id="from"
                type="date"
                className="input"
                value={from}
                disabled={period !== 'custom'}
                onChange={(e) => setCFrom(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="to" className="label">
                End date
              </label>
              <input
                id="to"
                type="date"
                className="input"
                value={to}
                disabled={period !== 'custom'}
                onChange={(e) => setCTo(e.target.value)}
              />
            </div>
          </div>

          <fieldset>
            <legend className="label">Categories</legend>

            <div className="grid grid-cols-2 gap-x-3">
              {tracked.map((c) => (
                <label
                  key={c.id}
                  className="flex min-h-9 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={picked.has(c.id)}
                    onChange={() => toggleCat(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Include archived records
          </label>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Preview</h2>
            <span className="text-[13px] text-muted">
              {format === 'csv'
                ? fileName
                : fileName.replace('.csv', '.pdf')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="th">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j} className="td">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[13px] text-muted">
            Showing {Math.min(5, rows.length)} of {rows.length} rows
          </div>

          {errorText && (
            <div role="alert" className="text-[13px] text-danger">
              {errorText}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary !h-[46px]"
              onClick={handleExport}
              disabled={isLoading || rangeBad || noCats}
            >
              {format === 'csv' ? (
                <>
                  <Sheet size={18} aria-hidden />
                  Download CSV
                </>
              ) : (
                <>
                  <FileText size={18} aria-hidden />
                  Print / Save as PDF
                </>
              )}
            </button>

            <span className="text-[13px] text-muted">
              {format === 'csv'
                ? 'Download your report as a CSV file.'
                : 'Choose Save as PDF in the print window.'}
            </span>
          </div>
        </div>
      </section>

      <div id="report-print-area">
        <h1>
          Track Mo, Pake Ko! —{' '}
          {KINDS.find((k) => k.key === kind)?.title}
        </h1>

        <p className="print-meta">
          <b>Period:</b> {periodLabel} ({from} to {to})
        </p>

        <p className="print-meta">
          <b>Categories:</b>{' '}
          {selectedCategories.length > 0
            ? selectedCategories.join(', ')
            : 'None selected'}
        </p>

        <p className="print-meta">
          <b>Archived records:</b>{' '}
          {archived ? 'Included' : 'Excluded'}
        </p>

        <p className="print-meta">
          <b>Total rows:</b> {rows.length}
        </p>

        <table>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((value, j) => (
                  <td key={j}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
