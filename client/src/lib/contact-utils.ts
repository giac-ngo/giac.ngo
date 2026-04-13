export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
  role: string;
  organizationType: string;
  communitySize: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(data: ContactFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required";
  }
  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required";
  }
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "Invalid email format";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export const INITIAL_FORM_DATA: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  organizationName: "",
  role: "",
  organizationType: "",
  communitySize: "",
  message: "",
};
