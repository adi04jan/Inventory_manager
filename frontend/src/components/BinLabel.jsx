export default function BinLabel({ id }) {
  if (!id) return null
  return <span className="bin bin--tape">{id}</span>
}
