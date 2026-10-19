import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Profile } from '../core/api/types';
import example from '../../testing/profile-example.json';
import { apiTestProviders } from '../auth/testing';
import { ProfileEditor } from './profile-editor';

describe('ProfileEditor', () => {
  it('counts missing English per section in the navigation', async () => {
    TestBed.configureTestingModule({ imports: [ProfileEditor], providers: apiTestProviders });
    const backend = TestBed.inject(HttpTestingController);
    const profile = structuredClone(example) as Profile;
    profile.summary!.en = null;
    profile.experiences![0].achievements![0].text!.en = null;
    profile.experiences![0].achievements![1].text!.en = null;

    const fixture = TestBed.createComponent(ProfileEditor);
    fixture.detectChanges();
    backend.expectOne('/api/profile').flush({ version: 3, data: profile });
    backend.expectOne('/api/tech-terms').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const badge = (section: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`[data-section="${section}"] .badge`)?.textContent?.trim();
    expect(badge('summary')).toBe('1');
    expect(badge('experiences')).toBe('2');
    expect(badge('projects')).toBeUndefined();
  });
});
