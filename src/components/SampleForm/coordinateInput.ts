/**
 * Draft text for a latitude or longitude field.
 * `input type="number"` drops a leading "-", so these fields stay text and
 * accept "-" anywhere in the draft.
 */
export function sanitizeCoordinateDraft(value: string): string {
  const normalized = value.replace(/,/g, '.');
  const negative = normalized.includes('-');
  let digits = normalized.replace(/[^\d.]/g, '');
  const dotIndex = digits.indexOf('.');
  if (dotIndex !== -1) {
    digits =
      digits.slice(0, dotIndex + 1) + digits.slice(dotIndex + 1).replace(/\./g, '');
  }
  return `${negative ? '-' : ''}${digits}`;
}

/** Flip the sign. An empty field becomes "-" so digits can be typed after it. */
export function toggleCoordinateDraft(value: string): string {
  const sanitized = sanitizeCoordinateDraft(value.trim());
  return sanitized.startsWith('-') ? sanitized.slice(1) : `-${sanitized}`;
}
