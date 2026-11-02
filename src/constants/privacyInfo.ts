import { COMPANY } from './companyInfo';

/** Set to the monitored privacy support mailbox in each release environment. */
export const PRIVACY_CONTACT = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL?.trim() || COMPANY.email;
export const PRIVACY_VERSION = '2026-10-26';
