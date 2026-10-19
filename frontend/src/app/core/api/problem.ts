import { HttpErrorResponse } from '@angular/common/http';
import type { Problem } from './types';

/** The RFC 7807 body of a failed API call, or a minimal one when there is none (network error). */
export function toProblem(error: HttpErrorResponse): Problem {
  const body = error.error as Problem | null;
  if (body && typeof body === 'object' && 'status' in body) {
    return body;
  }
  return { status: error.status, detail: error.statusText };
}

/** Field path → message, from a 422 problem's {@code errors}. */
export function fieldErrors(problem: Problem): Map<string, string> {
  const errors = new Map<string, string>();
  for (const error of problem.errors ?? []) {
    if (error.path) {
      errors.set(error.path, error.message ?? '');
    }
  }
  return errors;
}
