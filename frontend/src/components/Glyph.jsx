export default function Glyph({ name, size = 16 }) {
  const icons = {
    chevronRight: <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    chevronLeft:  <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    trash: (
      <>
        <path d="M3 5h10M8 8v5M6 8v5M5 5V3h6v2M4 5l1 9h6l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    ),
    edit: <path d="M9 3l3 3-7 7H2v-3L9 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>,
    plus: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {icons[name]}
    </svg>
  )
}
