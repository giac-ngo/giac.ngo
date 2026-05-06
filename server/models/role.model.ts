// server/models/role.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface Role {
    id: number;
    name: string;
    permissions: Record<string, unknown>;
    createdAt?: Date | string;
}

export interface RoleInput {
    name: string;
    permissions: Record<string, unknown>;
}

export const roleModel = {
    async findAll(): Promise<Role[]> {
        const res = await pool.query('SELECT * FROM roles ORDER BY name ASC');
        return res.rows.map(mapRowToCamelCase);
    },

    async create(roleData: RoleInput): Promise<Role> {
        const { name, permissions } = roleData;
        const res = await pool.query('INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING *', [name, permissions]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, roleData: RoleInput): Promise<Role> {
        const { name, permissions } = roleData;
        const res = await pool.query('UPDATE roles SET name = $1, permissions = $2 WHERE id = $3 RETURNING *', [name, permissions, id]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async delete(id: number | string): Promise<void> {
        await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    },
};