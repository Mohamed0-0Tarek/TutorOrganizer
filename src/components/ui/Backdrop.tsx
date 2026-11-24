export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -start-16 -top-24 h-72 w-72 rounded-full bg-sand/50 blur-3xl" />
      <div className="absolute -end-20 top-1/3 h-80 w-80 rounded-full bg-sage-soft/55 blur-3xl" />
      <div className="absolute -bottom-24 start-10 h-72 w-72 rounded-full bg-clay-soft/50 blur-3xl" />
    </div>
  );
}
