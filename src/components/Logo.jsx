export default function Logo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c-2.6 3.4-5 6.4-5 9.4a5 5 0 0 0 10 0C17 9.4 14.6 6.4 12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.4 13.4A2.7 2.7 0 0 0 12 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
    </svg>
  )
}
