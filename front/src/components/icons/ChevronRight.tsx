export default function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9 18l6-6-6-6" fill="#00000000" />
      <path d="M9 18l6-6-6-6" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
