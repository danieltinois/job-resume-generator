import { AbstractControl } from '@angular/forms';
import { I18n } from '../i18n/i18n';

/** The message for a control's first error, or null when it is valid or untouched. */
export function fieldError(control: AbstractControl, i18n: I18n): string | null {
  const errors = control.errors;
  if (!errors || !control.touched) {
    return null;
  }
  if (errors['server']) {
    return errors['server'] as string;
  }
  if (errors['required']) {
    return i18n.t('field.required');
  }
  if (errors['email']) {
    return i18n.t('field.email');
  }
  if (errors['minlength']) {
    return i18n.t('field.minPassword');
  }
  if (errors['maxBytes'] || errors['maxlength']) {
    return i18n.t('field.tooLong');
  }
  if (errors['taken']) {
    return i18n.t('field.taken');
  }
  return i18n.t('field.invalid');
}
