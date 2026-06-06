export default function AuthLoading({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}
