import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** UTF-8 length limit; BCrypt only reads 72 bytes, the same rule as the backend. */
export function maxBytes(limit: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    return value && new TextEncoder().encode(value).length > limit ? { maxBytes: { limit } } : null;
  };
}

/** Puts a 422 problem's path-keyed messages on the matching controls; returns paths with no control. */
export function applyServerErrors(form: FormGroup, errors: Map<string, string>): string[] {
  const unmatched: string[] = [];
  errors.forEach((message, path) => {
    const control = form.get(path.replace(/\[(\d+)\]/g, '.$1'));
    if (control) {
      control.setErrors({ server: message });
      control.markAsTouched();
    } else {
      unmatched.push(path);
    }
  });
  return unmatched;
}
