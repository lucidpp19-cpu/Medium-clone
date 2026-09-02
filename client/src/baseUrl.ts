export const url = import.meta.env.VITE_API_URL || "";
export const neonAuthUrl = import.meta.env.DEV
  ? `${window.location.origin}/neon-auth`
  : import.meta.env.VITE_NEON_AUTH_URL || "";
