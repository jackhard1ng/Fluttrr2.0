import { Config } from '@/constants/config';

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < Config.MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${Config.MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export function validateUsername(username: string): string | null {
  if (!username.trim()) return 'Username is required';
  if (username.length < Config.MIN_USERNAME_LENGTH) {
    return `Username must be at least ${Config.MIN_USERNAME_LENGTH} characters`;
  }
  if (username.length > Config.MAX_USERNAME_LENGTH) {
    return `Username must be at most ${Config.MAX_USERNAME_LENGTH} characters`;
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  if (!name.trim()) return 'Display name is required';
  if (name.trim().length < 2) return 'Display name must be at least 2 characters';
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.length > Config.MAX_BIO_LENGTH) {
    return `Bio must be at most ${Config.MAX_BIO_LENGTH} characters`;
  }
  return null;
}

export function validateBusinessName(name: string): string | null {
  if (!name.trim()) return 'Business name is required';
  if (name.trim().length < 2) return 'Business name must be at least 2 characters';
  return null;
}

export function validateAddress(address: string): string | null {
  if (!address.trim()) return 'Address is required';
  return null;
}

export function validateOtp(code: string): string | null {
  if (!code.trim()) return 'Verification code is required';
  if (code.length !== Config.OTP_LENGTH) {
    return `Code must be ${Config.OTP_LENGTH} digits`;
  }
  if (!/^\d+$/.test(code)) return 'Code must contain only numbers';
  return null;
}

export function validateProfilePhoto(uri: string | null): string | null {
  if (!uri) return 'Profile photo is required';
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required`;
  return null;
}
