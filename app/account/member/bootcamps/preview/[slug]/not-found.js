import Link from 'next/link';

export default function BootcampNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0d13] px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-white">404</p>
        <p className="mt-2 text-sm text-gray-500">Bootcamp not found or not published</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
