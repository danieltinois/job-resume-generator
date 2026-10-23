import type { JobSummary } from '../core/api/types';
import { filterJobs } from './job-filter';

const job = (id: string, title: string | null, company: string | null): JobSummary =>
  ({ id, title, company, language: 'PT', createdAt: '2026-10-19T10:00:00Z' }) as JobSummary;

const JOBS = [
  job('1', 'Engenheiro de Dados', 'Acme'),
  job('2', 'Dev Java', 'São Paulo Tech'),
  job('3', null, null),
];

describe('filterJobs', () => {
  it('matches title or company, ignoring case and accents', () => {
    expect(filterJobs(JOBS, 'sao').map((j) => j.id)).toEqual(['2']);
    expect(filterJobs(JOBS, 'DADOS').map((j) => j.id)).toEqual(['1']);
  });

  it('trims the query', () => {
    expect(filterJobs(JOBS, '  java  ').map((j) => j.id)).toEqual(['2']);
  });

  it('returns everything for a blank query', () => {
    expect(filterJobs(JOBS, '   ')).toBe(JOBS);
  });
});
