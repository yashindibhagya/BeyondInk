import { createEmptyLineItem, type QuotationLineItem, type SewingCost } from './quotation'

export type InvoiceFormData = {
  invoiceDate: string
  customerAddress: string
  introText: string
  lineItems: QuotationLineItem[]
  sewingCost: SewingCost
  advance: string
  closingNote: string
  signatoryLine: string
  signatoryName: string
}

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
  invoiceDate: '',
  customerAddress: '',
  introText: '',
  lineItems: [],
  sewingCost: { qty: '', unitPrice: '' },
  advance: '',
  closingNote: '',
  signatoryLine: '',
  signatoryName: '',
}

export type InvoiceRecord = {
  id: string
  createdAt: string
  updatedAt: string
  financialYear: string
  /** Order this invoice was opened from, if any; null for standalone invoices. */
  submissionId: string | null
  data: InvoiceFormData
}

export function ensureLineItems(rows: QuotationLineItem[] | undefined): QuotationLineItem[] {
  if (rows?.length) return rows
  return [createEmptyLineItem()]
}
