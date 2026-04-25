export default function NavbarSkeleton() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/5 bg-[#05060B]/80 backdrop-blur-xl sm:h-[68px]">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 xl:px-8">
        {/* Logo placeholder */}
        <div className="h-7 w-28 animate-pulse rounded-lg bg-white/10" />
        {/* Nav links placeholder */}
        <div className="hidden items-center gap-6 lg:flex">
          {[80, 64, 72, 60, 80].map((w, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-white/10" style={{ width: w }} />
          ))}
        </div>
        {/* CTA placeholder */}
        <div className="h-9 w-24 animate-pulse rounded-full bg-neon-lime/20" />
      </div>
    </div>
  );
}
