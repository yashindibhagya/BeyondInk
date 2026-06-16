import { useMemo } from 'react'
import { useInvoicesStore } from '../store/useInvoicesStore'
import { useQuotationsStore } from '../store/useQuotationsStore'
import type { InvoiceRecord } from '../types/invoice'
import type { QuotationRecord } from '../types/quotation'

/** First document number ever assigned. Invoices and quotations share one sequence. */
export const START_DOC_NUMBER = 100

type Numbered = { docNumber?: number }

function highestDocNumber(records: Numbered[]): number {
  let max = START_DOC_NUMBER - 1
  for (const r of records) {
    if (typeof r.docNumber === 'number' && r.docNumber > max) max = r.docNumber
  }
  return max
}

/** Next shared number across both collections (≥ START_DOC_NUMBER). */
export function computeNextDocNumber(
  invoices: InvoiceRecord[],
  quotations: QuotationRecord[],
): number {
  return Math.max(highestDocNumber(invoices), highestDocNumber(quotations)) + 1
}

/** Read the next number on demand (non-reactive) — use at save time. */
export function getNextDocNumber(): number {
  return computeNextDocNumber(
    useInvoicesStore.getState().invoices,
    useQuotationsStore.getState().quotations,
  )
}

/** Display form of a document number, e.g. 100 → "100". */
export function formatDocNumber(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return ''
  return String(n)
}

/** Reactive next number for live previews on the form/template before saving. */
export function useNextDocNumber(): number {
  const invoices = useInvoicesStore((s) => s.invoices)
  const quotations = useQuotationsStore((s) => s.quotations)
  return useMemo(() => computeNextDocNumber(invoices, quotations), [invoices, quotations])
}
