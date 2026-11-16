import { ingestReel } from "./ingest";

export type ImportItem = { url: string; caption?: string };
export type ImportCounts = { sorted: number; review: number; pending: number; duplicates: number; failed: number };

type IngestFn = (i: ImportItem) => Promise<{ id: number; status: string; duplicate: boolean; category: string }>;

export async function importReels(
  items: ImportItem[],
  deps: { ingest?: IngestFn; batchSize?: number } = {},
): Promise<ImportCounts> {
  const ingest: IngestFn = deps.ingest ?? ((i) => ingestReel(i));
  const size = deps.batchSize ?? 10;
  const counts: ImportCounts = { sorted: 0, review: 0, pending: 0, duplicates: 0, failed: 0 };

  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.allSettled(batch.map((it) => ingest(it)));
    for (const r of results) {
      if (r.status === "rejected") counts.failed++;
      else if (r.value.duplicate) counts.duplicates++;
      else if (r.value.status === "sorted") counts.sorted++;
      else if (r.value.status === "review") counts.review++;
      else counts.pending++;
    }
  }
  return counts;
}
