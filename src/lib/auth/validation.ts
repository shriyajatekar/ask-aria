export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateSignIn(email: string, password: string): string | null {
  if (!email.trim()) return "Work email is required.";
  if (!isValidEmail(email)) return "Enter a valid work email address.";
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateSignUp(fields: {
  name: string;
  email: string;
  password: string;
  company: string;
}): string | null {
  if (fields.name.trim().length < 2) return "Full name is required.";
  if (!fields.email.trim()) return "Work email is required.";
  if (!isValidEmail(fields.email)) return "Enter a valid work email address.";
  if (fields.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (fields.company.trim().length < 2) {
    return "Company or organization is required.";
  }
  return null;
}
