'use client';

import { useEffect } from 'react';

const PHONE_FIELD_HINT = /phone|mobile|telephone|whatsapp|contact.?number|emergency.?number|guardian.?number/i;
const NON_PHONE_FIELD_HINT = /search|filter|lookup|username|email|login|otp/i;

const isPhoneField = (input: HTMLInputElement) => {
  const label = input.closest('label')?.textContent || '';
  const hints = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute('aria-label') || '',
    input.autocomplete,
    label,
  ].join(' ');

  if (NON_PHONE_FIELD_HINT.test(hints)) return false;
  return input.type === 'tel' || input.autocomplete.startsWith('tel') || PHONE_FIELD_HINT.test(hints);
};

const updateInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const withIndiaCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return trimmed;
};

export default function IndiaPhonePrefix() {
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !isPhoneField(input)) return;

      if (input.type === 'number') input.type = 'tel';
      input.inputMode = 'tel';

      const value = input.value.trim();
      const nextValue = value ? withIndiaCode(value) : '+91 ';
      if (input.value !== nextValue) updateInputValue(input, nextValue);
      input.setSelectionRange(input.value.length, input.value.length);
    };

    const handleBlur = (event: FocusEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !isPhoneField(input)) return;

      const trimmed = input.value.trim();
      const nextValue = trimmed === '+91' ? '' : withIndiaCode(trimmed);
      if (input.value !== nextValue) updateInputValue(input, nextValue);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return null;
}
