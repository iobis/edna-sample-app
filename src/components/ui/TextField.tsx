import * as React from 'react';
import * as Label from '@radix-ui/react-label';
import styles from './TextField.module.css';

export interface TextFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  id?: string;
  children: React.ReactNode;
}

export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  ({ label, error, required, id, children }, ref) => (
    <div className={styles.field} ref={ref}>
      {label && (
        <Label.Root className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </Label.Root>
      )}
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
);

TextField.displayName = 'TextField';

export const TextFieldInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input ref={ref} className={styles.input} {...props} />
));

TextFieldInput.displayName = 'TextFieldInput';

export const TextFieldTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => (
  <textarea ref={ref} className={styles.textarea} {...props} />
));

TextFieldTextarea.displayName = 'TextFieldTextarea';

