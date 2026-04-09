
/**
 * Utility to manage content access and user permissions
 */

export const FREE_SURAHS = [1, 112, 113, 114];
export const FREE_JUZ = [1];

/**
 * Checks if a specific surah is free for all users
 */
export function isSurahFree(surahId: number): boolean {
  return FREE_SURAHS.includes(surahId);
}

/**
 * Checks if a specific juz is free for all users
 */
export function isJuzFree(juzId: number): boolean {
  return FREE_JUZ.includes(juzId);
}

/**
 * Checks if a user has student status (any active/verified registration)
 */
export function checkIsStudent(registrations: any[]): boolean {
  if (!registrations) return false;
  return registrations.some(reg => 
    ['active', 'verified', 'pending_verification'].includes(reg.status)
  );
}

/**
 * Determines if a specific page in the Mushaf is free
 * Al-Fatihah is on page 1
 * Surahs 112-114 are on page 604
 */
export function isMushafPageFree(page: number): boolean {
  return page === 1 || page === 604;
}
