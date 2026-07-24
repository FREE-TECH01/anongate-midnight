export function normalizeSecretCode(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Secret code is required');
  }
  return normalized;
}

export function maskSecretCode(value: string): string {
  return '•'.repeat(Math.max(value.length, 9));
}
