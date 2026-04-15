"use client";

/**
 * Shared error display component — NFR §7.5 (single shared error-display mechanism).
 */

interface ErrorAlertProps {
  message: string | null | undefined;
  details?: Record<string, string[]>;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, details, onDismiss }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {details && Object.keys(details).length > 0 && (
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-red-700">
              {Object.entries(details).map(([field, msgs]) =>
                msgs.map((m, i) => <li key={`${field}-${i}`}>{m}</li>)
              )}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 flex-shrink-0"
            aria-label="Hatayı kapat"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
