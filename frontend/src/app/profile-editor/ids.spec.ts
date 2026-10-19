import { nextId } from './ids';

describe('nextId', () => {
  it('uses the backend id format', () => {
    for (const prefix of ['exp', 'ach', 'prj', 'edu', 'cat'] as const) {
      expect(nextId(prefix)).toMatch(new RegExp(`^${prefix}_[0-9a-f]{8}$`));
    }
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, () => nextId('ach')));

    expect(ids.size).toBe(200);
  });
});
