import logoUrl from '../../assets/logo.png'
import { BRAND, COMPANY } from '../../lib/companyInfo'

export type MetaRow = { label: string; value: string }

type Props = {
  title: string
  meta: MetaRow[]
}

function CmykDots() {
  return (
    <div className="mt-1 flex items-center justify-end gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND.cyan }} />
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND.magenta }} />
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND.yellow }} />
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: BRAND.ink }} />
    </div>
  )
}

/** Shared logo + title + meta header and contact band for invoice & quotation. */
export function LetterheadHeader({ title, meta }: Props) {
  return (
    <header>
      <div className="flex items-start justify-between gap-6">
        <img src={logoUrl} alt={COMPANY.name} className="h-24 w-auto object-contain" crossOrigin="anonymous" />
        <div className="text-right">
          <h1 className="text-4xl font-extrabold uppercase tracking-tight text-slate-900">{title}</h1>
          <CmykDots />
          <dl className="mt-3 space-y-1 text-[12px]">
            {meta.map((row) => (
              <div key={row.label} className="flex items-center justify-end gap-2">
                <dt className="font-semibold text-slate-600">{row.label}</dt>
                <dd className="min-w-[7rem] border-b border-dotted border-slate-400 pb-0.5 text-right tabular-nums text-slate-900">
                  {row.value || ' '}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-4 h-2 w-full rounded-sm" style={{ background: BRAND.ink }} />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-1 text-[11.5px] text-slate-700">
        <div className="flex items-start gap-2">
          <span aria-hidden style={{ color: BRAND.magenta }}>
            ●
          </span>
          <p className="whitespace-pre-line leading-snug">{COMPANY.addressLines.join('\n')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ color: BRAND.cyan }}>
            ●
          </span>
          <p className="leading-snug">Mobile {COMPANY.mobiles.join(' / ')}</p>
        </div>
      </div>
    </header>
  )
}
