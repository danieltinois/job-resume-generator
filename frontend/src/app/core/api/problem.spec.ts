import { HttpErrorResponse } from '@angular/common/http';
import { fieldErrors, toProblem } from './problem';

describe('problem', () => {
  it('reads an RFC 7807 body', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { status: 422, detail: 'Invalid request', errors: [{ path: 'password', message: 'too short' }] },
    });

    const problem = toProblem(error);

    expect(problem.status).toBe(422);
    expect(fieldErrors(problem).get('password')).toBe('too short');
  });

  it('falls back when the body is not a problem', () => {
    const problem = toProblem(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));

    expect(problem.status).toBe(0);
    expect(fieldErrors(problem).size).toBe(0);
  });
});
