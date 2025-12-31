// API Configuration - All API URLs are loaded from environment variables

const API_CONFIG = {
  // Base URLs
  ADMIN_AUTH_BASE_URL: process.env.REACT_APP_ADMIN_AUTH_URL || 'http://localhost:3012',
  ABBREVIATIONS_BASE_URL: process.env.REACT_APP_ABBREVIATIONS_URL || 'http://localhost:3001',
  PDF_BASE_URL: process.env.REACT_APP_PDF_URL || 'http://localhost:3005',
  DICTIONARY_BASE_URL: process.env.REACT_APP_DICTIONARY_URL || 'http://localhost:3000',

  // Endpoints
  ADMIN_AUTH_LOGIN: process.env.REACT_APP_ADMIN_AUTH_LOGIN || '/api/auth/login',
  SUB_ADMINS: process.env.REACT_APP_SUB_ADMINS || '/api/sub-admins',
  ABBREVIATIONS: process.env.REACT_APP_ABBREVIATIONS || '/api/abbreviations',
  PDFS: process.env.REACT_APP_PDFS || '/api/pdfs',
  DICTIONARY: process.env.REACT_APP_DICTIONARY || '/api/dictionary',

  // Full URLs
  get adminAuthLogin() {
    return `${this.ADMIN_AUTH_BASE_URL}${this.ADMIN_AUTH_LOGIN}`;
  },
  get subAdmins() {
    return `${this.ADMIN_AUTH_BASE_URL}${this.SUB_ADMINS}`;
  },
  get abbreviations() {
    return `${this.ABBREVIATIONS_BASE_URL}${this.ABBREVIATIONS}`;
  },
  get pdfs() {
    return `${this.PDF_BASE_URL}${this.PDFS}`;
  },
  get dictionary() {
    return `${this.DICTIONARY_BASE_URL}${this.DICTIONARY}`;
  }
};

export default API_CONFIG;

