/**
 * Shared UI primitives used across multiple pages and components.
 * Centralises repeated markup and class strings so a single edit propagates everywhere.
 */

// ─── Form alert ───────────────────────────────────────────────────────────────

/**
 * Red error alert banner for forms.
 * Renders nothing when `message` is empty / falsy — safe to render unconditionally.
 *
 * @param {{ message?: string, className?: string }} props
 */
export function FormAlert({ message, className = '' }) {
  if (!message) return null
  return (
    <div
      className={`rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800${className ? ` ${className}` : ''}`}
      role="alert"
    >
      {message}
    </div>
  )
}

// ─── Input class strings ──────────────────────────────────────────────────────

/**
 * Base Tailwind class for single-line text / date / number inputs
 * used on pages without a loading/disabled state (Login, Signup).
 */
export const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 ' +
  'focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500'

/**
 * Extends INPUT_CLASS with disabled-state styles.
 * Use on any input that can be disabled while an async operation is in flight.
 */
export const INPUT_DISABLED_CLASS =
  `${INPUT_CLASS} disabled:cursor-not-allowed disabled:bg-slate-50`
