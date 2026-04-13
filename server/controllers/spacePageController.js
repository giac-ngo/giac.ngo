// server/controllers/spacePageController.js
import { pool, mapRowToCamelCase } from '../db.js';
import { spaceModel } from '../models/space.model.js';
import { mailService } from '../services/mailService.js';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.join(__filename, '..'));

// ─── DB Helpers ────────────────────────────────────────────────────────────

async function getPagesBySpace(spaceId) {
    const res = await pool.query(
        'SELECT * FROM space_pages WHERE space_id = $1 ORDER BY created_at ASC',
        [spaceId]
    );
    return res.rows.map(mapRowToCamelCase);
}

async function getPageById(pageId) {
    const res = await pool.query('SELECT * FROM space_pages WHERE id = $1', [pageId]);
    return mapRowToCamelCase(res.rows[0]);
}

async function getAssetsBySpace(spaceId) {
    const res = await pool.query(
        'SELECT * FROM space_page_assets WHERE space_id = $1 ORDER BY created_at DESC',
        [spaceId]
    );
    return res.rows.map(mapRowToCamelCase);
}

// ─── Shortcode Engine ───────────────────────────────────────────────────────

async function renderShortcodes(html, space) {
    const spaceId = space.id;

    // Basic text shortcodes
    if (html.includes('{{space_name}}')) html = html.replaceAll('{{space_name}}', space.name || '');
    if (html.includes('{{space_description}}')) html = html.replaceAll('{{space_description}}', space.description || '');
    if (html.includes('{{space_logo}}')) html = html.replaceAll('{{space_logo}}', space.avatarUrl || '/themes/giacngo/logo.svg');

    // Counts
    if (html.includes('{{agents_count}}')) {
        const res = await pool.query('SELECT COUNT(*) FROM ai_configs WHERE space_id = $1', [spaceId]);
        html = html.replaceAll('{{agents_count}}', res.rows[0].count);
    }
    if (html.includes('{{conversations_count}}')) {
        // Technically conversations link to AI Configs which link to Space.
        // For simplicity, we can do a JOIN or a subquery.
        const res = await pool.query(`
            SELECT COUNT(*) FROM conversations c
            JOIN ai_configs a ON c.ai_config_id = a.id
            WHERE a.space_id = $1
        `, [spaceId]);
        let formattedStr = res.rows[0].count;
        if (Number(formattedStr) > 1000) {
            formattedStr = (Number(formattedStr) / 1000).toFixed(1) + 'K';
        }
        html = html.replaceAll('{{conversations_count}}', formattedStr);
    }

    // {{members_count}}
    if (html.includes('{{members_count}}')) {
        const res = await pool.query(
            'SELECT COUNT(*) FROM space_members WHERE space_id = $1', [spaceId]
        );
        html = html.replaceAll('{{members_count}}', res.rows[0].count);
    }

    // {{dharma_talks}}
    if (html.includes('{{dharma_talks}}')) {
        const res = await pool.query(
            'SELECT * FROM dharma_talks WHERE space_id = $1 ORDER BY date DESC LIMIT 10', [spaceId]
        );
        const talks = res.rows.map(mapRowToCamelCase);
        const talksHtml = talks.length
            ? `<div class="gc-dharma-talks">${talks.map(t => `
                <div class="gc-card">
                    ${t.thumbnailUrl ? `<img src="${t.thumbnailUrl}" alt="${t.title}">` : ''}
                    <h3>${t.title || ''}</h3>
                    <p>${t.date ? new Date(t.date).toLocaleDateString('vi-VN') : ''}</p>
                </div>`).join('')}</div>`
            : '<p>Chưa có pháp thoại nào.</p>';
        html = html.replaceAll('{{dharma_talks}}', talksHtml);
    }

    // {{library}}
    if (html.includes('{{library}}')) {
        const res = await pool.query(
            'SELECT d.*, da.name AS author FROM documents d LEFT JOIN document_authors da ON d.author_id = da.id WHERE d.space_id = $1 ORDER BY d.created_at DESC LIMIT 10',
            [spaceId]
        );
        const docs = res.rows.map(mapRowToCamelCase);
        const libHtml = docs.length
            ? `<div class="gc-library">${docs.map(d => `
                <div class="gc-card">
                    ${d.coverUrl ? `<img src="${d.coverUrl}" alt="${d.title}">` : ''}
                    <h3>${d.title || ''}</h3>
                    <p>${d.author || ''}</p>
                </div>`).join('')}</div>`
            : '<p>Chưa có tài liệu nào.</p>';
        html = html.replaceAll('{{library}}', libHtml);
    }

    // {{events}}
    if (html.includes('{{events}}')) {
        const eventText = space.event || 'Chưa có sự kiện nào.';
        html = html.replaceAll('{{events}}', `<div class="gc-events"><p>${eventText}</p></div>`);
    }

    // {{contact_form}}
    if (html.includes('{{contact_form}}')) {
        const contactFormHtml = `
<form class="gc-contact-form" action="/api/spaces/${spaceId}/contact" method="POST">
    <div><label>Họ tên</label><input type="text" name="name" required></div>
    <div><label>Email</label><input type="email" name="email" required></div>
    <div><label>Tin nhắn</label><textarea name="message" rows="5" required></textarea></div>
    <button type="submit">Gửi</button>
</form>
<script>
document.querySelector('.gc-contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch(form.action, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const result = await res.json();
    alert(result.message || (res.ok ? 'Gửi thành công!' : 'Có lỗi xảy ra.'));
    if (res.ok) form.reset();
});
</script>`;
        html = html.replaceAll('{{contact_form}}', contactFormHtml);
    }

    // {{agents}} or {{agents:1,5,8}}
    const agentsMatch = html.match(/\{\{agents(?::([0-9,]+))?\}\}/);
    if (agentsMatch) {
        const fullMatch = agentsMatch[0];
        const filterIds = agentsMatch[1] ? agentsMatch[1].split(',').map(Number).filter(n => !isNaN(n)) : null;
        
        let query, params;
        if (filterIds && filterIds.length > 0) {
            query = 'SELECT * FROM ai_configs WHERE space_id = $1 AND id = ANY($2::int[]) ORDER BY id ASC';
            params = [spaceId, filterIds];
        } else {
            query = 'SELECT * FROM ai_configs WHERE space_id = $1 ORDER BY id ASC';
            params = [spaceId];
        }
        
        const res = await pool.query(query, params);
        const agents = res.rows.map(mapRowToCamelCase);
        
        const agentsHtml = agents.length ? `
        <style>
            .gn-agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
            .gn-agent-card { background: white; border: 1px solid #e8d9b9; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
            .gn-agent-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
            .gn-card-img { height: 160px; background: #3b2a1a; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .gn-card-img img { width: 100%; height: 100%; object-fit: cover; }
            .gn-card-body { padding: 24px; display: flex; flex-direction: column; flex: 1; text-align: left; }
            .gn-agent-name { margin: 0 0 4px; font-size: 1.25rem; font-weight: 700; color: #3b2a1a; }
            .gn-agent-desc { margin: 0 0 12px; font-size: 0.9rem; color: #8c7b75; line-height: 1.5; }
            .gn-divider { border: 0; border-top: 1px solid #f0e6d2; margin: 16px 0; }
            .gn-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 0.85rem; }
            .gn-tag { background: #fdf8f0; color: #991b1b; padding: 4px 10px; border-radius: 12px; font-weight: 600; }
            .gn-price { font-weight: 600; color: #991b1b; margin-bottom: 16px; margin-top: auto; }
            .gn-btn { display: block; width: 100%; text-align: center; background: #fdf8f0; border: 1px solid #7f1d1d; color: #7f1d1d; padding: 12px 0; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; transition: 0.2s; box-sizing: border-box; }
            .gn-btn:hover { background: #7f1d1d; color: white; }
        </style>
        <div class="gn-agents-grid">
            ${agents.map(ai => {
                let priceText = 'Miễn phí';
                if (ai.purchaseCost > 0) priceText = `${ai.purchaseCost} merits`;
                else if (ai.meritCost > 0) priceText = `${ai.meritCost} merit/yêu cầu`;
                else if (ai.isContactForAccess) priceText = 'Liên hệ';
                
                const imgSrc = ai.avatarUrl || '/themes/giacngo/logo.svg';
                
                return `
                <div class="gn-agent-card">
                    <div class="gn-card-img"><img src="${imgSrc}" alt="${ai.name}" onerror="this.src='/themes/giacngo/logo.svg'" /></div>
                    <div class="gn-card-body">
                        <h3 class="gn-agent-name">${ai.name || 'AI Agent'}</h3>
                        <p class="gn-agent-desc">${(ai.description || '').substring(0, 100)}...</p>
                        <div class="gn-divider"></div>
                        <div class="gn-meta">
                            <span class="gn-tag">${ai.modelName || 'AI Model'}</span>
                        </div>
                        <div class="gn-price">${priceText}</div>
                        <button onclick="window.parent.postMessage({type: 'NAVIGATE', aiId: '${ai.id}'}, '*')" class="gn-btn">Khám phá Agent</button>
                    </div>
                </div>`;
            }).join('')}
        </div>` : '<p style="text-align:center;width:100%;color:#8c7b75;">Chưa có AI Agent nào.</p>';
        
        html = html.replaceAll(fullMatch, agentsHtml);
    }

    // {{donation_form}}
    if (html.includes('{{donation_form}}')) {
        const donationHtml = `
        <style>
            .gn-donate-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 20px; align-items: stretch; font-family: 'Inter', sans-serif;}
            .gn-donate-card { background: #fdf8f0; border: 1px solid #e8d9b9; border-radius: 16px; padding: 32px 28px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
            .gn-donate-card.featured { background: #7f1d1d; color: white; border: none; transform: scale(1.02); box-shadow: 0 8px 32px rgba(127,29,29,0.25); }
            .gn-donate-card.featured .gn-btn { background: white; color: #7f1d1d; border-color: white; }
            .gn-donate-card.featured .gn-donate-title { color: white; }
            .gn-donate-card.featured .gn-donate-price { color: white; }
            .gn-donate-card.featured .gn-donate-sub { color: rgba(255,255,255,0.7); }
            
            .gn-donate-title { font-size: 1.6rem; font-weight: 700; margin: 0 0 4px; color: #3b2a1a; }
            .gn-donate-sub { font-size: 1rem; color: #8c7b75; margin: 0 0 20px; }
            .gn-donate-price { font-size: 2.8rem; font-weight: 700; color: #991b1b; margin: 0 0 4px; }
            .gn-donate-detail { font-size: 0.9rem; font-style: italic; margin: 0 0 24px; color: #a39e8c;}
            .gn-btn { margin-top: auto; display: block; width: 100%; text-align: center; background: #7f1d1d; border: 1px solid #7f1d1d; color: white; padding: 13px 0; border-radius: 8px; font-weight: 700; font-size: 1.1rem; cursor: pointer; text-decoration: none; transition: 0.2s; box-sizing: border-box; }
            .gn-btn:hover { opacity: 0.9; }
        </style>
        <div class="gn-donate-grid">
            <div class="gn-donate-card">
                <p class="gn-donate-title">Gieo Duyên</p>
                <p class="gn-donate-sub">Planting the Seed</p>
                <img src="/themes/giacngo/nhang.png" style="height: 72px; margin-bottom: 20px;" alt="nhang"/>
                <p class="gn-donate-price">$2</p>
                <p class="gn-donate-detail">50 yêu cầu AI chat</p>
                <button class="gn-btn" onclick="window.parent.postMessage({type: 'OPEN_DONATION_MODAL', title: 'Gieo Duyên', amount: 2}, '*')">Cúng dường ngay</button>
            </div>
            
            <div class="gn-donate-card featured">
                <p style="font-size: 0.85rem; font-weight: 700; color: #f5c842; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 6px 0;">Hoằng Pháp</p>
                <p class="gn-donate-title">Phật Sự</p>
                <p class="gn-donate-sub">The Work of Awakening</p>
                <img src="/themes/giacngo/sach.png" style="height: 72px; margin-bottom: 20px; filter: brightness(1.2);" alt="sách"/>
                <p class="gn-donate-price">$8</p>
                <p class="gn-donate-detail" style="color: rgba(255,255,255,0.6)">250 + tặng 50 yêu cầu</p>
                <button class="gn-btn" onclick="window.parent.postMessage({type: 'OPEN_DONATION_MODAL', title: 'Phật Sự', amount: 8}, '*')">Cúng dường ngay</button>
            </div>

            <div class="gn-donate-card">
                <p class="gn-donate-title">Từ Bi Hạnh</p>
                <p class="gn-donate-sub">Custom Amount</p>
                <img src="/themes/giacngo/hoasen.png" style="height: 72px; margin-bottom: 20px;" alt="hoa sen"/>
                <p class="gn-donate-price">Tuỳ Tâm</p>
                <p class="gn-donate-detail">25 yêu cầu mỗi $1</p>
                <button class="gn-btn" onclick="window.parent.postMessage({type: 'OPEN_DONATION_MODAL', title: 'Từ Bi Hạnh', amount: 5}, '*')">Cúng dường ngay</button>
            </div>
        </div>
        `;
        html = html.replaceAll('{{donation_form}}', donationHtml);
    }

    // {{donation_button}}
    if (html.includes('{{donation_button}}')) {
        const btnHtml = `<button class="gn-btn" style="background: #7f1d1d; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer;" onclick="window.parent.postMessage({type: 'OPEN_DONATION_MODAL', title: 'Tuỳ Tâm', amount: 0}, '*')">Cúng dường</button>`;
        html = html.replaceAll('{{donation_button}}', btnHtml);
    }

    return html;
}

// ─── Build full HTML page ───────────────────────────────────────────────────

async function buildHtmlPage(page, space, assets) {
    const cssAssets = assets.filter(a => a.fileType === 'css');
    const jsAssets = assets.filter(a => a.fileType === 'js');

    let html = page.html || '<p>Trang này chưa có nội dung.</p>';
    // Process shortcodes
    html = await renderShortcodes(html, space);

    const cssLinks = cssAssets.map(a => `<link rel="stylesheet" href="${a.url}">`).join('\n    ');
    const jsScripts = jsAssets.map(a => `<script src="${a.url}"></script>`).join('\n    ');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} - ${space.name}</title>
    ${cssLinks}
</head>
<body>
    ${html}
    ${jsScripts}
</body>
</html>`;
}

// ─── Controller ────────────────────────────────────────────────────────────

export const spacePageController = {
    async listPages(req, res) {
        try {
            const spaceId = parseInt(req.params.id, 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });
            const pages = await getPagesBySpace(spaceId);
            const assets = await getAssetsBySpace(spaceId);
            res.json({ pages, assets });
        } catch (err) {
            console.error('listPages error:', err);
            res.status(500).json({ message: 'Failed to fetch pages.' });
        }
    },

    async getPage(req, res) {
        try {
            const pageId = parseInt(req.params.pageId, 10);
            if (isNaN(pageId)) return res.status(400).json({ message: 'Invalid page ID.' });
            const page = await getPageById(pageId);
            if (!page) return res.status(404).json({ message: 'Page not found.' });
            res.json(page);
        } catch (err) {
            console.error('getPage error:', err);
            res.status(500).json({ message: 'Failed to fetch page.' });
        }
    },

    async createPage(req, res) {
        try {
            const spaceId = parseInt(req.params.id, 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });
            const { title, slug, pageType = 'custom', html = '', isPublished = false } = req.body;
            if (!title || !slug) return res.status(400).json({ message: 'Title and slug are required.' });

            const res2 = await pool.query(
                `INSERT INTO space_pages (id, space_id, title, slug, page_type, html, is_published)
                 VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM space_pages), $1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [spaceId, title, slug, pageType, html, isPublished]
            );
            res.status(201).json(mapRowToCamelCase(res2.rows[0]));
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ message: 'Slug này đã tồn tại trong space.' });
            }
            console.error('createPage error:', err);
            res.status(500).json({ message: 'Failed to create page.' });
        }
    },

    async updatePage(req, res) {
        try {
            const pageId = parseInt(req.params.pageId, 10);
            if (isNaN(pageId)) return res.status(400).json({ message: 'Invalid page ID.' });
            const { title, slug, html, isPublished, pageType } = req.body;

            const fields = [];
            const values = [];
            let i = 1;
            if (title !== undefined) { fields.push(`title = $${i++}`); values.push(title); }
            if (slug !== undefined) { fields.push(`slug = $${i++}`); values.push(slug); }
            if (html !== undefined) { fields.push(`html = $${i++}`); values.push(html); }
            if (isPublished !== undefined) { fields.push(`is_published = $${i++}`); values.push(isPublished); }
            if (pageType !== undefined) { fields.push(`page_type = $${i++}`); values.push(pageType); }
            fields.push(`updated_at = NOW()`);
            values.push(pageId);

            const query = `UPDATE space_pages SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
            const result = await pool.query(query, values);
            if (!result.rows[0]) return res.status(404).json({ message: 'Page not found.' });
            res.json(mapRowToCamelCase(result.rows[0]));
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ message: 'Slug này đã tồn tại trong space.' });
            }
            console.error('updatePage error:', err);
            res.status(500).json({ message: 'Failed to update page.' });
        }
    },

    async deletePage(req, res) {
        try {
            const pageId = parseInt(req.params.pageId, 10);
            if (isNaN(pageId)) return res.status(400).json({ message: 'Invalid page ID.' });
            await pool.query('DELETE FROM space_pages WHERE id = $1', [pageId]);
            res.status(204).send();
        } catch (err) {
            console.error('deletePage error:', err);
            res.status(500).json({ message: 'Failed to delete page.' });
        }
    },

    async uploadAsset(req, res) {
        try {
            const spaceId = parseInt(req.params.id, 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });
            if (!req.file) return res.status(400).json({ message: 'No file provided.' });

            const ext = path.extname(req.file.originalname).toLowerCase();
            let fileType = 'other';
            if (['.css'].includes(ext)) fileType = 'css';
            else if (['.js'].includes(ext)) fileType = 'js';
            else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) fileType = 'image';

            const url = `/uploads/pages/${spaceId}/${req.file.filename}`;
            const result = await pool.query(
                `INSERT INTO space_page_assets (id, space_id, file_type, filename, url)
                 VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM space_page_assets), $1, $2, $3, $4) RETURNING *`,
                [spaceId, fileType, req.file.originalname, url]
            );
            res.status(201).json(mapRowToCamelCase(result.rows[0]));
        } catch (err) {
            console.error('uploadAsset error:', err);
            res.status(500).json({ message: 'Failed to upload asset.' });
        }
    },

    async deleteAsset(req, res) {
        try {
            const assetId = parseInt(req.params.assetId, 10);
            if (isNaN(assetId)) return res.status(400).json({ message: 'Invalid asset ID.' });

            const assetRes = await pool.query('SELECT * FROM space_page_assets WHERE id = $1', [assetId]);
            if (!assetRes.rows[0]) return res.status(404).json({ message: 'Asset not found.' });
            const asset = mapRowToCamelCase(assetRes.rows[0]);

            // Delete file from disk
            try {
                const filePath = path.join(__dirname, '..', asset.url);
                await fs.unlink(filePath);
            } catch {
                // File might already be deleted, ignore
            }

            await pool.query('DELETE FROM space_page_assets WHERE id = $1', [assetId]);
            res.status(204).send();
        } catch (err) {
            console.error('deleteAsset error:', err);
            res.status(500).json({ message: 'Failed to delete asset.' });
        }
    },

    /**
     * Serves the HTML page for a custom domain request.
     * Called from the middleware in server/index.js
     */
    async serveCustomDomainPage(req, res, space) {
        try {
            // If it's a POST to /contact, handle separately
            if (req.method === 'POST' && req.path === `/api/spaces/${space.id}/contact`) {
                return; // handled by route
            }

            // Determine slug from path
            let slug = req.path || '/';
            if (!slug.startsWith('/')) slug = '/' + slug;
            if (slug !== '/' && slug.endsWith('/')) slug = slug.slice(0, -1);

            // Look for the page
            let pageRes = await pool.query(
                'SELECT * FROM space_pages WHERE space_id = $1 AND slug = $2 AND is_published = true',
                [space.id, slug]
            );

            // Fallback to home page for root or if not found
            if (!pageRes.rows[0]) {
                pageRes = await pool.query(
                    `SELECT * FROM space_pages WHERE space_id = $1 AND page_type = 'home' AND is_published = true LIMIT 1`,
                    [space.id]
                );
            }

            if (!pageRes.rows[0]) {
                return res.status(404).send(`<html><body><h1>Trang không tìm thấy</h1><p>${space.name}</p></body></html>`);
            }

            const page = mapRowToCamelCase(pageRes.rows[0]);
            const assets = await getAssetsBySpace(space.id);
            const fullHtml = await buildHtmlPage(page, space, assets);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(fullHtml);
        } catch (err) {
            console.error('serveCustomDomainPage error:', err);
            res.status(500).send('<html><body><h1>Server Error</h1></body></html>');
        }
    },

    /**
     * Called from the React SPA to fetch a rendered custom page via iframe.
     * Route: GET /api/spaces/:slug/published-page/:pageSlug(*)?
     */
    async servePublicPage(req, res) {
        try {
            const { slug, pageSlug } = req.params;
            // DB stores slugs WITHOUT leading slash (e.g. 'tathata', not '/tathata')
            const space = await spaceModel.findBySlug(slug);
            
            if (!space) {
                return res.status(404).send('<html><body><h1>Không tìm thấy không gian này.</h1></body></html>');
            }

            // Determine page slug from path
            let searchSlug = pageSlug ? '/' + pageSlug : '/';
            if (searchSlug !== '/' && searchSlug.endsWith('/')) searchSlug = searchSlug.slice(0, -1);

            // Look for the page
            let pageRes = await pool.query(
                'SELECT * FROM space_pages WHERE space_id = $1 AND slug = $2 AND is_published = true',
                [space.id, searchSlug]
            );

            // Fallback to home page if not found and searching for root
            if (!pageRes.rows[0] && searchSlug === '/') {
                pageRes = await pool.query(
                    `SELECT * FROM space_pages WHERE space_id = $1 AND page_type = 'home' AND is_published = true LIMIT 1`,
                    [space.id]
                );
            }

            if (!pageRes.rows[0]) {
                return res.status(404).send('<html><body><h1>Trang không tìm thấy</h1></body></html>');
            }

            const page = mapRowToCamelCase(pageRes.rows[0]);
            const assets = await getAssetsBySpace(space.id);
            const fullHtml = await buildHtmlPage(page, space, assets);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(fullHtml);
        } catch (err) {
            console.error('servePublicPage error:', err);
            res.status(500).send('<html><body><h1>Server Error</h1></body></html>');
        }
    },

    /**
     * Handles contact form submissions from custom domain pages.
     */
    async handleContactForm(req, res) {
        try {
            const spaceId = parseInt(req.params.id, 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

            const space = await spaceModel.findById(spaceId);
            if (!space) return res.status(404).json({ message: 'Space not found.' });

            const { name, email, message } = req.body;
            if (!name || !email || !message) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
            }

            const toEmail = space.email || process.env.ADMIN_EMAIL;
            if (!toEmail) {
                return res.status(500).json({ message: 'Space chưa cấu hình email liên hệ.' });
            }

            // Use per-space SMTP if configured, otherwise fall back to global
            if (space.smtpHost && space.smtpUser && space.smtpPass) {
                const spaceTransport = nodemailer.createTransport({
                    host: space.smtpHost,
                    port: parseInt(space.smtpPort || '465', 10),
                    secure: (String(space.smtpPort || '465')) === '465',
                    auth: { user: space.smtpUser, pass: space.smtpPass },
                });
                const fromName = space.smtpFromName || space.name;
                await spaceTransport.sendMail({
                    from: `${fromName} <${space.smtpUser}>`,
                    to: toEmail,
                    replyTo: email,
                    subject: `[${space.name}] Liên hệ từ: ${name}`,
                    html: `<p><strong>Từ:</strong> ${name} &lt;${email}&gt;</p><hr><pre style="white-space:pre-wrap;font-family:sans-serif">${message}</pre>`,
                });
            } else {
                await mailService.sendContactFormEmail({
                    name, email, spaceName: space.name, message
                });
            }

            res.json({ message: 'Cảm ơn bạn! Chúng tôi sẽ phản hồi sớm nhất có thể.' });
        } catch (err) {
            console.error('handleContactForm error:', err);
            res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại.' });
        }
    }
};
