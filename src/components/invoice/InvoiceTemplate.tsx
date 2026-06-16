import { LetterheadHeader } from '../letterhead/LetterheadHeader'
import {
  BillToBlock,
  ItemsTable,
  LetterheadFooter,
  TotalsBox,
  type TotalRow,
} from '../letterhead/LetterheadParts'
import { buildDisplayItems } from '../letterhead/buildDisplayItems'
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
  notes: string
}

const TERMS = [
  'Payment is due within 7 days from the invoice date.',
  'Goods once sold are not returnable.',
  'Thank you for your business!',
]

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
  notes,
}: Props) {
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
    { label: 'Total (LKR)', value: formatMoney(totals.total), highlight: true },
    { label: 'Advance', value: advanceNum > 0 ? formatMoney(advanceNum) : '—' },
    { label: 'Balance', value: totals.total > 0 ? formatMoney(balance) : '—' },
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

        <div className="mt-6">
          <BillToBlock name={customerName} address={customerAddress} mobile={customerMobile} />
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
