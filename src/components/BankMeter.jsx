import { debtMeterPercent } from '../bank.js'
import { Sheet } from './ui/Primitives.jsx'

// The Bank: shortfall on a targeted habit (sleep 8h, water 8 glasses) carries
// forward as debt rather than resetting at midnight, and going over target later
// repays it. It is the product's memory, and the one mechanic no neighbouring
// habit tracker has.
export default function BankMeter({ debt = 0, unit = '' }) {
  const pct = debtMeterPercent(debt)
  const clear = debt <= 0
  const rounded = Math.round(debt * 10) / 10

  return (
    <Sheet edge={clear ? 'var(--plane-indigo)' : 'var(--plane-gold)'}>
      <div className="bank">
        <div className="row row--between">
          <span className="caption caption--ink">The Bank</span>
          <span className="figure-num" style={{ fontSize: 'var(--fs-lg)' }}>
            {clear ? 'Clear' : `${rounded}${unit ? ' ' + unit : ''}`}
          </span>
        </div>

        {/* The old meter was a bare div: no role, no value, nothing announced. */}
        <div
          className={`bank__track ${clear ? 'bank--clear' : ''}`}
          role="progressbar"
          aria-label="Health debt carried forward"
          aria-valuenow={Math.round(clear ? 0 : pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={clear ? 'Nothing owed' : `${rounded} carried forward`}
        >
          <div
            className="bank__fill"
            style={{ width: '100%', transform: `scaleX(${(clear ? 100 : pct) / 100})` }}
          />
        </div>

        <p className="quiet small measure">
          {clear
            ? 'Nothing owed. Every targeted habit is squared off.'
            : `You are ${rounded} short on your targeted habits. Go over target on a later day and it repays itself; leave it and it costs weekly points.`}
        </p>
      </div>
    </Sheet>
  )
}
