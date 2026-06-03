const STAGING_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV;

export function getBaseUrl(): string {
  if (APP_ENV === "production" && PROD_API_URL) {
    return PROD_API_URL.replace(/\/$/, "");
  }
  if (STAGING_DOMAIN) {
    return `https://${STAGING_DOMAIN}`;
  }
  return "";
}
