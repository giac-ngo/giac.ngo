// server/models/role.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface Role {
    id: number;
    name: string;
    permissions: Record<string, unknown>;
    spaceId?: number | null;
    createdAt?: Date | string;
}

export interface RoleInput {
    name: string;
    permissions: Record<string, unknown>;
    spaceId?: number | null;
}

export const roleModel = {
    async findAll(): Promise<Role[]> {
        const res = await pool.query('SELECT * FROM roles ORDER BY name ASC');
        return res.rows.map(mapRowToCamelCase);
    },

    async findBySpaceId(spaceId: number | string): Promise<Role[]> {
        const res = await pool.query(
            'SELECT * FROM roles WHERE space_id = $1 ORDER BY name ASC',
            [spaceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async findSystemRoles(): Promise<Role[]> {
        const res = await pool.query('SELECT * FROM roles WHERE space_id IS NULL ORDER BY name ASC');
        return res.rows.map(mapRowToCamelCase);
    },

    async create(roleData: RoleInput): Promise<Role> {
        const { name, permissions, spaceId } = roleData;
        const res = await pool.query(
            'INSERT INTO roles (name, permissions, space_id) VALUES ($1, $2, $3) RETURNING *',
            [name, permissions, spaceId || null]
        );
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

    async findById(id: number | string): Promise<Role | null> {
        const res = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
        return res.rows.length > 0 ? mapRowToCamelCase(res.rows[0]) : null;
    },
};