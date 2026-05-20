export default function StockPill({ qty, unit, minQty }) {
  const low = qty <= minQty
  return (
    <span className={`stockpill ${low ? 'stockpill--low' : 'stockpill--ok'}`}>
      <span className="stockpill__n">{qty}</span>
      {unit && <span className="stockpill__u">{unit}</span>}
    </span>
  )
}
