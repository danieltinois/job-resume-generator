/** Portuguese UI strings. The source of the translation keys: every other language must match. */
export const pt = {
  'app.title': 'Resume Tailor',
  'auth.welcome': 'Olá, {name}',
} as const;

export type TranslationKey = keyof typeof pt;
