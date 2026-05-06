// server/controllers/roleController.js
import { Request, Response, NextFunction } from 'express';
import { roleModel } from '../models/role.model.js';

export const roleController = {
    async getAllRoles(req: Request, res: Response) {
        try {
            const roles = await roleModel.findAll();
            res.json(roles);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không thể tải danh sách quyền.' });
        }
    },

    async createRole(req: Request, res: Response) {
        try {
            const newRole = await roleModel.create(req.body);
            res.status(201).json(newRole);
        } catch (error: unknown) {
            res.status(500).json({ message: `Lỗi khi tạo quyền mới: ${(error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error))}` });
        }
    },

    async updateRole(req: Request, res: Response) {
        try {
            // @ts-ignore
            const updatedRole = await roleModel.update(req.params.id, req.body);
            res.json(updatedRole);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Lỗi khi cập nhật quyền.' });
        }
    },

    async deleteRole(req: Request, res: Response) {
        try {
            // @ts-ignore
            await roleModel.delete(req.params.id);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'Lỗi khi xóa quyền.' });
        }
    },
};
