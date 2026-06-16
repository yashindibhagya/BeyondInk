import { BRAND, COMPANY } from '../../lib/companyInfo'
import { formatLineAmount } from '../../types/quotation'
import type { DisplayItem } from './buildDisplayItems'

export function BillToBlock({
  name,
  address,
  mobile,
}: {
  name: string
  address: string
  mobile: string
}) {
  return (
    <div className="w-full max-w-[60%]">
      <div className="inline-block rounded-sm px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: BRAND.ink }}>
        Bill To
      </div>
      <dl className="mt-2 space-y-1 text-[12px]">
        <Row label="Name" value={name} />
        <Row label="Address" value={address} multiline />
        <Row label="Mobile" value={mobile} />
      </dl>
    </div>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 font-semibold text-slate-600">{label}</dt>
      <dd className={`flex-1 border-b border-dotted border-slate-300 text-slate-900 ${multiline ? 'whitespace-pre-line' : ''}`}>
        {value || ' '}
      </dd>
    </div>
  )
}

/** Line-items table with a dark header; renders only the rows that have content. */
export function ItemsTable({ items }: { items: DisplayItem[] }) {
  return (
    <table className="w-full border-collapse text-left text-[12px]">
      <thead>
        <tr style={{ background: BRAND.ink }} className="text-white">
          <th className="border border-slate-700 px-3 py-2 font-semibold uppercase tracking-wide">Description</th>
          <th className="w-[10%] border border-slate-700 px-2 py-2 text-center font-semibold uppercase tracking-wide">Qty</th>
          <th className="w-[20%] border border-slate-700 px-2 py-2 text-right font-semibold uppercase tracking-wide">Unit Price</th>
          <th className="w-[20%] border border-slate-700 px-2 py-2 text-right font-semibold uppercase tracking-wide">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((row) => (
          <tr key={row.id} className="even:bg-slate-50">
            <td className="border border-slate-300 px-3 py-2 align-top whitespace-pre-wrap">{row.description}</td>
            <td className="border border-slate-300 px-2 py-2 text-center align-top tabular-nums">{row.qty}</td>
            <td className="border border-slate-300 px-2 py-2 text-right align-top tabular-nums">{row.unitPrice}</td>
            <td className="border border-slate-300 px-2 py-2 text-right align-top tabular-nums">
              {formatLineAmount(row.qty, row.unitPrice) || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export type TotalRow = { label: string; value: string; highlight?: boolean }

/** Right-aligned totals stack; the highlighted row uses the cyan brand accent. */
export function TotalsBox({ rows }: { rows: TotalRow[] }) {
  return (
    <div className="w-full max-w-[16rem]">
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {rows.map((row) =>
            row.highlight ? (
              <tr key={row.label} style={{ background: BRAND.cyan }} className="text-white">
                <td className="px-3 py-2 text-left text-[13px] font-bold uppercase tracking-wide">{row.label}</td>
                <td className="px-3 py-2 text-right text-[13px] font-bold tabular-nums">{row.value}</td>
              </tr>
            ) : (
              <tr key={row.label} className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-left font-semibold uppercase tracking-wide text-slate-600">{row.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">{row.value}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Notes (left) + terms and authorized-signature row, then the brand footer. */
export function LetterheadFooter({
  notes,
  terms,
}: {
  notes: string
  terms: string[]
}) {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-8">
        <div>
          {notes.trim() ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] text-slate-700">{notes}</p>
            </>
          ) : null}
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-600">Terms &amp; Conditions</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
            {terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="mt-10 w-48 border-t border-slate-400 pt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Authorized Signature
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span className="h-px flex-1" style={{ background: BRAND.ink }} />
        <p className="text-[13px] font-semibold italic text-slate-700">
          Thank you for choosing {COMPANY.name.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())}!
        </p>
        <span className="h-px flex-1" style={{ background: BRAND.ink }} />
      </div>
    </div>
  )
}
