import axios from 'axios';

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.errors?.length) {
      return data.errors[0].message;
    }
    if (data?.error) {
      return data.error;
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    if (error.response?.status === 404) {
      return 'Not found.';
    }
    if (!error.response) {
      return 'Network error. Please check your connection.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
