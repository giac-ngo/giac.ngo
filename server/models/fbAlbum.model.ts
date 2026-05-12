import { pool } from '../db.js';

export interface FbAlbum {
    id: number;
    space_id: number;
    name: string;
    album_id: string;
    created_at?: Date;
}

export const fbAlbumModel = {
    async getBySpaceId(spaceId: number): Promise<FbAlbum[]> {
        const result = await pool.query(
            'SELECT * FROM fb_albums WHERE space_id = $1 ORDER BY created_at DESC',
            [spaceId]
        );
        return result.rows;
    },

    async create(spaceId: number, name: string, albumId: string): Promise<FbAlbum> {
        const result = await pool.query(
            'INSERT INTO fb_albums (space_id, name, album_id) VALUES ($1, $2, $3) RETURNING *',
            [spaceId, name, albumId]
        );
        return result.rows[0];
    }
};
