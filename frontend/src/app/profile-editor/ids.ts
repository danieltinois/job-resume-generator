export type IdPrefix = 'exp' | 'ach' | 'prj' | 'edu' | 'cat';

/**
 * A new profile item id in the backend's format, {@code <prefix>_<8 hex>}.
 * Generated once when the item is created and never changed afterwards:
 * saved resumes refer to items by these ids.
 */
export function nextId(prefix: IdPrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
