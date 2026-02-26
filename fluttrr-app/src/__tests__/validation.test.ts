import { validateEmail, validatePassword, validateUsername, validateDisplayName, validateBio, validateBusinessName, validateAddress, validateOtp, validateProfilePhoto, validateRequired } from '../utils/validation';

describe('validateEmail', () => {
  it('returns null for valid emails', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('user.name+tag@domain.co')).toBeNull();
  });

  it('returns error for empty email', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('   ')).toBe('Email is required');
  });

  it('returns error for invalid email', () => {
    expect(validateEmail('notanemail')).toBe('Invalid email address');
    expect(validateEmail('missing@')).toBe('Invalid email address');
    expect(validateEmail('@no-local.com')).toBe('Invalid email address');
  });
});

describe('validatePassword', () => {
  it('returns null for valid passwords', () => {
    expect(validatePassword('securepass1')).toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });

  it('returns error for empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('returns error for short password', () => {
    expect(validatePassword('short')).toBe('Password must be at least 8 characters');
  });
});

describe('validateUsername', () => {
  it('returns null for valid usernames', () => {
    expect(validateUsername('john_doe')).toBeNull();
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('User123')).toBeNull();
  });

  it('returns error for empty username', () => {
    expect(validateUsername('')).toBe('Username is required');
  });

  it('returns error for short username', () => {
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
  });

  it('returns error for long username', () => {
    expect(validateUsername('a'.repeat(21))).toBe('Username must be at most 20 characters');
  });

  it('returns error for invalid characters', () => {
    expect(validateUsername('user name')).toBe('Username can only contain letters, numbers, and underscores');
    expect(validateUsername('user@name')).toBe('Username can only contain letters, numbers, and underscores');
    expect(validateUsername('user-name')).toBe('Username can only contain letters, numbers, and underscores');
  });
});

describe('validateDisplayName', () => {
  it('returns null for valid names', () => {
    expect(validateDisplayName('John')).toBeNull();
    expect(validateDisplayName('Jane Doe')).toBeNull();
  });

  it('returns error for empty name', () => {
    expect(validateDisplayName('')).toBe('Display name is required');
    expect(validateDisplayName('   ')).toBe('Display name is required');
  });

  it('returns error for too short name', () => {
    expect(validateDisplayName('J')).toBe('Display name must be at least 2 characters');
  });
});

describe('validateBio', () => {
  it('returns null for valid bios', () => {
    expect(validateBio('')).toBeNull();
    expect(validateBio('Hello world')).toBeNull();
  });

  it('returns error for too long bio', () => {
    expect(validateBio('a'.repeat(201))).toBe('Bio must be at most 200 characters');
  });
});

describe('validateBusinessName', () => {
  it('returns null for valid names', () => {
    expect(validateBusinessName('My Business')).toBeNull();
  });

  it('returns error for empty name', () => {
    expect(validateBusinessName('')).toBe('Business name is required');
  });

  it('returns error for short name', () => {
    expect(validateBusinessName('A')).toBe('Business name must be at least 2 characters');
  });
});

describe('validateAddress', () => {
  it('returns null for valid address', () => {
    expect(validateAddress('123 Main St')).toBeNull();
  });

  it('returns error for empty address', () => {
    expect(validateAddress('')).toBe('Address is required');
    expect(validateAddress('   ')).toBe('Address is required');
  });
});

describe('validateOtp', () => {
  it('returns null for valid 6-digit code', () => {
    expect(validateOtp('123456')).toBeNull();
  });

  it('returns error for empty code', () => {
    expect(validateOtp('')).toBe('Verification code is required');
  });

  it('returns error for wrong length', () => {
    expect(validateOtp('12345')).toBe('Code must be 6 digits');
    expect(validateOtp('1234567')).toBe('Code must be 6 digits');
  });

  it('returns error for non-numeric code', () => {
    expect(validateOtp('abcdef')).toBe('Code must contain only numbers');
  });
});

describe('validateProfilePhoto', () => {
  it('returns null for valid URI', () => {
    expect(validateProfilePhoto('https://example.com/photo.jpg')).toBeNull();
  });

  it('returns error for null', () => {
    expect(validateProfilePhoto(null)).toBe('Profile photo is required');
  });
});

describe('validateRequired', () => {
  it('returns null for non-empty value', () => {
    expect(validateRequired('hello', 'Field')).toBeNull();
  });

  it('returns error for empty value', () => {
    expect(validateRequired('', 'Title')).toBe('Title is required');
    expect(validateRequired('   ', 'Name')).toBe('Name is required');
  });
});
