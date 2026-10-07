import { Request, Response, NextFunction } from 'express';
import { roleModel } from '../models/role.model.js';
import { isSpaceMember } from '../middleware/authMiddleware.js';
import { can, isSpaceOwner, getUserSpacePermissions, userHasRoleId } from '../utils/policy.js';
import { isGlobalOnlyPermission } from '../constants/permissions.js';

export const roleController = {
    async getAllRoles(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const spaceId = req.params.spaceId as string;

            // If a spaceId is provided in the URL, return:
            // 1. The user's own assigned roles (system roles, read-only for display)
            // 2. Roles created within that space (editable)
            if (spaceId) {
                const isMember = await isSpaceMember(user, spaceId);
                if (!isMember) {
                    return res.status(403).json({ message: 'Không có quyền truy cập vai trò của Không gian này.' });
                }

                const [spaceRoles, userRoleIds] = await Promise.all([
                    roleModel.findBySpaceId(spaceId),
                    Promise.resolve(user?.roleIds || [])
                ]);

                // Get the user's assigned system roles for display (read-only)
                const systemRoles = await roleModel.findSystemRoles();
                const userAssignedRoles = systemRoles
                    .filter((r: any) => userRoleIds.includes(r.id))
                    .map((r: any) => ({ ...r, _readOnly: true }));

                // Combine: user's assigned roles (read-only) + space-specific roles (editable)
                const combined = [...userAssignedRoles, ...spaceRoles];
                return res.json(combined);
            }

            // Global Admin: return all system roles
            const roles = await roleModel.findSystemRoles();
            res.json(roles);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không thể tải danh sách quyền.' });
        }
    },

    async createRole(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const targetScope = req.body.spaceId ? { spaceId: req.body.spaceId } : 'global';
            const allowed = await can(user, 'roles', targetScope);
            if (!allowed) {
                return res.status(403).json({
                    message: req.body.spaceId
                        ? 'Bạn không có quyền quản lý vai trò trong Không gian này.'
                        : 'Chỉ Global Admin mới có thể tạo vai trò hệ thống.'
                });
            }

            // Strip global-only permissions for space roles
            if (!user?.isGlobalAdmin) {
                if (req.body.permissions) {
                    req.body.permissions = req.body.permissions.filter((p: string) => !isGlobalOnlyPermission(p));
                }

                // If not Global Admin and not Space Owner, enforce Space Manager constraints:
                // Space Manager can only assign permissions they themselves hold in this space
                if (req.body.spaceId) {
                    const isOwner = await isSpaceOwner(user?.id, req.body.spaceId);
                    if (!isOwner) {
                        const managerPerms = await getUserSpacePermissions(user?.id, req.body.spaceId);
                        if (req.body.permissions) {
                            req.body.permissions = req.body.permissions.filter((p: string) => managerPerms.includes(p));
                        }
                    }
                }
            }

            const newRole = await roleModel.create(req.body);
            res.status(201).json(newRole);
        } catch (error: unknown) {
            res.status(500).json({ message: `Lỗi khi tạo quyền mới: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async updateRole(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const roleId = req.params.id as string;

            const existingRole = await roleModel.findById(roleId);
            if (!existingRole) {
                return res.status(404).json({ message: 'Quyền không tồn tại.' });
            }

            const roleScope = existingRole.spaceId ? { spaceId: existingRole.spaceId } : 'global';
            const allowed = await can(user, 'roles', roleScope);
            if (!allowed) {
                return res.status(403).json({
                    message: existingRole.spaceId
                        ? 'Bạn không có quyền chỉnh sửa vai trò của Không gian này.'
                        : 'Bạn không được phép chỉnh sửa quyền hệ thống.'
                });
            }

            if (!user?.isGlobalAdmin && req.body.spaceId !== undefined && String(req.body.spaceId) !== String(existingRole.spaceId)) {
                return res.status(403).json({ message: 'Không được phép chuyển đổi Không gian của vai trò.' });
            }

            // Enforce constraints for Space roles
            if (!user?.isGlobalAdmin && existingRole.spaceId) {
                const isOwner = await isSpaceOwner(user?.id, existingRole.spaceId);
                if (!isOwner) {
                    // Space Manager cannot edit the role they themselves are currently assigned
                    const hasRole = await userHasRoleId(user?.id, roleId);
                    if (hasRole) {
                        return res.status(403).json({ message: 'Quản lý không được phép chỉnh sửa vai trò mà chính mình đang đảm nhiệm.' });
                    }

                    // Space Manager can only assign/toggle permissions they themselves hold:
                    // New permissions = (existing permissions that Manager does NOT have) + (submitted permissions that Manager has)
                    const managerPerms = await getUserSpacePermissions(user?.id, existingRole.spaceId);
                    if (req.body.permissions && Array.isArray(req.body.permissions)) {
                        const oldPerms: string[] = Array.isArray(existingRole.permissions) ? existingRole.permissions : [];
                        const preservedOldPerms = oldPerms.filter((p: string) => !managerPerms.includes(p));
                        const submittedManagerPerms = req.body.permissions.filter(
                            (p: string) => !isGlobalOnlyPermission(p) && managerPerms.includes(p)
                        );
                        req.body.permissions = Array.from(new Set([...preservedOldPerms, ...submittedManagerPerms]));
                    }
                } else {
                    // Space Owner can assign any space permission (excluding global-only)
                    if (req.body.permissions && Array.isArray(req.body.permissions)) {
                        req.body.permissions = req.body.permissions.filter((p: string) => !isGlobalOnlyPermission(p));
                    }
                }
            }

            // @ts-ignore
            const updatedRole = await roleModel.update(roleId, req.body);
            res.json(updatedRole);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Lỗi khi cập nhật quyền.' });
        }
    },

    async deleteRole(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const roleId = req.params.id as string;

            const existingRole = await roleModel.findById(roleId);
            if (!existingRole) {
                return res.status(404).json({ message: 'Quyền không tồn tại.' });
            }

            const roleScope = existingRole.spaceId ? { spaceId: existingRole.spaceId } : 'global';
            const allowed = await can(user, 'roles', roleScope);
            if (!allowed) {
                return res.status(403).json({
                    message: existingRole.spaceId
                        ? 'Bạn không có quyền xóa vai trò của Không gian này.'
                        : 'Bạn không được phép xóa quyền hệ thống.'
                });
            }

            // Space Manager cannot delete the role they themselves are currently assigned
            if (!user?.isGlobalAdmin && existingRole.spaceId) {
                const isOwner = await isSpaceOwner(user?.id, existingRole.spaceId);
                if (!isOwner) {
                    const hasRole = await userHasRoleId(user?.id, roleId);
                    if (hasRole) {
                        return res.status(403).json({ message: 'Quản lý không được phép xóa vai trò mà chính mình đang đảm nhiệm.' });
                    }
                }
            }

            // @ts-ignore
            await roleModel.delete(roleId);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'Lỗi khi xóa quyền.' });
        }
    },
};
