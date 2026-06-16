import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { InvoiceTemplate } from '../components/invoice/InvoiceTemplate'
import { SubmissionPrintDocumentShell } from '../components/submission/SubmissionPrintView'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import {
  copyElementImageToClipboard,
  copyOrderAndDocumentImageToClipboard,
  downloadOrderAndLetterheadDocumentPdf,
} from '../lib/exportSubmission'
import { formatDocNumber, useNextDocNumber } from '../lib/docNumber'
import { printOrderDocument } from '../lib/printOrderDocument'
import { useInvoicesStore } from '../store/useInvoicesStore'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import {
  INVOICE_PAYMENT_STATUS_OPTIONS,
  type InvoiceFormData,
  type InvoicePaymentStatus,
  type InvoiceRecord,
} from '../types/invoice'
import type { SurveyFormData } from '../types/survey'
import { createEmptyLineItem, type QuotationLineItem, type SewingCost } from '../types/quotation'
import { formatDateDotDMY } from '../lib/dateDisplay'
import { buildLineItemsFromSubmission } from '../lib/quotationLineFromSurvey'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function InvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const prefillFromQuotation = (location.state as { invoiceFromQuotation?: InvoiceFormData } | null)
    ?.invoiceFromQuotation
  const submissions = useSubmissionsStore((s) => s.submissions)
  const submissionsReady = useSubmissionsStore((s) => s.firestoreReady)
  const submission = invoiceId ? submissions.find((s) => s.id === invoiceId) : undefined
  const savedInvoice = useInvoicesStore((s) =>
    invoiceId ? s.invoices.find((i) => i.id === invoiceId) : undefined,
  )
  const firestoreReady = useInvoicesStore((s) => s.firestoreReady)
  const invoicesFirestoreError = useInvoicesStore((s) => s.firestoreError)
  const saveInvoiceToStore = useInvoicesStore((s) => s.saveInvoice)
  const nextDocNumber = useNextDocNumber()

  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate)
  const [dueDate, setDueDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>(() => [createEmptyLineItem()])
  const [sewingCost, setSewingCost] = useState<SewingCost>({ qty: '', unitPrice: '' })
  const [discount, setDiscount] = useState('')
  const [advance, setAdvance] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('unpaid')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const surveyCaptureRef = useRef<HTMLDivElement>(null)
  const invoiceCaptureRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<number>(0)
  const [copiedImage, setCopiedImage] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const appliedSavedSig = useRef<string | null>(null)
  const hydratedSubmissionKey = useRef<string | null>(null)
  const appliedPrefill = useRef(false)

  const resetFormToDefaults = useCallback(() => {
    setInvoiceDate(todayIsoDate())
    setDueDate('')
    setCustomerName('')
    setCustomerAddress('')
    setCustomerMobile('')
    setLineItems([createEmptyLineItem()])
    setSewingCost({ qty: '', unitPrice: '' })
    setDiscount('')
    setAdvance('')
    setPaymentStatus('unpaid')
    setNotes('')
  }, [])

  const hydrateFromInvoiceData = useCallback((d: InvoiceFormData) => {
    setInvoiceDate(d.invoiceDate?.trim() || todayIsoDate())
    setDueDate(d.dueDate ?? '')
    setCustomerName(d.customerName ?? '')
    setCustomerAddress(d.customerAddress ?? '')
    setCustomerMobile(d.customerMobile ?? '')
    setLineItems(d.lineItems?.length ? d.lineItems : [createEmptyLineItem()])
    setSewingCost(d.sewingCost ?? { qty: '', unitPrice: '' })
    setDiscount(d.discount ?? '')
    setAdvance(d.advance ?? '')
    setPaymentStatus(d.paymentStatus ?? 'unpaid')
    setNotes(d.notes ?? '')
  }, [])

  const hydrateFromRecord = useCallback(
    (record: InvoiceRecord) => hydrateFromInvoiceData(record.data),
    [hydrateFromInvoiceData],
  )

  const hydrateFromSubmission = useCallback((data: SurveyFormData) => {
    setInvoiceDate(data.orderDate?.trim() || todayIsoDate())
    setCustomerName(data.ownerName?.trim() || '')
    setCustomerAddress(data.address?.trim() || '')
    setLineItems(buildLineItemsFromSubmission(data))
  }, [])

  useEffect(() => {
    if (!invoiceId) {
      appliedSavedSig.current = null
      hydratedSubmissionKey.current = null
      if (prefillFromQuotation) {
        if (!appliedPrefill.current) {
          hydrateFromInvoiceData(prefillFromQuotation)
          appliedPrefill.current = true
        }
        return
      }
      resetFormToDefaults()
      return
    }

    if (savedInvoice) {
      hydratedSubmissionKey.current = null
      const sig = `${savedInvoice.id}:${savedInvoice.updatedAt}`
      if (appliedSavedSig.current !== sig) {
        hydrateFromRecord(savedInvoice)
        appliedSavedSig.current = sig
      }
      return
    }

    appliedSavedSig.current = null
    const sub = submissions.find((s) => s.id === invoiceId)
    if (sub) {
      if (hydratedSubmissionKey.current !== invoiceId) {
        hydrateFromSubmission(sub.data)
        hydratedSubmissionKey.current = invoiceId
      }
      return
    }

    hydratedSubmissionKey.current = null
  }, [
    invoiceId,
    savedInvoice,
    submissions,
    prefillFromQuotation,
    resetFormToDefaults,
    hydrateFromRecord,
    hydrateFromInvoiceData,
    hydrateFromSubmission,
  ])

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    window.clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  const invoiceDateDisplay = useMemo(() => formatDateDotDMY(invoiceDate), [invoiceDate])
  const dueDateDisplay = useMemo(() => formatDateDotDMY(dueDate), [dueDate])

  // Existing record keeps its number; a new/unnumbered one previews the next shared number.
  const docNumber = savedInvoice?.docNumber ?? nextDocNumber
  const docNumberDisplay = formatDocNumber(docNumber)

  const buildFormData = useCallback((): InvoiceFormData => {
    return {
      invoiceDate,
      dueDate,
      customerName,
      customerAddress,
      customerMobile,
      lineItems,
      sewingCost,
      discount,
      advance,
      paymentStatus,
      notes,
    }
  }, [
    invoiceDate,
    dueDate,
    customerName,
    customerAddress,
    customerMobile,
    lineItems,
    sewingCost,
    discount,
    advance,
    paymentStatus,
    notes,
  ])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const data = buildFormData()
      const id = await saveInvoiceToStore({
        id: invoiceId,
        submissionId: submission?.id ?? null,
        data,
        docNumber: savedInvoice?.docNumber ?? nextDocNumber,
      })
      if (!invoiceId) {
        navigate(`/invoice/${id}`, { replace: true })
      }
      showToast('Invoice saved.', 'success')
    } catch {
      showToast('Could not save invoice. Deploy Firestore rules and check your connection.', 'error')
    } finally {
      setSaving(false)
    }
  }, [
    buildFormData,
    invoiceId,
    navigate,
    saveInvoiceToStore,
    showToast,
    submission?.id,
    savedInvoice?.docNumber,
    nextDocNumber,
  ])

  const addRow = useCallback(() => {
    setLineItems((rows) => [...rows, createEmptyLineItem()])
  }, [])

  const removeRow = useCallback((id: string) => {
    setLineItems((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<Omit<QuotationLineItem, 'id'>>) => {
    setLineItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const handlePrint = useCallback(() => {
    printOrderDocument()
  }, [])

  const invoicePdfBaseName = useMemo(() => {
    const date = invoiceDate?.trim() || todayIsoDate()
    return `invoice-${docNumberDisplay || 'new'}-${date}`
  }, [invoiceDate, docNumberDisplay])

  const handleDownloadPdf = useCallback(async () => {
    const invEl = invoiceCaptureRef.current
    if (!invEl) return
    setDownloadingPdf(true)
    try {
      await downloadOrderAndLetterheadDocumentPdf(
        submission ? surveyCaptureRef.current : null,
        invEl,
        invoicePdfBaseName,
      )
      showToast('PDF downloaded (A4 — same layout as Print: order then invoice).', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create PDF. Try Print or another browser.'
      showToast(message.length > 200 ? `${message.slice(0, 197)}…` : message, 'error')
    } finally {
      setDownloadingPdf(false)
    }
  }, [submission, invoicePdfBaseName, showToast])

  const handleCopyImage = useCallback(async () => {
    const el = invoiceCaptureRef.current
    if (!el) return
    try {
      if (submission && surveyCaptureRef.current) {
        await copyOrderAndDocumentImageToClipboard(surveyCaptureRef.current, el)
        showToast('Order and invoice copied as one image. Paste where images are supported.', 'success')
      } else {
        await copyElementImageToClipboard(el)
        showToast('Invoice copied as image.', 'success')
      }
      setCopiedImage(true)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not copy image. Try Download PDF, Print, or another browser.'
      showToast(message.length > 200 ? `${message.slice(0, 197)}…` : message, 'error')
    } finally {
      window.setTimeout(() => setCopiedImage(false), 2000)
    }
  }, [submission, showToast])

  const backLink = invoiceId ? '/invoices' : '/'

  const notFound = useMemo(() => {
    if (!invoiceId) return false
    if (!firestoreReady || !submissionsReady) return false
    if (savedInvoice) return false
    if (submission) return false
    return true
  }, [invoiceId, firestoreReady, submissionsReady, savedInvoice, submission])

  if (notFound) {
    return (
      <Card className="text-center">
        <p className="text-slate-600">This invoice or order was not found.</p>
        <div className="mt-4">
          <Button to="/invoices" variant="secondary">
            Back to invoices
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to={backLink} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← {invoiceId ? 'Invoices' : 'Dashboard'}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Invoice <span className="text-slate-400">#{docNumberDisplay}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {savedInvoice?.docNumber
              ? 'Number assigned and locked.'
              : `Number ${docNumberDisplay} will be assigned when you save.`}
          </p>
          {invoicesFirestoreError ? (
            <p className="mt-2 text-sm text-red-600">{invoicesFirestoreError}</p>
          ) : null}
        </div>
        <div className="grid w-full max-w-md shrink-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[320px]">
          <Button type="button" className="w-full py-2.5 text-sm shadow-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save invoice'}
          </Button>
          <Button
            type="button"
            className="w-full py-2.5 text-sm shadow-md"
            onClick={() => void handleDownloadPdf()}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Creating PDF…' : 'Download PDF'}
          </Button>
          <Button type="button" variant="secondary" className="w-full py-2.5 text-sm" onClick={handlePrint}>
            Print
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full py-2.5 text-sm"
            onClick={handleCopyImage}
            disabled={copiedImage || downloadingPdf}
          >
            {copiedImage ? 'Copied' : submission ? 'Copy image (order + invoice)' : 'Copy as image'}
          </Button>
        </div>
      </div>

      <Card padding="sm" className="no-print space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice details</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Invoice date" htmlFor="inv-date">
            <Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </FormField>
          <FormField label="Due date" htmlFor="inv-due">
            <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Customer name" htmlFor="inv-name">
            <Input id="inv-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Recipient name" />
          </FormField>
          <FormField label="Mobile" htmlFor="inv-mobile">
            <Input id="inv-mobile" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="e.g. 077 123 4567" />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="inv-addr">
          <Textarea
            id="inv-addr"
            rows={3}
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Customer address"
          />
        </FormField>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Line items</p>
            <Button type="button" variant="secondary" onClick={addRow}>
              Add row
            </Button>
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {lineItems.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end"
              >
                <FormField label={`Description ${index + 1}`} htmlFor={`id-${row.id}`}>
                  <Textarea
                    id={`id-${row.id}`}
                    rows={2}
                    value={row.description}
                    onChange={(e) => updateLine(row.id, { description: e.target.value })}
                  />
                </FormField>
                <FormField label="Qty" htmlFor={`iq-${row.id}`}>
                  <Input id={`iq-${row.id}`} value={row.qty} onChange={(e) => updateLine(row.id, { qty: e.target.value })} />
                </FormField>
                <FormField label="Unit price" htmlFor={`iu-${row.id}`}>
                  <Input
                    id={`iu-${row.id}`}
                    value={row.unitPrice}
                    onChange={(e) => updateLine(row.id, { unitPrice: e.target.value })}
                  />
                </FormField>
                <div className="flex justify-end md:pb-2">
                  <Button type="button" variant="secondary" disabled={lineItems.length <= 1} onClick={() => removeRow(row.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end">
              <FormField label="Sewing cost" htmlFor="isc-desc">
                <div className="flex min-h-[5rem] items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Sewing cost
                </div>
              </FormField>
              <FormField label="Qty" htmlFor="isc-qty">
                <Input id="isc-qty" value={sewingCost.qty} onChange={(e) => setSewingCost((c) => ({ ...c, qty: e.target.value }))} />
              </FormField>
              <FormField label="Unit price" htmlFor="isc-price">
                <Input
                  id="isc-price"
                  value={sewingCost.unitPrice}
                  onChange={(e) => setSewingCost((c) => ({ ...c, unitPrice: e.target.value }))}
                />
              </FormField>
              <div className="md:pb-2" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Discount (amount)" htmlFor="inv-discount">
            <Input id="inv-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 5000" />
          </FormField>
          <FormField label="Advance paid" htmlFor="inv-advance" hint="Balance = total − advance.">
            <Input id="inv-advance" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="e.g. 25000" />
          </FormField>
        </div>

        <FormField label="Payment status" hint="Shown as a badge on the invoice.">
          <div className="flex flex-wrap gap-2">
            {INVOICE_PAYMENT_STATUS_OPTIONS.map((option) => {
              const active = paymentStatus === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentStatus(option.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </FormField>

        <FormField label="Notes" htmlFor="inv-notes">
          <Textarea id="inv-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes shown on the invoice" />
        </FormField>
      </Card>

      {submission ? (
        <div className="quotation-pack-survey-offscreen" aria-hidden>
          <SubmissionPrintDocumentShell submission={submission} printRef={surveyCaptureRef} />
        </div>
      ) : null}

      <div ref={invoiceCaptureRef} className="print:m-0 print:p-0">
        <InvoiceTemplate
          docNumberDisplay={docNumberDisplay}
          invoiceDateDisplay={invoiceDateDisplay}
          dueDateDisplay={dueDateDisplay}
          customerName={customerName}
          customerAddress={customerAddress}
          customerMobile={customerMobile}
          lineItems={lineItems}
          sewingCost={sewingCost}
          discount={discount}
          advance={advance}
          paymentStatus={paymentStatus}
          notes={notes}
        />
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-6 left-1/2 z-[100] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}
