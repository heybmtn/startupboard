import { Link, useSearchParams } from "react-router-dom";

export default function Cancelled() {
  const [params] = useSearchParams();
  const slug = params.get("slug");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-white">Payment cancelled</h1>
      <p className="mt-3 text-slate-400">Your territory is still available.</p>
      <div className="mt-8 flex gap-3">
        {slug && (
          <Link
            to={`/claim/${slug}`}
            className="rounded-full bg-indigo-500 px-6 py-3 font-display font-semibold text-white hover:bg-indigo-400"
          >
            Try Again
          </Link>
        )}
        <Link to="/" className="rounded-full border border-white/20 px-6 py-3 font-display font-semibold text-white hover:bg-white/10">
          Back to the board
        </Link>
      </div>
    </div>
  );
}
