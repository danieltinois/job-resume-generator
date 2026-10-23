import type { JobSummary } from '../core/api/types';

/** Lowercase, accent-free, trimmed text, so "São" and "sao" compare equal. */
function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** The jobs whose title or company contain the query, ignoring case and accents. A blank query keeps all. */
export function filterJobs(jobs: JobSummary[], query: string): JobSummary[] {
  const needle = normalize(query);
  if (!needle) {
    return jobs;
  }
  return jobs.filter((job) => normalize(job.title).includes(needle) || normalize(job.company).includes(needle));
}
