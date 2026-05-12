// server/controllers/roleController.js
import { Request, Response, NextFunction } from 'express';
import { roleModel } from '../models/role.model.js';
import { getUserManagedSpaceIds } from '../middleware/authMiddleware.js';

export const roleController = {
    async getAllRoles(req: Request, res: Response) {
        try {
            const user = req.user as any;
            const spaceId = req.params.spaceId as string;

            // If a spaceId is provided in the URL, return:
            // 1. The user's own assigned roles (system roles, read-only for display)
            // 2. Roles created within that space (editable)
            if (spaceId) {
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
            // Check if this user is truly a Global Admin
            const managedSpaceIds = user?.id ? await getUserManagedSpaceIds(user.id) : [];
            const isGlobalAdmin = user?.permissions?.includes('roles') && managedSpaceIds.length === 0;
            
            if (!isGlobalAdmin && req.body.permissions) {
                const userPermissions = user?.permissions || [];
                req.body.permissions = req.body.permissions.filter((p: string) => userPermissions.includes(p));
            }

            // If not global admin, force spaceId from the request or the user's managed space
            if (!isGlobalAdmin) {
                req.body.spaceId = req.body.spaceId || managedSpaceIds[0] || null;
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

            // Check if this user is truly a Global Admin
            const managedSpaceIds = user?.id ? await getUserManagedSpaceIds(user.id) : [];
            const isGlobalAdmin = user?.permissions?.includes('roles') && managedSpaceIds.length === 0;

            // Non-global-admin cannot edit system roles (space_id IS NULL)
            if (!isGlobalAdmin) {
                const existingRole = await roleModel.findById(roleId);
                if (!existingRole) {
                    return res.status(404).json({ message: 'Quyền không tồn tại.' });
                }
                if (!existingRole.spaceId) {
                    return res.status(403).json({ message: 'Bạn không được phép chỉnh sửa quyền hệ thống.' });
                }
            }
            
            if (!isGlobalAdmin && req.body.permissions) {
                const userPermissions = user?.permissions || [];
                req.body.permissions = req.body.permissions.filter((p: string) => userPermissions.includes(p));
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

            // Check if this user is truly a Global Admin
            const managedSpaceIds = user?.id ? await getUserManagedSpaceIds(user.id) : [];
            const isGlobalAdmin = user?.permissions?.includes('roles') && managedSpaceIds.length === 0;

            // Non-global-admin cannot delete system roles
            if (!isGlobalAdmin) {
                const existingRole = await roleModel.findById(roleId);
                if (!existingRole) {
                    return res.status(404).json({ message: 'Quyền không tồn tại.' });
                }
                if (!existingRole.spaceId) {
                    return res.status(403).json({ message: 'Bạn không được phép xóa quyền hệ thống.' });
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
