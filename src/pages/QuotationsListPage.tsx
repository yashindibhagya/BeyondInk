import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { formatDateDotDMY, formatDateTimeDotDMY } from '../lib/dateDisplay'
import { firebaseDb } from '../lib/firebase'
import { getCurrentFinancialYearLabel, isWithinLastNDays } from '../lib/financialYear'
import { useQuotationsStore } from '../store/useQuotationsStore'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import type { QuotationRecord } from '../types/quotation'
import { invoiceFormFromQuotation } from '../types/invoice'
import type { Submission } from '../types/survey'

const PRINT_TYPE_OPTIONS = ['All', 'Embroidery', 'Sublimation', 'Screen Print', 'Sticker']

function cardLines(q: QuotationRecord, submissionById: Map<string, Submission>) {
  const sub = q.submissionId ? submissionById.get(q.submissionId) : undefined
  if (sub) {
    return {
      title: sub.data.orderName,
      subtitle: `Job: ${sub.data.jobNo} - ${sub.data.ownerName}`,
      metaType: sub.data.printType || 'No type',
    }
  }
  const firstAddrLine =
    q.data.customerAddress
      ?.split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? ''
  const subjectLabel = q.data.subject?.trim() || ''
  return {
    title: firstAddrLine || subjectLabel || 'Standalone quotation',
    subtitle: q.submissionId ? 'Linked order not found' : 'No linked order',
    metaType: '—',
  }
}

export function QuotationsListPage() {
  const quotations = useQuotationsStore((s) => s.quotations)
  const deleteQuotation = useQuotationsStore((s) => s.deleteQuotation)
  const firestoreReady = useQuotationsStore((s) => s.firestoreReady)
  const firestoreError = useQuotationsStore((s) => s.firestoreError)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [printType, setPrintType] = useState('All')
  const [timeFilter, setTimeFilter] = useState('all')
  const currentFinancialYear = useMemo(() => getCurrentFinancialYearLabel(), [])

  const financialYearOptions = useMemo(() => {
    const years = new Set<string>()
    for (const q of quotations) {
      if (q.financialYear?.trim()) years.add(q.financialYear)
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [quotations])

  const submissionById = useMemo(() => {
    const m = new Map<string, (typeof submissions)[0]>()
    for (const s of submissions) m.set(s.id, s)
    return m
  }, [submissions])

  const filtered = useMemo(() => {
    let list = [...quotations]
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((quot) => {
        const addr = (quot.data.customerAddress ?? '').toLowerCase()
        const subject = (quot.data.subject ?? '').toLowerCase()
        const desc0 = quot.data.lineItems?.[0]?.description?.toLowerCase() ?? ''
        if (addr.includes(q) || subject.includes(q) || desc0.includes(q) || quot.id.toLowerCase().includes(q))
          return true
        const sub = quot.submissionId ? submissionById.get(quot.submissionId) : undefined
        if (!sub) return false
        const d = sub.data
        return (
          d.orderName.toLowerCase().includes(q) ||
          d.jobNo.toLowerCase().includes(q) ||
          d.ownerName.toLowerCase().includes(q) ||
          d.fabric.toLowerCase().includes(q)
        )
      })
    }
    if (printType !== 'All') {
      list = list.filter((quot) => {
        if (!quot.submissionId) return false
        const sub = submissionById.get(quot.submissionId)
        return sub?.data.printType.toLowerCase().includes(printType.toLowerCase())
      })
    }
    if (timeFilter === 'last7days') {
      list = list.filter((quot) => isWithinLastNDays(quot.updatedAt, 7))
    } else if (timeFilter === 'previousFy') {
      list = list.filter((quot) => quot.financialYear !== currentFinancialYear)
    } else if (timeFilter.startsWith('fy:')) {
      const year = timeFilter.slice(3)
      list = list.filter((quot) => quot.financialYear === year)
    }
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return list
  }, [quotations, submissionById, query, printType, timeFilter, currentFinancialYear])

  if (firebaseDb && !firestoreReady) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quotations</h1>
        <Card className="text-center py-12">
          <p className="text-slate-600">Loading quotations from Firebase…</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {firestoreError ? (
        <Card className="border-amber-200 bg-amber-50 py-3 text-sm text-amber-900">
          Firebase (quotations): {firestoreError}. Deploy Firestore rules (
          <code className="rounded bg-amber-100 px-1">firebase deploy --only firestore:rules</code>) and confirm the
          database exists.
        </Card>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Quotations</h1>
          <p className="mt-1 text-sm text-slate-600">
            {filtered.length} of {quotations.length} shown
            {firebaseDb ? ' — saved in Firestore.' : ' — stored only on this device.'}
          </p>
        </div>
        <Button to="/quotation">+ New quotation</Button>
      </div>

      <Card padding="sm" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q-search" className="mb-1 block text-xs font-medium text-slate-500">
              Search
            </label>
            <Input
              id="q-search"
              placeholder="Customer address, Subject, Order name, Job No, Owner, Fabric"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="q-filter-print" className="mb-1 block text-xs font-medium text-slate-500">
              Print type
            </label>
            <Select id="q-filter-print" value={printType} onChange={(e) => setPrintType(e.target.value)}>
              {PRINT_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="q-filter-time" className="mb-1 block text-xs font-medium text-slate-500">
              Time range
            </label>
            <Select id="q-filter-time" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="all">All records</option>
              <option value="last7days">Last 7 days</option>
              <option value="previousFy">Previous financial years</option>
              <option value={`fy:${currentFinancialYear}`}>Current financial year ({currentFinancialYear})</option>
              {financialYearOptions
                .filter((year) => year !== currentFinancialYear)
                .map((year) => (
                  <option key={year} value={`fy:${year}`}>
                    Previous FY ({year})
                  </option>
                ))}
            </Select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-600">
            {quotations.length === 0
              ? 'No quotations yet. Open a quotation from an order or create one with New quotation, then save.'
              : 'No matches for your filters.'}
          </p>
          {quotations.length === 0 ? (
            <div className="mt-4">
              <Button to="/quotation">New quotation</Button>
            </div>
          ) : null}
        </Card>
      ) : (
        <ul className="space-y-3">
          {filtered.map((quot) => {
            const lines = cardLines(quot, submissionById)
            const linkedOrder = quot.submissionId ? submissionById.get(quot.submissionId) : undefined
            const dateLabel = formatDateDotDMY(quot.data.quotationDate?.trim() || quot.createdAt.slice(0, 10))
            return (
              <li key={quot.id}>
                <Card padding="sm" className="transition hover:border-slate-300">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link to={`/quotation/${quot.id}`} className="min-w-0 flex-1 group">
                      <p className="font-medium text-slate-900 group-hover:text-blue-600">
                        {quot.docNumber ? <span className="mr-1.5 text-slate-400">#{quot.docNumber}</span> : null}
                        {lines.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">{lines.subtitle}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {lines.metaType} · Quotation {dateLabel} — updated {formatDateTimeDotDMY(quot.updatedAt)}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button to={`/quotation/${quot.id}`} variant="secondary">
                        View
                      </Button>
                      {linkedOrder ? (
                        <Button to={`/submission/${quot.submissionId}/edit`} variant="secondary">
                          Edit
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled>
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate('/invoice', {
                            state: { invoiceFromQuotation: invoiceFormFromQuotation(quot.data) },
                          })
                        }
                      >
                        Create invoice
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (!window.confirm('Delete this quotation? This cannot be undone.')) return
                          void deleteQuotation(quot.id).catch(() => {
                            window.alert('Could not delete. Check Firebase rules and your connection.')
                          })
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
