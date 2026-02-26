// App configuration

export const Config = {
  // API
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000',

  // Kansas City default coordinates
  DEFAULT_LAT: 39.0997,
  DEFAULT_LNG: -94.5786,
  DEFAULT_RADIUS: 25, // miles

  // Pagination
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,

  // Tokens
  ACCESS_TOKEN_KEY: 'fluttrr_access_token',
  REFRESH_TOKEN_KEY: 'fluttrr_refresh_token',
  ACCOUNT_TYPE_KEY: 'fluttrr_account_type',
  USER_DATA_KEY: 'fluttrr_user_data',

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_BIO_LENGTH: 200,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  OTP_LENGTH: 6,

  // App
  APP_NAME: 'Fluttrr',
  CONTACT_EMAIL: 'hello@fluttrr.com',

  // Admin
  ADMIN_PIN: process.env.EXPO_PUBLIC_ADMIN_PIN || '2417',
} as const;
