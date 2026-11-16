/** Lowercase, strip punctuation and asterisks, and collapse whitespace. */
export function normalizeLabel(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
