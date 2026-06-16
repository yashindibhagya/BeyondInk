import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { firebaseDb } from './firebase'
import { getFinancialYearLabel } from './financialYear'
import type { InvoiceFormData, InvoiceRecord } from '../types/invoice'
import { EMPTY_INVOICE_FORM, ensureLineItems } from '../types/invoice'
import { createEmptyLineItem, type QuotationLineItem, type SewingCost } from '../types/quotation'

const COLL = 'invoices'

function normalizeLineItems(raw: unknown): QuotationLineItem[] {
  if (!Array.isArray(raw)) return [createEmptyLineItem()]
  const rows = raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      id: typeof row.id === 'string' && row.id ? row.id : crypto.randomUUID(),
      description: String(row.description ?? ''),
      qty: String(row.qty ?? ''),
      unitPrice: String(row.unitPrice ?? ''),
    }))
  return ensureLineItems(rows)
}

function normalizeSewingCost(raw: unknown): SewingCost {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>
    return {
      qty: typeof r.qty === 'string' ? r.qty : '',
      unitPrice: typeof r.unitPrice === 'string' ? r.unitPrice : '',
    }
  }
  return { qty: '', unitPrice: '' }
}

function normalizeInvoice(id: string, raw: Record<string, unknown> | undefined): InvoiceRecord | null {
  if (!raw) return null
  const createdAtRaw = raw.createdAt
  let createdAt: string | null = null
  if (createdAtRaw instanceof Timestamp) {
    createdAt = createdAtRaw.toDate().toISOString()
  } else if (typeof createdAtRaw === 'string') {
    const t = Date.parse(createdAtRaw)
    createdAt = Number.isNaN(t) ? null : new Date(t).toISOString()
  }
  const updatedAtRaw = raw.updatedAt
  let updatedAt: string | null = null
  if (updatedAtRaw instanceof Timestamp) {
    updatedAt = updatedAtRaw.toDate().toISOString()
  } else if (typeof updatedAtRaw === 'string') {
    const t = Date.parse(updatedAtRaw)
    updatedAt = Number.isNaN(t) ? null : new Date(t).toISOString()
  } else {
    updatedAt = createdAt
  }
  const financialYearRaw = raw.financialYear
  const financialYear =
    typeof financialYearRaw === 'string' && financialYearRaw.trim()
      ? financialYearRaw.trim()
      : createdAt
        ? getFinancialYearLabel(createdAt)
        : null
  const surveyData = raw.data
  if (!createdAt || !updatedAt || !financialYear || !surveyData || typeof surveyData !== 'object' || Array.isArray(surveyData)) return null

  const submissionRaw = raw.submissionId
  const submissionId =
    submissionRaw === null || submissionRaw === undefined
      ? null
      : typeof submissionRaw === 'string'
        ? submissionRaw
        : null

  const partial = surveyData as Partial<InvoiceFormData>
  const data: InvoiceFormData = {
    ...EMPTY_INVOICE_FORM,
    ...partial,
    lineItems: normalizeLineItems(partial.lineItems),
    sewingCost: normalizeSewingCost(partial.sewingCost),
  }

  const docNumber = typeof raw.docNumber === 'number' && Number.isFinite(raw.docNumber) ? raw.docNumber : undefined

  return {
    id,
    createdAt,
    updatedAt,
    financialYear,
    ...(docNumber !== undefined ? { docNumber } : {}),
    submissionId,
    data,
  }
}

export async function saveInvoiceToFirestore(record: InvoiceRecord): Promise<void> {
  if (!firebaseDb) throw new Error('Firestore is not configured')
  const createdAtMs = Date.parse(record.createdAt)
  const updatedAtMs = Date.parse(record.updatedAt)
  const createdAt = Number.isNaN(createdAtMs) ? Timestamp.now() : Timestamp.fromDate(new Date(createdAtMs))
  const updatedAt = Number.isNaN(updatedAtMs) ? Timestamp.now() : Timestamp.fromDate(new Date(updatedAtMs))
  const financialYear = record.financialYear?.trim() || getFinancialYearLabel(createdAt.toDate())
  const persistedData = {
    invoiceDate: record.data.invoiceDate,
    dueDate: record.data.dueDate ?? '',
    customerName: record.data.customerName ?? '',
    customerAddress: record.data.customerAddress,
    customerMobile: record.data.customerMobile ?? '',
    discount: record.data.discount ?? '',
    advance: record.data.advance,
    paymentStatus: record.data.paymentStatus ?? 'unpaid',
    given: record.data.given ?? '',
    profit: record.data.profit ?? '',
    notes: record.data.notes ?? '',
    lineItems: ensureLineItems(record.data.lineItems),
    sewingCost: record.data.sewingCost ?? { qty: '', unitPrice: '' },
  }
  await setDoc(
    doc(firebaseDb, COLL, record.id),
    {
      createdAt,
      updatedAt,
      financialYear,
      ...(typeof record.docNumber === 'number' ? { docNumber: record.docNumber } : {}),
      submissionId: record.submissionId,
      data: persistedData,
    },
    { merge: true },
  )
}

export async function deleteInvoiceFromFirestore(id: string): Promise<void> {
  if (!firebaseDb) return
  await deleteDoc(doc(firebaseDb, COLL, id))
}

let activeUnsub: Unsubscribe | null = null

export function startFirestoreInvoicesListener(
  onUpdate: (list: InvoiceRecord[]) => void,
  onError: (message: string) => void,
): () => void {
  if (!firebaseDb) return () => {}

  const db = firebaseDb
  const q = query(collection(db, COLL), orderBy('updatedAt', 'desc'))
  activeUnsub = onSnapshot(
    q,
    (snap) => {
      const list: InvoiceRecord[] = []
      snap.forEach((d) => {
        const inv = normalizeInvoice(d.id, d.data() as Record<string, unknown> | undefined)
        if (inv) list.push(inv)
      })
      onUpdate(list)
    },
    (err) => {
      onError(err.message)
    },
  )

  return () => {
    activeUnsub?.()
    activeUnsub = null
  }
}
