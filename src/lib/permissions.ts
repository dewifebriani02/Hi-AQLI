import { useDoc } from "@/supabase/db";

export type ProgramType = 'hi_mufradat' | 'hi_tikrar' | 'hi_ngaji' | 'hi_berbagi' | 'hi_mutabaah' | 'hi_muhasabah';

export interface UseUserPermissionsResult {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMusyrifah: boolean;
  isSuperUser: boolean; // admin || superadmin
  assignedPrograms: ProgramType[];
  canAccessProgram: (program: ProgramType) => boolean;
  canDelete: () => boolean;
  isLoading: boolean;
}

/**
 * Hook to check user permissions and role-based access
 *
 * Usage:
 * const { isAdmin, isMusyrifah, canAccessProgram, canDelete } = useUserPermissions(user?.id);
 *
 * - isAdmin: User is in roles_admin table
 * - isSuperAdmin: User is in roles_superadmin table
 * - isMusyrifah: User is in roles_musyrifah table
 * - isSuperUser: User is admin OR superadmin (has full access)
 * - assignedPrograms: Array of programs the musyrifah can manage
 * - canAccessProgram(program): Check if user can access a specific program
 * - canDelete(): Check if user can delete (only admin/superadmin)
 */
export function useUserPermissions(userId?: string | null): UseUserPermissionsResult {
  const { data: isAdmin, isLoading: isAdminLoading } = useDoc(userId ? "roles_admin" : null, userId);
  const { data: isSuperAdmin, isLoading: isSuperAdminLoading } = useDoc(userId ? "roles_superadmin" : null, userId);
  const { data: isMusyrifah, isLoading: isMusyrifahLoading } = useDoc(userId ? "roles_musyrifah" : null, userId);

  const assignedPrograms = (isMusyrifah?.assigned_programs as ProgramType[]) || [];

  const canAccessProgram = (program: ProgramType): boolean => {
    // Admin and SuperAdmin can access all programs
    if (!!isAdmin?.id || !!isSuperAdmin?.id) return true;
    // Musyrifah can only access assigned programs
    return assignedPrograms.includes(program);
  };

  const canDelete = (): boolean => {
    // Only Admin and SuperAdmin can delete
    // Musyrifah CANNOT delete
    return !!isAdmin?.id || !!isSuperAdmin?.id;
  };

  return {
    isAdmin: !!isAdmin?.id,
    isSuperAdmin: !!isSuperAdmin?.id,
    isMusyrifah: !!isMusyrifah?.id,
    isSuperUser: !!isAdmin?.id || !!isSuperAdmin?.id,
    assignedPrograms,
    canAccessProgram,
    canDelete,
    isLoading: isAdminLoading || isSuperAdminLoading || isMusyrifahLoading,
  };
}

/**
 * Get program type from halaqah_id or path
 */
export function getProgramTypeFromPath(path: string): ProgramType | null {
  if (path.includes('/mufradat')) return 'hi_mufradat';
  if (path.includes('/tikrar')) return 'hi_tikrar';
  if (path.includes('/classes')) return 'hi_ngaji';
  if (path.includes('/donations') || path.includes('/campaigns')) return 'hi_berbagi';
  if (path.includes('/mutabaah')) return 'hi_mutabaah';
  if (path.includes('/muhasabah')) return 'hi_muhasabah';
  return null;
}

/**
 * Check if user has admin panel access
 */
export function hasAdminAccess(isAdmin: boolean, isSuperAdmin: boolean, isMusyrifah: boolean): boolean {
  return isAdmin || isSuperAdmin || isMusyrifah;
}
