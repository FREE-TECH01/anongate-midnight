export function normalizeCredential(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Credential is required');
  }
  return normalized;
}

export function maskCredential(value: string): string {
  return '•'.repeat(Math.max(value.length, 9));
}
