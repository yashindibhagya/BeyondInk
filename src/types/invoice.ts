import {
  createEmptyLineItem,
  type QuotationFormData,
  type QuotationLineItem,
  type SewingCost,
} from './quotation'

export type InvoicePaymentStatus = 'unpaid' | 'advance' | 'paid'

export const INVOICE_PAYMENT_STATUS_OPTIONS: { value: InvoicePaymentStatus; label: string }[] = [
  { value: 'unpaid', label: 'Not paid' },
  { value: 'advance', label: 'Advance paid' },
  { value: 'paid', label: 'Paid in full' },
]

/** Label + pill styling for the internal-reference badge on the invoices list. */
export const INVOICE_PAYMENT_STATUS_BADGE: Record<
  InvoicePaymentStatus,
  { label: string; className: string }
> = {
  paid: { label: 'Paid in full', className: 'border-green-200 bg-green-50 text-green-700' },
  advance: { label: 'Advance paid', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  unpaid: { label: 'Not paid', className: 'border-red-200 bg-red-50 text-red-700' },
}

export type InvoiceFormData = {
  invoiceDate: string
  dueDate: string
  customerName: string
  customerAddress: string
  customerMobile: string
  lineItems: QuotationLineItem[]
  sewingCost: SewingCost
  discount: string
  advance: string
  paymentStatus: InvoicePaymentStatus
  /** Internal-only payment breakdown: amount given by the customer. given + profit = invoice total. */
  given: string
  /** Internal-only payment breakdown: profit portion. Never shown on the printed invoice. */
  profit: string
  notes: string
}

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
  invoiceDate: '',
  dueDate: '',
  customerName: '',
  customerAddress: '',
  customerMobile: '',
  lineItems: [],
  sewingCost: { qty: '', unitPrice: '' },
  discount: '',
  advance: '',
  paymentStatus: 'unpaid',
  given: '',
  profit: '',
  notes: '',
}

export type InvoiceRecord = {
  id: string
  createdAt: string
  updatedAt: string
  financialYear: string
  /** Shared sequential document number (invoices + quotations), assigned on first save. */
  docNumber?: number
  /** Order this invoice was opened from, if any; null for standalone invoices. */
  submissionId: string | null
  data: InvoiceFormData
}

export function ensureLineItems(rows: QuotationLineItem[] | undefined): QuotationLineItem[] {
  if (rows?.length) return rows
  return [createEmptyLineItem()]
}

/**
 * Prefill a new invoice from a quotation that the client approved.
 * Carries over the customer, the primary (Option 1) line items, sewing cost,
 * discount and notes. Invoice-specific fields (date, due date, advance) start
 * fresh, and line items get new ids so the invoice is independent of the quotation.
 */
export function invoiceFormFromQuotation(q: QuotationFormData): InvoiceFormData {
  return {
    invoiceDate: '',
    dueDate: '',
    customerName: q.customerName ?? '',
    customerAddress: q.customerAddress ?? '',
    customerMobile: q.customerMobile ?? '',
    lineItems: ensureLineItems(q.lineItems).map((row) => ({ ...row, id: crypto.randomUUID() })),
    sewingCost: q.sewingCost ?? { qty: '', unitPrice: '' },
    discount: q.discount ?? '',
    advance: '',
    paymentStatus: 'unpaid',
    given: '',
    profit: '',
    notes: q.notes ?? '',
  }
}
