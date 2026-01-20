/**
 * Extends React's InputHTMLAttributes to include webkitdirectory attribute.
 * Required for directory upload functionality in ReleaseForm component.
 * Used in: app/components/Pages/components/ReleaseForm/ReleaseForm.tsx
 */

declare global {
  namespace React {
    interface InputHTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
      webkitdirectory?: string;
      directory?: string;
    }
  }
}

export {};
