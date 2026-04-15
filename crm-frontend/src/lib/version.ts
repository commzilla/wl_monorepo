// This file captures the git commit at build time
// The value is injected by Vite during build

export const BUILD_COMMIT = import.meta.env.VITE_GIT_COMMIT || 'development';
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
