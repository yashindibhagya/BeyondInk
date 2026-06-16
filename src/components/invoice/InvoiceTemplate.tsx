import { LetterheadHeader } from '../letterhead/LetterheadHeader'
import {
  BillToBlock,
  ItemsTable,
  LetterheadFooter,
  TotalsBox,
  type TotalRow,
} from '../letterhead/LetterheadParts'
import { buildDisplayItems } from '../letterhead/buildDisplayItems'
import type { InvoicePaymentStatus } from '../../types/invoice'
import type { QuotationLineItem, SewingCost } from '../../types/quotation'
import {
  computeDocTotals,
  formatMoney,
  lineItemGrossAmount,
  parseAmount,
  sumLineAmounts,
} from '../../types/quotation'

type Props = {
  docNumberDisplay: string
  invoiceDateDisplay: string
  dueDateDisplay: string
  customerName: string
  customerAddress: string
  customerMobile: string
  lineItems: QuotationLineItem[]
  sewingCost?: SewingCost
  discount: string
  advance: string
  paymentStatus: InvoicePaymentStatus
  notes: string
}

const TERMS = [
  'Payment is due within 7 days from the invoice date.',
  'Goods once sold are not returnable.',
  'Thank you for your business!',
]

const PAYMENT_BADGE: Record<InvoicePaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paid in Full', className: 'border-green-600 text-green-700' },
  advance: { label: 'Advance Paid', className: 'border-amber-600 text-amber-700' },
  unpaid: { label: 'Not Paid', className: 'border-red-600 text-red-700' },
}

export function InvoiceTemplate({
  docNumberDisplay,
  invoiceDateDisplay,
  dueDateDisplay,
  customerName,
  customerAddress,
  customerMobile,
  lineItems,
  sewingCost,
  discount,
  advance,
  paymentStatus,
  notes,
}: Props) {
  const paymentBadge = PAYMENT_BADGE[paymentStatus] ?? PAYMENT_BADGE.unpaid
  const sewingGross =
    sewingCost?.qty.trim() && sewingCost?.unitPrice.trim()
      ? lineItemGrossAmount({ id: 'sc', description: '', qty: sewingCost.qty, unitPrice: sewingCost.unitPrice })
      : 0
  const subtotal = sumLineAmounts(lineItems) + sewingGross
  const totals = computeDocTotals(subtotal, discount)
  const advanceNum = parseAmount(advance)
  const balance = Math.max(0, totals.total - (advanceNum > 0 ? advanceNum : 0))

  const totalRows: TotalRow[] = [
    { label: 'Subtotal', value: formatMoney(subtotal) },
    { label: 'Discount', value: totals.discount > 0 ? `- ${formatMoney(totals.discount)}` : '—' },
    { label: 'Total (LKR)', value: formatMoney(totals.total) },
    { label: 'Advance', value: advanceNum > 0 ? formatMoney(advanceNum) : '—' },
    { label: 'Balance (LKR)', value: totals.total > 0 ? formatMoney(balance) : '—', highlight: true },
  ]

  return (
    <article className="invoice-template relative mx-auto box-border min-h-[297mm] w-full max-w-[210mm] overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-md print:max-w-none print:border-0 print:shadow-none">
      <div className="flex min-h-[297mm] flex-col px-10 py-8 print:px-12">
        <LetterheadHeader
          title="Invoice"
          meta={[
            { label: 'Invoice No', value: docNumberDisplay },
            { label: 'Invoice Date', value: invoiceDateDisplay },
            { label: 'Due Date', value: dueDateDisplay },
          ]}
        />

        <div className="mt-6 flex items-start justify-between gap-6">
          <BillToBlock name={customerName} address={customerAddress} mobile={customerMobile} />
          <div className={`shrink-0 rounded-md border-2 px-4 py-2 text-center ${paymentBadge.className}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payment Status</p>
            <p className="mt-0.5 text-sm font-bold uppercase tracking-wider">{paymentBadge.label}</p>
          </div>
        </div>

        <div className="mt-5">
          <ItemsTable items={buildDisplayItems(lineItems, sewingCost)} />
        </div>

        <div className="mt-4 flex justify-end">
          <TotalsBox rows={totalRows} />
        </div>

        <div className="flex-1" />

        <LetterheadFooter notes={notes} terms={TERMS} />
      </div>
    </article>
  )
}
