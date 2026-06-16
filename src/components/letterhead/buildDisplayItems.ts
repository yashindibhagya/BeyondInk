import type { QuotationLineItem } from '../../types/quotation'

export type DisplayItem = {
  id: string
  description: string
  qty: string
  unitPrice: string
}

/** Flatten line items plus an optional sewing-cost row into table rows. */
export function buildDisplayItems(
  lineItems: QuotationLineItem[],
  sewingCost?: { qty: string; unitPrice: string },
): DisplayItem[] {
  const items: DisplayItem[] = lineItems
    .filter((row) => row.description.trim() || row.qty.trim() || row.unitPrice.trim())
    .map((row) => ({
      id: row.id,
      description: row.description,
      qty: row.qty,
      unitPrice: row.unitPrice,
    }))
  if (sewingCost?.qty.trim() && sewingCost?.unitPrice.trim()) {
    items.push({ id: 'sewing-cost', description: 'Sewing cost', qty: sewingCost.qty, unitPrice: sewingCost.unitPrice })
  }
  return items
}
