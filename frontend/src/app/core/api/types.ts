// API shapes, generated from docs/api/openapi.json (npm run api:types).
// Never hand-write an API type: alias the generated schema here instead.
import type { components } from './schema';

type Schemas = components['schemas'];

export type Profile = Schemas['Profile'];
export type StoredProfile = Schemas['StoredProfile'];
export type LocalizedText = Schemas['LocalizedText'];
export type Personal = Schemas['Personal'];
export type Experience = Schemas['Experience'];
export type Achievement = Schemas['Achievement'];
export type Project = Schemas['Project'];
export type Education = Schemas['Education'];
export type SkillCategory = Schemas['SkillCategory'];
export type LanguageSkill = Schemas['LanguageSkill'];
export type StoredJob = Schemas['StoredJob'];
export type JobSummary = Schemas['JobSummary'];
export type Analysis = Schemas['Analysis'];
export type Selection = Schemas['Selection'];
export type ResumeRequest = Schemas['ResumeRequest'];
export type ResumeSummary = Schemas['ResumeSummary'];
export type Me = Schemas['Me'];
export type Providers = Schemas['Providers'];
export type Problem = Schemas['Problem'];
export type Language = NonNullable<ResumeRequest['language']>;
export type TechTerm = Schemas['TechTerm'];
