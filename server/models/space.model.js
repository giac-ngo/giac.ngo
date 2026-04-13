
// server/models/space.model.js
import { pool, mapRowToCamelCase } from '../db.js';
import { userModel, enrichUserWithPermissions } from './user.model.js';

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
    async findAll() {
        const res = await pool.query(BASE_SPACE_QUERY + ' ORDER BY s.space_sort ASC NULLS LAST');
        return res.rows.map(mapRowToCamelCase);
    },

    // FIX: Add findById method to fetch a space by its numeric ID.
    async findById(id) {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.id = $1`, [id]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async findBySlug(slug) {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.slug = $1`, [slug]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async findByCustomDomain(domain) {
        const res = await pool.query(`${BASE_SPACE_QUERY} WHERE s.custom_domain = $1`, [domain]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async create(data) {
        const { userId, spaceSort, slug, name, nameEn, description, descriptionEn, imageUrl, locationText, locationTextEn, membersCount, views, likes, rating, tags, tagsEn, typeId, spaceColor, status, statusEn, event, eventEn, website, phoneNumber, email, stripeAccountId, hasMeditation, hasLibrary, hasDharmaTalks } = data;
        const res = await pool.query(
            `INSERT INTO spaces (user_id, space_sort, slug, name, name_en, description, description_en, image_url, location_text, location_text_en, members_count, views, likes, rating, tags, tags_en, type_id, space_color, status, status_en, event, event_en, website, phone_number, email, stripe_account_id, has_meditation, has_library, has_dharma_talks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29) RETURNING *`,
            [userId, spaceSort, slug, name, nameEn, description, descriptionEn, imageUrl, locationText, locationTextEn, membersCount, views, likes, rating, tags, tagsEn, typeId, spaceColor, status, statusEn, event, eventEn, website, phoneNumber, email, stripeAccountId, hasMeditation ?? true, hasLibrary ?? true, hasDharmaTalks ?? true]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        // Map camelCase keys to snake_case column names
        const keyMap = {
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
            emailTemplate: 'email_template',
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
        return mapRowToCamelCase(res.rows[0]);
    },


    async delete(id) {
        const res = await pool.query('DELETE FROM spaces WHERE id = $1 RETURNING *', [id]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async incrementViews(id) {
        // No need to return anything, just update the count.
        await pool.query('UPDATE spaces SET views = views + 1 WHERE id = $1', [id]);
    },

    async incrementLikes(id) {
        const res = await pool.query('UPDATE spaces SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
        return res.rows[0];
    },

    async findDharmaTalksBySpaceId(spaceId) {
        const res = await pool.query(
            'SELECT * FROM dharma_talks WHERE space_id = $1 ORDER BY date DESC NULLS LAST',
            [spaceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async findDocumentsBySpaceId(spaceId) {
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

    async findAllDharmaTalks() {
        const res = await pool.query(
            `SELECT dt.*, s.name as space_name 
             FROM dharma_talks dt 
             LEFT JOIN spaces s ON dt.space_id = s.id 
             ORDER BY dt.date DESC NULLS LAST`
        );
        return res.rows.map(mapRowToCamelCase);
    },

    /**
     * Record a QR code donation. If userId is provided (logged-in user),
     * credits the space's merit balance and creates a transaction.
     * Guests (no userId) are recorded with a note but receive no Merit.
     */
    async addQrDonation(spaceId, userId, amount, note, billImageUrl) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Always add to space merit balance regardless of user login status
            await client.query(
                'UPDATE spaces SET merits = merits + $1 WHERE id = $2',
                [amount, spaceId]
            );

            // Record transaction (userId may be null for guests)
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
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async makeOffering(spaceId, userId, amount) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const user = await userModel.findById(userId);
            if (!user) throw new Error('User not found.');
            if (user.merits !== null && user.merits < amount) {
                throw new Error('Insufficient merits.');
            }

            // Deduct from user
            let updatedUserRes;
            if (user.merits !== null) {
                updatedUserRes = await client.query('UPDATE users SET merits = merits - $1 WHERE id = $2 RETURNING *', [amount, userId]);
            } else {
                updatedUserRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            }

            // Add to space
            await client.query('UPDATE spaces SET merits = merits + $1 WHERE id = $2', [amount, spaceId]);

            // Create transaction
            await client.query(
                'INSERT INTO transactions (user_id, merits, type, destination_space_id) VALUES ($1, $2, $3, $4)',
                [userId, -amount, 'offering', spaceId]
            );

            await client.query('COMMIT');

            const updatedUser = await enrichUserWithPermissions(mapRowToCamelCase(updatedUserRes.rows[0]));
            return { updatedUser };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};
