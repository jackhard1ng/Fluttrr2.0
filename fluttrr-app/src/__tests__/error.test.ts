import { extractErrorMessage } from '../utils/error';

// Mock axios.isAxiosError
jest.mock('axios', () => ({
  isAxiosError: (error: any) => error?.isAxiosError === true,
}));

describe('extractErrorMessage', () => {
  it('extracts field validation error from Axios response', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          errors: [{ field: 'email', message: 'Email already taken' }],
        },
      },
    };
    expect(extractErrorMessage(err)).toBe('Email already taken');
  });

  it('extracts generic error string from Axios response', () => {
    const err = {
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: 'Invalid credentials' },
      },
    };
    expect(extractErrorMessage(err)).toBe('Invalid credentials');
  });

  it('returns rate limit message for 429', () => {
    const err = {
      isAxiosError: true,
      response: { status: 429, data: {} },
    };
    expect(extractErrorMessage(err)).toBe('Too many requests. Please try again later.');
  });

  it('returns not found message for 404', () => {
    const err = {
      isAxiosError: true,
      response: { status: 404, data: {} },
    };
    expect(extractErrorMessage(err)).toBe('Not found.');
  });

  it('returns network error for no response', () => {
    const err = {
      isAxiosError: true,
      response: undefined,
    };
    expect(extractErrorMessage(err)).toBe('Network error. Please check your connection.');
  });

  it('extracts message from standard Error', () => {
    expect(extractErrorMessage(new Error('Something broke'))).toBe('Something broke');
  });

  it('returns fallback for unknown error types', () => {
    expect(extractErrorMessage('string error')).toBe('Something went wrong. Please try again.');
    expect(extractErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(extractErrorMessage(42)).toBe('Something went wrong. Please try again.');
  });
});
