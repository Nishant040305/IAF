const env = (globalThis as any)?.process?.env || {};

export const AUTH_BASE_URL =
  env.EXPO_PUBLIC_AUTH_BASE_URL || 'https://reader.afcel.in/reader/auth';

export const PDF_BASE_URL =
  env.EXPO_PUBLIC_PDF_BASE_URL || 'https://reader.afcel.in/reader/pdf';

export const DICT_BASE_URL =
  env.EXPO_PUBLIC_DICT_BASE_URL || 'https://reader.afcel.in/reader/dictionary';

export const ABBR_BASE_URL =
  env.EXPO_PUBLIC_ABBR_BASE_URL || 'https://reader.afcel.in/reader/abbreviations';
