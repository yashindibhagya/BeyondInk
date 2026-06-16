import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QuotationTemplate } from '../components/quotation/QuotationTemplate'
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
import { buildLineItemsFromSubmission } from '../lib/quotationLineFromSurvey'
import { formatDocNumber, useNextDocNumber } from '../lib/docNumber'
import { printOrderDocument } from '../lib/printOrderDocument'
import { useQuotationsStore } from '../store/useQuotationsStore'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import type { SurveyFormData } from '../types/survey'
import {
  createEmptyLineItem,
  type QuotationFormData,
  type QuotationLineItem,
  type QuotationRecord,
  type SewingCost,
} from '../types/quotation'
import { invoiceFormFromQuotation } from '../types/invoice'

const DEFAULT_PAYMENT =
  '***A kind request to pay 60% of the total amount as an advance payment, with the balance on delivery.***'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function QuotationPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const submissions = useSubmissionsStore((s) => s.submissions)
  const submissionsReady = useSubmissionsStore((s) => s.firestoreReady)
  const submission = submissionId ? submissions.find((s) => s.id === submissionId) : undefined
  const savedQuotation = useQuotationsStore((s) =>
    submissionId ? s.quotations.find((q) => q.id === submissionId) : undefined,
  )
  const firestoreReady = useQuotationsStore((s) => s.firestoreReady)
  const quotationsFirestoreError = useQuotationsStore((s) => s.firestoreError)
  const saveQuotationToStore = useQuotationsStore((s) => s.saveQuotation)
  const nextDocNumber = useNextDocNumber()

  const [quotationDate, setQuotationDate] = useState(todayIsoDate)
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [subject, setSubject] = useState('')
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>(() => [createEmptyLineItem()])
  const [lineItemsSecondary, setLineItemsSecondary] = useState<QuotationLineItem[]>([])
  const [sewingCost, setSewingCost] = useState<SewingCost>({ qty: '', unitPrice: '' })
  const [sewingCostSecondary, setSewingCostSecondary] = useState<SewingCost>({ qty: '', unitPrice: '' })
  const [discount, setDiscount] = useState('')
  const [discountSecondary, setDiscountSecondary] = useState('')
  const [paymentNote, setPaymentNote] = useState(DEFAULT_PAYMENT)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const surveyCaptureRef = useRef<HTMLDivElement>(null)
  const quotationCaptureRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<number>(0)
  const [copiedImage, setCopiedImage] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const appliedSavedSig = useRef<string | null>(null)
  const hydratedSubmissionKey = useRef<string | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    window.clearTimeout(toastTimerRef.current)
    setToast({ message, type })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }, [])

  const resetFormToDefaults = useCallback(() => {
    setQuotationDate(todayIsoDate())
    setCustomerName('')
    setCustomerAddress('')
    setCustomerMobile('')
    setSubject('')
    setLineItems([createEmptyLineItem()])
    setLineItemsSecondary([])
    setSewingCost({ qty: '', unitPrice: '' })
    setSewingCostSecondary({ qty: '', unitPrice: '' })
    setDiscount('')
    setDiscountSecondary('')
    setPaymentNote(DEFAULT_PAYMENT)
    setNotes('')
  }, [])

  const hydrateFromRecord = useCallback((record: QuotationRecord) => {
    const d = record.data
    setQuotationDate(d.quotationDate?.trim() || todayIsoDate())
    setCustomerName(d.customerName ?? '')
    setCustomerAddress(d.customerAddress ?? '')
    setCustomerMobile(d.customerMobile ?? '')
    setSubject(d.subject ?? '')
    setLineItems(d.lineItems?.length ? d.lineItems : [createEmptyLineItem()])
    setLineItemsSecondary(d.lineItemsSecondary?.length ? d.lineItemsSecondary : [])
    setSewingCost(d.sewingCost ?? { qty: '', unitPrice: '' })
    setSewingCostSecondary(d.sewingCostSecondary ?? { qty: '', unitPrice: '' })
    setDiscount(d.discount ?? '')
    setDiscountSecondary(d.discountSecondary ?? '')
    setPaymentNote(d.paymentNote?.trim() ? d.paymentNote : DEFAULT_PAYMENT)
    setNotes(d.notes ?? '')
  }, [])

  const hydrateFromSubmission = useCallback((data: SurveyFormData) => {
    setQuotationDate(data.orderDate?.trim() || todayIsoDate())
    setCustomerName(data.ownerName?.trim() || '')
    setCustomerAddress(data.address?.trim() || '')
    const subj = [data.printType, data.orderName].filter(Boolean).join(' – ')
    setSubject(subj ? subj.toUpperCase() : 'ITEMS')
    setLineItems(buildLineItemsFromSubmission(data))
    setLineItemsSecondary([])
  }, [])

  useEffect(() => {
    if (!submissionId) {
      appliedSavedSig.current = null
      hydratedSubmissionKey.current = null
      resetFormToDefaults()
      return
    }

    if (savedQuotation) {
      hydratedSubmissionKey.current = null
      const sig = `${savedQuotation.id}:${savedQuotation.updatedAt}`
      if (appliedSavedSig.current !== sig) {
        hydrateFromRecord(savedQuotation)
        appliedSavedSig.current = sig
      }
      return
    }

    appliedSavedSig.current = null
    if (submission) {
      if (hydratedSubmissionKey.current !== submissionId) {
        hydrateFromSubmission(submission.data)
        hydratedSubmissionKey.current = submissionId
      }
      return
    }

    hydratedSubmissionKey.current = null
  }, [
    submissionId,
    savedQuotation,
    submission,
    resetFormToDefaults,
    hydrateFromRecord,
    hydrateFromSubmission,
  ])

  const docNumber = savedQuotation?.docNumber ?? nextDocNumber
  const docNumberDisplay = formatDocNumber(docNumber)

  const addRow = useCallback(() => {
    setLineItems((rows) => [...rows, createEmptyLineItem()])
  }, [])

  const removeRow = useCallback((id: string) => {
    setLineItems((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }, [])

  const updateLine = useCallback((id: string, patch: Partial<Omit<QuotationLineItem, 'id'>>) => {
    setLineItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addSecondaryRow = useCallback(() => {
    setLineItemsSecondary((rows) => [...rows, createEmptyLineItem()])
  }, [])

  const removeSecondaryRow = useCallback((id: string) => {
    setLineItemsSecondary((rows) => rows.filter((r) => r.id !== id))
  }, [])

  const updateSecondaryLine = useCallback((id: string, patch: Partial<Omit<QuotationLineItem, 'id'>>) => {
    setLineItemsSecondary((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const enableSecondQuotation = useCallback(() => {
    setLineItemsSecondary((rows) => (rows.length ? rows : [createEmptyLineItem()]))
  }, [])

  const disableSecondQuotation = useCallback(() => {
    setLineItemsSecondary([])
    setSewingCostSecondary({ qty: '', unitPrice: '' })
    setDiscountSecondary('')
  }, [])

  const handlePrint = useCallback(() => {
    printOrderDocument()
  }, [])

  const quotationPdfBaseName = useMemo(() => {
    const date = quotationDate?.trim() || todayIsoDate()
    const subj = subject?.trim().replace(/\s+/g, '-') || 'quotation'
    return `quotation-${docNumberDisplay || 'new'}-${date}-${subj}`
  }, [quotationDate, subject, docNumberDisplay])

  const buildFormData = useCallback((): QuotationFormData => {
    return {
      quotationDate,
      customerName,
      customerAddress,
      customerMobile,
      subject,
      lineItems,
      lineItemsSecondary,
      sewingCost,
      sewingCostSecondary,
      discount,
      discountSecondary,
      paymentNote,
      notes,
    }
  }, [
    quotationDate,
    customerName,
    customerAddress,
    customerMobile,
    subject,
    lineItems,
    lineItemsSecondary,
    sewingCost,
    sewingCostSecondary,
    discount,
    discountSecondary,
    paymentNote,
    notes,
  ])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const data = buildFormData()
      const id = await saveQuotationToStore({
        id: submissionId,
        submissionId: submission?.id ?? null,
        data,
        docNumber: savedQuotation?.docNumber ?? nextDocNumber,
      })
      if (!submissionId) {
        navigate(`/quotation/${id}`, { replace: true })
      }
      showToast('Quotation saved.', 'success')
    } catch {
      showToast('Could not save quotation. Deploy Firestore rules and check your connection.', 'error')
    } finally {
      setSaving(false)
    }
  }, [
    buildFormData,
    navigate,
    saveQuotationToStore,
    showToast,
    submission?.id,
    submissionId,
    savedQuotation?.docNumber,
    nextDocNumber,
  ])

  const handleCreateInvoice = useCallback(() => {
    navigate('/invoice', {
      state: { invoiceFromQuotation: invoiceFormFromQuotation(buildFormData()) },
    })
  }, [navigate, buildFormData])

  const handleDownloadPdf = useCallback(async () => {
    const qEl = quotationCaptureRef.current
    if (!qEl) return
    setDownloadingPdf(true)
    try {
      await downloadOrderAndLetterheadDocumentPdf(
        submission ? surveyCaptureRef.current : null,
        qEl,
        quotationPdfBaseName,
      )
      showToast('PDF downloaded (same layout as Print: A4, order then quotation).', 'success')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create PDF. Try Print or another browser.'
      showToast(message.length > 200 ? `${message.slice(0, 197)}…` : message, 'error')
    } finally {
      setDownloadingPdf(false)
    }
  }, [submission, quotationPdfBaseName, showToast])

  const handleCopyImage = useCallback(async () => {
    const qEl = quotationCaptureRef.current
    if (!qEl) return
    try {
      if (submission && surveyCaptureRef.current) {
        await copyOrderAndDocumentImageToClipboard(surveyCaptureRef.current, qEl)
        showToast('Order and quotation copied as one image. Paste where images are supported.', 'success')
      } else {
        await copyElementImageToClipboard(qEl)
        showToast('Quotation copied as image.', 'success')
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

  const backLink = submissionId ? '/quotations' : '/'

  const missingSubmission = useMemo(() => {
    if (!submissionId) return false
    if (!firestoreReady || !submissionsReady) return false
    if (savedQuotation) return false
    if (submission) return false
    return true
  }, [submissionId, firestoreReady, submissionsReady, savedQuotation, submission])

  if (missingSubmission) {
    return (
      <Card className="text-center">
        <p className="text-slate-600">This order was not found.</p>
        <div className="mt-4">
          <Button to="/quotations" variant="secondary">
            Back to quotations
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
            ← {submissionId ? 'Quotations' : 'Dashboard'}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Quotation <span className="text-slate-400">#{docNumberDisplay}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {savedQuotation?.docNumber
              ? 'Number assigned and locked.'
              : `Number ${docNumberDisplay} will be assigned when you save.`}
          </p>
          {quotationsFirestoreError ? (
            <p className="mt-2 text-sm text-red-600">{quotationsFirestoreError}</p>
          ) : null}
        </div>
        <div className="grid w-full max-w-md shrink-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[320px]">
          <Button type="button" className="w-full py-2.5 text-sm shadow-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save quotation'}
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
            disabled={copiedImage}
          >
            {copiedImage ? 'Copied' : submission ? 'Copy image (order + quotation)' : 'Copy as image'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="col-span-2 w-full py-2.5 text-sm"
            onClick={handleCreateInvoice}
          >
            Create invoice from this quotation
          </Button>
        </div>
      </div>

      <Card padding="sm" className="no-print space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quotation details</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Date" htmlFor="q-date">
            <Input id="q-date" type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} />
          </FormField>
          <FormField label="Subject (Quotation for)" htmlFor="q-subject">
            <Input id="q-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. BANNERS" />
          </FormField>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Customer name" htmlFor="q-name">
            <Input id="q-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Recipient name" />
          </FormField>
          <FormField label="Mobile" htmlFor="q-mobile">
            <Input id="q-mobile" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} placeholder="e.g. 077 123 4567" />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="q-addr">
          <Textarea
            id="q-addr"
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
              <div key={row.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end">
                <FormField label={`Description ${index + 1}`} htmlFor={`d-${row.id}`}>
                  <Textarea
                    id={`d-${row.id}`}
                    rows={2}
                    value={row.description}
                    onChange={(e) => updateLine(row.id, { description: e.target.value })}
                  />
                </FormField>
                <FormField label="Qty" htmlFor={`q-${row.id}`}>
                  <Input id={`q-${row.id}`} value={row.qty} onChange={(e) => updateLine(row.id, { qty: e.target.value })} />
                </FormField>
                <FormField label="Unit price" htmlFor={`u-${row.id}`}>
                  <Input id={`u-${row.id}`} value={row.unitPrice} onChange={(e) => updateLine(row.id, { unitPrice: e.target.value })} />
                </FormField>
                <div className="flex justify-end md:pb-2">
                  <Button type="button" variant="secondary" disabled={lineItems.length <= 1} onClick={() => removeRow(row.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end">
              <FormField label="Sewing cost" htmlFor="sc-desc">
                <div className="flex min-h-[5rem] items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Sewing cost
                </div>
              </FormField>
              <FormField label="Qty" htmlFor="sc-qty">
                <Input id="sc-qty" value={sewingCost.qty} onChange={(e) => setSewingCost((c) => ({ ...c, qty: e.target.value }))} />
              </FormField>
              <FormField label="Unit price" htmlFor="sc-price">
                <Input id="sc-price" value={sewingCost.unitPrice} onChange={(e) => setSewingCost((c) => ({ ...c, unitPrice: e.target.value }))} />
              </FormField>
              <div className="md:pb-2" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Second option (separate total)</p>
            {lineItemsSecondary.length > 0 ? (
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={addSecondaryRow}>
                  Add row
                </Button>
                <Button type="button" variant="secondary" onClick={disableSecondQuotation}>
                  Remove section
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={enableSecondQuotation}>
                Add second option
              </Button>
            )}
          </div>

          {lineItemsSecondary.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              {lineItemsSecondary.map((row, index) => (
                <div key={row.id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end">
                  <FormField label={`Description ${index + 1}`} htmlFor={`d2-${row.id}`}>
                    <Textarea
                      id={`d2-${row.id}`}
                      rows={2}
                      value={row.description}
                      onChange={(e) => updateSecondaryLine(row.id, { description: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Qty" htmlFor={`q2-${row.id}`}>
                    <Input id={`q2-${row.id}`} value={row.qty} onChange={(e) => updateSecondaryLine(row.id, { qty: e.target.value })} />
                  </FormField>
                  <FormField label="Unit price" htmlFor={`u2-${row.id}`}>
                    <Input id={`u2-${row.id}`} value={row.unitPrice} onChange={(e) => updateSecondaryLine(row.id, { unitPrice: e.target.value })} />
                  </FormField>
                  <div className="flex justify-end md:pb-2">
                    <Button type="button" variant="secondary" onClick={() => removeSecondaryRow(row.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_5rem_7rem_auto] md:items-end">
                <FormField label="Sewing cost" htmlFor="sc2-desc">
                  <div className="flex min-h-[5rem] items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Sewing cost
                  </div>
                </FormField>
                <FormField label="Qty" htmlFor="sc2-qty">
                  <Input id="sc2-qty" value={sewingCostSecondary.qty} onChange={(e) => setSewingCostSecondary((c) => ({ ...c, qty: e.target.value }))} />
                </FormField>
                <FormField label="Unit price" htmlFor="sc2-price">
                  <Input id="sc2-price" value={sewingCostSecondary.unitPrice} onChange={(e) => setSewingCostSecondary((c) => ({ ...c, unitPrice: e.target.value }))} />
                </FormField>
                <div className="md:pb-2" />
              </div>
              <FormField label="Second option discount (amount)" htmlFor="q-discount-2">
                <Input id="q-discount-2" value={discountSecondary} onChange={(e) => setDiscountSecondary(e.target.value)} placeholder="e.g. 5000" />
              </FormField>
            </div>
          ) : null}
        </div>

        <FormField
          label={lineItemsSecondary.length > 0 ? 'First option discount (amount)' : 'Discount (amount)'}
          htmlFor="q-discount"
        >
          <Input id="q-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 5000" />
        </FormField>

        <FormField label="Payment terms" htmlFor="q-pay">
          <Textarea id="q-pay" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
        </FormField>
        <FormField label="Notes" htmlFor="q-notes">
          <Textarea id="q-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes shown on the quotation" />
        </FormField>
      </Card>

      {submission ? (
        <div className="quotation-pack-survey-offscreen" aria-hidden>
          <SubmissionPrintDocumentShell submission={submission} printRef={surveyCaptureRef} />
        </div>
      ) : null}

      <div ref={quotationCaptureRef} className="print:m-0 print:p-0">
        <QuotationTemplate
          docNumberDisplay={docNumberDisplay}
          quotationDate={quotationDate}
          customerName={customerName}
          customerAddress={customerAddress}
          customerMobile={customerMobile}
          subject={subject}
          lineItems={lineItems}
          lineItemsSecondary={lineItemsSecondary}
          sewingCost={sewingCost}
          sewingCostSecondary={sewingCostSecondary}
          discount={discount}
          discountSecondary={discountSecondary}
          paymentNote={paymentNote}
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
