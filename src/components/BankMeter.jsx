import { debtMeterPercent } from '../bank.js'
import { Landmark } from 'lucide-react'

// The "Bank": a debt meter that fills red as health-target shortfall grows.
export default function BankMeter({ debt = 0, unit = 'h' }) {
  const pct = debtMeterPercent(debt)
  const clean = debt <= 0
  return (
    <div className={'bank' + (clean ? ' clean' : '')}>
      <div className="bank-head">
        <span className="bank-title"><Landmark size={16} /> Sleep / Health Debt</span>
        <b className="bank-amount">{clean ? 'Clear 🎉' : `${Math.round(debt)}${unit}`}</b>
      </div>
      <div className="bank-bar">
        <div className="bank-fill" style={{ width: pct + '%' }} />
      </div>
      <p className="bank-note">
        {clean
          ? 'You are meeting your targets. Keep it up.'
          : 'Fall short of a target and it banks as debt — repay by exceeding it later, or it costs weekly points.'}
      </p>
    </div>
  )
}
