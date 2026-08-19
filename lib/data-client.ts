// Client-side data helper — replaces direct database calls
// All pages use this to fetch/mutate data via the /api/data route

// Polyfill: allow JSON.stringify to handle BigInt values
(BigInt.prototype as any).toJSON = function () { return Number(this); };

export async function fetchData<T = any>(
  model: string,
  options?: { where?: Record<string, any>; include?: Record<string, any>; orderBy?: Record<string, any>; take?: number }
): Promise<T[]> {
  const params = new URLSearchParams({ model });
  if (options?.where) params.set('where', JSON.stringify(options.where));
  if (options?.include) params.set('include', JSON.stringify(options.include));
  if (options?.orderBy) params.set('orderBy', JSON.stringify(options.orderBy));
  if (options?.take) params.set('take', String(options.take));

  const res = await fetch(`/api/data?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Fetch failed');
  return json.data as T[];
}

export async function createData<T = any>(
  model: string,
  data: Record<string, any>,
  include?: Record<string, any>
): Promise<T> {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, data, include }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Create failed');
  return json.data as T;
}

export async function updateData<T = any>(
  model: string,
  where: Record<string, any>,
  data: Record<string, any>,
  include?: Record<string, any>
): Promise<T> {
  const res = await fetch('/api/data', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, where, data, include }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Update failed');
  return json.data as T;
}

export async function deleteData(model: string, where: Record<string, any>): Promise<void> {
  const res = await fetch('/api/data', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, where }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Delete failed');
}
