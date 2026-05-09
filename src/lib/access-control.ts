
/**
 * Utility to manage content access and user permissions
 */




/**
 * Checks if a specific surah is free for all users
 */
export function isSurahFree(surahId: number): boolean {
  return true;
}

/**
 * Checks if a specific juz is free for all users
 */
export function isJuzFree(juzId: number): boolean {
  return true;
}

/**
 * Checks if a user has student status (any active/verified/pending registration)
 */
export function checkIsStudent(registrations: any[]): boolean {
  if (!registrations) return false;
  return registrations.some(reg => 
    ['active', 'verified', 'pending_verification'].includes(reg.status)
  );
}

/**
 * Checks if a user has a VERIFIED student status (strictly verified or active)
 */
export function checkIsVerifiedStudent(registrations: any[]): boolean {
  if (!registrations) return false;
  return registrations.some(reg => 
    ['active', 'verified'].includes(reg.status) &&
    (reg.halaqah_id?.toLowerCase().includes('mufradat') || reg.halaqah_title?.toLowerCase().includes('mufradat'))
  );
}

/**
 * Determines if a specific page in the Mushaf is free
 */
export function isMushafPageFree(page: number): boolean {
  return true;
}

