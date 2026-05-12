// server/models/space.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';
import { userModel, enrichUserWithPermissions } from './user.model.js';
import { Space, User } from '../types/index.js';

const BASE_SPACE_QUERY = `
    SELECT 
        s.*, 
        st.name as space_type_name,
        st.name_en as space_type_name_en,
        st.icon as space_type_icon
    FROM spaces s
    LEFT JOIN space_types st ON s.type_id = st.id
`;

export const spaceModel = {
    async findAll(): Promise<Space[]> {
        const res = await pool.query(BASE_SPACE_QUERY + ' ORDER BY s.space_sort ASC NULLS LAST');
        return res.rows.map(mapRowToCamelCase);
    },

    async findById(id: number | string): Promise<Space | null> {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.id = $1`, [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findBySlug(slug: string): Promise<Space | null> {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.slug = $1`, [slug]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findByCustomDomain(domain: string): Promise<Space | null> {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.custom_domain = $1`, [domain]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async create(data: Record<string, unknown>): Promise<Space> {
        const fields: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let index = 1;

        const keyMap: Record<string, string> = {
            userId: 'user_id',
            spaceSort: 'space_sort',
            slug: 'slug',
            name: 'name',
            nameEn: 'name_en',
            description: 'description',
            descriptionEn: 'description_en',
            imageUrl: 'image_url',
            locationText: 'location_text',
            locationTextEn: 'location_text_en',
            membersCount: 'members_count',
            views: 'views',
            likes: 'likes',
            rating: 'rating',
            tags: 'tags',
            tagsEn: 'tags_en',
            typeId: 'type_id',
            spaceColor: 'space_color',
            status: 'status',
            statusEn: 'status_en',
            event: 'event',
            eventEn: 'event_en',
            website: 'website',
            phoneNumber: 'phone_number',
            email: 'email',
            stripeAccountId: 'stripe_account_id',
            qrCodeImage: 'qr_code_image',
            bankBin: 'bank_bin',
            bankAccountNo: 'bank_account_no',
            bankAccountName: 'bank_account_name',
            bankTransferNote: 'bank_transfer_note',
            payosClientId: 'payos_client_id',
            payosApiKey: 'payos_api_key',
            payosChecksumKey: 'payos_checksum_key',
            venmoHandle: 'venmo_handle',
            customDomain: 'custom_domain',
            faviconUrl: 'favicon_url',
            smtpHost: 'smtp_host',
            smtpPort: 'smtp_port',
            smtpUser: 'smtp_user',
            smtpPass: 'smtp_pass',
            smtpFromName: 'smtp_from_name',
            hasMeditation: 'has_meditation',
            hasLibrary: 'has_library',
            hasDharmaTalks: 'has_dharma_talks',
            hasCommunity: 'has_community',
            emailTemplate: 'email_template',
            apiKeys: 'api_keys',
            guestMessageLimit: 'guest_message_limit',
            guestDailyLimit: 'guest_daily_limit',
        };

        for (const [key, value] of Object.entries(data)) {
            const columnName = keyMap[key];
            if (columnName) {
                fields.push(columnName);
                values.push(value);
                placeholders.push(`$${index++}`);
            }
        }

        if (fields.length === 0) {
            throw new Error("No data provided for space creation.");
        }

        const query = `INSERT INTO spaces (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const res = await pool.query(query, values);
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, data: Record<string, unknown>): Promise<Space | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let index = 1;

        const keyMap: Record<string, string> = {
            userId: 'user_id',
            spaceSort: 'space_sort',
            slug: 'slug',
            name: 'name',
            nameEn: 'name_en',
            description: 'description',
            descriptionEn: 'description_en',
            imageUrl: 'image_url',
            locationText: 'location_text',
            locationTextEn: 'location_text_en',
            membersCount: 'members_count',
            views: 'views',
            likes: 'likes',
            rating: 'rating',
            tags: 'tags',
            tagsEn: 'tags_en',
            typeId: 'type_id',
            spaceColor: 'space_color',
            status: 'status',
            statusEn: 'status_en',
            event: 'event',
            eventEn: 'event_en',
            website: 'website',
            phoneNumber: 'phone_number',
            email: 'email',
            stripeAccountId: 'stripe_account_id',
            qrCodeImage: 'qr_code_image',
            bankBin: 'bank_bin',
            bankAccountNo: 'bank_account_no',
            bankAccountName: 'bank_account_name',
            bankTransferNote: 'bank_transfer_note',
            payosClientId: 'payos_client_id',
            payosApiKey: 'payos_api_key',
            payosChecksumKey: 'payos_checksum_key',
            venmoHandle: 'venmo_handle',
            customDomain: 'custom_domain',
            faviconUrl: 'favicon_url',
            smtpHost: 'smtp_host',
            smtpPort: 'smtp_port',
            smtpUser: 'smtp_user',
            smtpPass: 'smtp_pass',
            smtpFromName: 'smtp_from_name',
            hasMeditation: 'has_meditation',
            hasLibrary: 'has_library',
            hasDharmaTalks: 'has_dharma_talks',
            hasCommunity: 'has_community',
            emailTemplate: 'email_template',
            apiKeys: 'api_keys',
            guestMessageLimit: 'guest_message_limit',
            guestDailyLimit: 'guest_daily_limit',
        };

        for (const [key, value] of Object.entries(data)) {
            const columnName = keyMap[key];
            if (columnName) {
                fields.push(`${columnName} = $${index++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `UPDATE spaces SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
        const res = await pool.query(query, values);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },


    async delete(id: number | string): Promise<Space | null> {
        const res = await pool.query('DELETE FROM spaces WHERE id = $1 RETURNING *', [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async incrementViews(id: number | string): Promise<void> {
        await pool.query('UPDATE spaces SET views = views + 1 WHERE id = $1', [id]);
    },

    async incrementLikes(id: number | string): Promise<{ likes: number }> {
        const res = await pool.query('UPDATE spaces SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
        return res.rows[0];
    },

    async findDharmaTalksBySpaceId(spaceId: number | string): Promise<any[]> {
        const res = await pool.query(
            'SELECT * FROM dharma_talks WHERE space_id = $1 ORDER BY date DESC NULLS LAST',
            [spaceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async findDocumentsBySpaceId(spaceId: number | string): Promise<any[]> {
        const res = await pool.query(`
            SELECT 
                d.*, 
                da.name AS author,
                dt.name AS type
            FROM documents d
            LEFT JOIN document_authors da ON d.author_id = da.id
            LEFT JOIN document_types dt ON d.type_id = dt.id
            WHERE d.space_id = $1
            ORDER BY d.created_at DESC
        `, [spaceId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async findAllDharmaTalks(): Promise<any[]> {
        const res = await pool.query(
            `SELECT dt.*, s.name as space_name 
             FROM dharma_talks dt 
             LEFT JOIN spaces s ON dt.space_id = s.id 
             ORDER BY dt.date DESC NULLS LAST`
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async addQrDonation(spaceId: number | string, userId: number | string | null, amount: number, note: string, billImageUrl: string): Promise<{ success: boolean, isGuest: boolean }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'UPDATE spaces SET merits = merits + $1 WHERE id = $2',
                [amount, spaceId]
            );

            await client.query(
                `INSERT INTO transactions (user_id, merits, type, destination_space_id, details)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    userId || null,
                    amount,
                    'qr_offering',
                    spaceId,
                    JSON.stringify({ note: note || null, billImageUrl: billImageUrl || null, isGuest: !userId })
                ]
            );

            await client.query('COMMIT');
            return { success: true, isGuest: !userId };
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async makeOffering(spaceId: number | string, userId: number | string, amount: number): Promise<{ updatedUser: User | null }> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const user = await userModel.findById(userId);
            if (!user) throw new Error('User not found.');
            if (user.merits !== undefined && user.merits !== null && user.merits < amount) {
                throw new Error('Insufficient merits.');
            }

            let updatedUserRes;
            if (user.merits !== undefined && user.merits !== null) {
                updatedUserRes = await client.query('UPDATE users SET merits = merits - $1 WHERE id = $2 RETURNING *', [amount, userId]);
            } else {
                updatedUserRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            }

            await client.query('UPDATE spaces SET merits = merits + $1 WHERE id = $2', [amount, spaceId]);

            await client.query(
                'INSERT INTO transactions (user_id, merits, type, destination_space_id) VALUES ($1, $2, $3, $4)',
                [userId, -amount, 'offering', spaceId]
            );

            await client.query('COMMIT');

            const updatedUser = await enrichUserWithPermissions(mapRowToCamelCase(updatedUserRes.rows[0]));
            return { updatedUser };
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};
