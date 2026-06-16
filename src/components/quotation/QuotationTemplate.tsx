import { formatDateDotDMY } from '../../lib/dateDisplay'
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
  sumLineAmounts,
} from '../../types/quotation'

type Props = {
  docNumberDisplay: string
  quotationDate: string
  customerName: string
  customerAddress: string
  customerMobile: string
  subject: string
  lineItems: QuotationLineItem[]
  lineItemsSecondary?: QuotationLineItem[]
  sewingCost?: SewingCost
  sewingCostSecondary?: SewingCost
  discount: string
  paymentNote: string
  notes: string
}

const TERMS = [
  'This quotation is valid for 14 days from the date above.',
  'A 60% advance is required to confirm the order; balance on delivery.',
  'Prices are subject to change for revised specifications.',
]

function sewingGrossOf(sewingCost?: SewingCost): number {
  return sewingCost?.qty.trim() && sewingCost?.unitPrice.trim()
    ? lineItemGrossAmount({ id: 'sc', description: '', qty: sewingCost.qty, unitPrice: sewingCost.unitPrice })
    : 0
}

export function QuotationTemplate({
  docNumberDisplay,
  quotationDate,
  customerName,
  customerAddress,
  customerMobile,
  subject,
  lineItems,
  lineItemsSecondary = [],
  sewingCost,
  sewingCostSecondary,
  discount,
  paymentNote,
  notes,
}: Props) {
  const subtotal = sumLineAmounts(lineItems) + sewingGrossOf(sewingCost)
  const totals = computeDocTotals(subtotal, discount)

  const hasSecondary = lineItemsSecondary.some(
    (row) => row.description.trim() || row.qty.trim() || row.unitPrice.trim(),
  )
  const secondaryTotal = hasSecondary
    ? sumLineAmounts(lineItemsSecondary) + sewingGrossOf(sewingCostSecondary)
    : 0

  const totalRows: TotalRow[] = [
    { label: 'Subtotal', value: formatMoney(subtotal) },
    { label: 'Discount', value: totals.discount > 0 ? `- ${formatMoney(totals.discount)}` : '—' },
    { label: 'Total (LKR)', value: formatMoney(totals.total), highlight: true },
  ]

  return (
    <article className="quotation-template relative mx-auto box-border min-h-[297mm] w-full max-w-[210mm] overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-md print:max-w-none print:border-0 print:shadow-none">
      <div className="flex min-h-[297mm] flex-col px-10 py-8 print:px-12">
        <LetterheadHeader
          title="Quotation"
          meta={[
            { label: 'Quotation No', value: docNumberDisplay },
            { label: 'Date', value: formatDateDotDMY(quotationDate) },
          ]}
        />

        <div className="mt-6 flex items-start justify-between gap-6">
          <BillToBlock name={customerName} address={customerAddress} mobile={customerMobile} />
          {subject.trim() ? (
            <div className="max-w-[36%] text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Quotation For</p>
              <p className="mt-1 text-[13px] font-semibold uppercase text-slate-900">{subject}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          {hasSecondary ? (
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-600">Option 1</p>
          ) : null}
          <ItemsTable items={buildDisplayItems(lineItems, sewingCost)} />
        </div>

        <div className="mt-4 flex justify-end">
          <TotalsBox rows={totalRows} />
        </div>

        {hasSecondary ? (
          <div className="mt-6">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-600">Option 2</p>
            <ItemsTable items={buildDisplayItems(lineItemsSecondary, sewingCostSecondary)} />
            <div className="mt-4 flex justify-end">
              <TotalsBox rows={[{ label: 'Total (LKR)', value: formatMoney(secondaryTotal), highlight: true }]} />
            </div>
          </div>
        ) : null}

        {paymentNote.trim() ? (
          <p className="mt-5 rounded-sm bg-slate-50 px-3 py-2 text-center text-[12px] font-semibold text-slate-800">
            {paymentNote}
          </p>
        ) : null}

        <div className="flex-1" />

        <LetterheadFooter notes={notes} terms={TERMS} />
      </div>
    </article>
  )
}
