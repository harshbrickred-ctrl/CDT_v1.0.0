/** null/undefined = no UI restriction (ADMIN or not yet loaded). Empty array = no owned clients. */
export function scopeClientsForUser<T extends { id: string }>(
  clients: T[],
  ownedClientIds: string[] | null | undefined,
): T[] {
  if (ownedClientIds == null) return clients;
  const allowed = new Set(ownedClientIds);
  return clients.filter((c) => allowed.has(c.id));
}
