export function safeErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || 'An unexpected error occurred';
  if (error && typeof error === 'object') {
    const anyErr = error as any;
    const msg =
      typeof anyErr.message === 'string'
        ? anyErr.message
        : typeof anyErr.error === 'string'
          ? anyErr.error
          : undefined;
    if (msg && msg.trim().length > 0) return msg;
  }
  return 'An unexpected error occurred';
}

