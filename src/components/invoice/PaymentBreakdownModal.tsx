import { useState } from 'react'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { formatMoney, parseAmount } from '../../types/quotation'

/** The other half of `total` once one of given/profit is entered, as a clean editable number string. */
function complement(total: number, entered: number): string {
  const other = Math.max(0, total - entered)
  return Number.isInteger(other) ? String(other) : other.toFixed(2)
}

type Props = {
  /** Invoice Total (LKR) = subtotal − discount. given + profit = total. */
  total: number
  initialGiven: string
  initialProfit: string
  onClose: () => void
  /** Persist the entered breakdown. The modal closes on success. */
  onSave: (given: string, profit: string) => void | Promise<void>
  saveLabel?: string
}

/** Internal-only Given/Profit breakdown editor. Never part of the printed invoice. */
export function PaymentBreakdownModal({
  total,
  initialGiven,
  initialProfit,
  onClose,
  onSave,
  saveLabel = 'Done',
}: Props) {
  const [given, setGiven] = useState(initialGiven)
  const [profit, setProfit] = useState(initialProfit)
  const [saving, setSaving] = useState(false)

  // given + profit = total: filling one field auto-completes the other.
  const handleGiven = (value: string) => {
    setGiven(value)
    setProfit(value.trim() === '' ? '' : complement(total, parseAmount(value)))
  }
  const handleProfit = (value: string) => {
    setProfit(value)
    setGiven(value.trim() === '' ? '' : complement(total, parseAmount(value)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(given, profit)
      onClose()
    } catch {
      // Keep the modal open so the user can retry.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Payment breakdown"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Payment breakdown</h2>
            <p className="mt-0.5 text-xs text-slate-500">Given + Profit = Total. Filling one fills the other.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <FormField label="Total (LKR)" hint="From the invoice total (subtotal − discount).">
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900">
              {formatMoney(total)}
            </div>
          </FormField>
          <FormField label="Given (D)" htmlFor="pb-given">
            <Input
              id="pb-given"
              inputMode="decimal"
              value={given}
              onChange={(e) => handleGiven(e.target.value)}
              placeholder="e.g. 30000"
            />
          </FormField>
          <FormField label="Profit" htmlFor="pb-profit">
            <Input
              id="pb-profit"
              inputMode="decimal"
              value={profit}
              onChange={(e) => handleProfit(e.target.value)}
              placeholder="e.g. 20000"
            />
          </FormField>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
