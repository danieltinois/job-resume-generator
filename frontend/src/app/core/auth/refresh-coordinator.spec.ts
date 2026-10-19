import { TestBed } from '@angular/core/testing';
import { LOCK_MANAGER, RefreshCoordinator } from './refresh-coordinator';

/** A lock manager shared by "tabs": runs callbacks for the same name one at a time. */
function fakeLocks() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    request<T>(_name: string, callback: () => Promise<T>): Promise<T> {
      const result = tail.then(() => callback());
      tail = result.catch(() => undefined);
      return result;
    },
  };
}

describe('RefreshCoordinator', () => {
  it('shares one in-flight refresh between callers in a tab', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCK_MANAGER, useValue: fakeLocks() }] });
    const coordinator = TestBed.inject(RefreshCoordinator);
    let calls = 0;
    const refresh = () => new Promise<string>((resolve) => setTimeout(() => resolve(`token-${++calls}`), 5));

    const results = await Promise.all([coordinator.run(refresh), coordinator.run(refresh), coordinator.run(refresh)]);

    expect(calls).toBe(1);
    expect(results).toEqual(['token-1', 'token-1', 'token-1']);
  });

  /** A coordinator as a tab would get it, with its own state but the browser's shared locks. */
  function tab(locks: unknown): RefreshCoordinator {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: LOCK_MANAGER, useValue: locks }] });
    return TestBed.inject(RefreshCoordinator);
  }

  it('serializes refreshes across tabs through the shared lock', async () => {
    const locks = fakeLocks();
    const tabA = tab(locks);
    const tabB = tab(locks);
    let running = 0;
    let overlapped = false;
    const refresh = async () => {
      running++;
      overlapped ||= running > 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return 'token';
    };

    await Promise.all([tabA.run(refresh), tabB.run(refresh)]);

    expect(overlapped).toBe(false);
  });

  it('works without the Web Locks API', async () => {
    const coordinator = tab(undefined);

    expect(await coordinator.run(async () => 'token')).toBe('token');
  });

  it('allows a new refresh once the previous one settled', async () => {
    const coordinator = tab(undefined);
    let calls = 0;

    await coordinator.run(async () => ++calls);
    await coordinator.run(async () => ++calls);

    expect(calls).toBe(2);
  });
});
