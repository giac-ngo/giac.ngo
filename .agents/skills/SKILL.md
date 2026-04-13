---
name: GiacNgoVN Project Architecture
description: Kiến trúc tổng thể của platform GiacNgoVN. ĐỌC TRƯỚC KHI CODE bất kỳ thay đổi nào. Ghi lại các pattern quan trọng, tránh lặp lại lỗi đã từng mắc.
---

# GiacNgoVN Platform — Kiến Trúc & Quy Tắc

## 1. Cấu Trúc Tổng Quan

```
GiacNgoVN/
├── client/src/          # React frontend (Vite + TypeScript)
├── server/              # Express.js backend
├── dist/                # Build output → upload lên server
├── public/themes/       # Static assets per space
│   ├── giacngo/         # Theme assets của Giác Ngộ
│   └── tathata/         # Theme assets của Tathata
├── giacngo_homepage.html   # Trang chủ tĩnh của Giác Ngộ
└── tathata_homepage.html   # Trang chủ tĩnh của Tathata
```

## 2. Hai Trang Admin (RẤT QUAN TRỌNG)

| Admin         | URL                          | `isGlobalAdmin` | Logo sidebar         |
|---------------|------------------------------|-----------------|----------------------|
| **Bodhi**     | `login.bodhilab.io/admin`    | `true`          | Logo Bodhi (hardcode)|
| **Space admin** | `giac.ngo/admin`, `tathata.*/admin` | `false` | `currentSpace.imageUrl` (ảnh bìa space) |

**FILE:** `client/src/pages/AdminPage.tsx` dòng ~241:
```tsx
const logoUrl = isGlobalAdmin
  ? 'https://www.bodhilab.io/assets/bodhi-technology-lab-logo-DRtZYi2v.webp'
  : (currentSpace?.imageUrl || ''); // Space admin: chỉ dùng imageUrl, KHÔNG fallback về system logo Bodhi
```

## 3. Multi-Tenant: Custom Domain Flow

- **Root domain** (`login.bodhilab.io`, `localhost`): render app React bình thường
- **Custom domain** (`giac.ngo`, `tathata.bodhilab.io`): qua `CustomDomainPageResolver.tsx`
  - Fetch space by domain → render `iframe` với homepage HTML tương ứng
  - `giac.ngo` → `giacngo_homepage.html` 
  - `tathata.bodhilab.io` → `tathata_homepage.html`

**FILE:** `client/src/components/CustomDomainPageResolver.tsx`

## 4. Favicon — Quy Tắc (ĐÃ FIX, ĐỪNG ĐỔI LẠI)

- **Favicon trên tab browser** = `space.faviconUrl` (field riêng, KHÔNG dùng `imageUrl`)
- `imageUrl` = ảnh bìa (cover image) của space — dùng cho sidebar admin, card, preview
- `faviconUrl` = icon nhỏ cho browser tab

```
space.imageUrl   → sidebar logo, card thumbnail, cover image
space.faviconUrl → <link rel="icon"> trên browser tab
```

Đã fix tại:
- `CustomDomainPageResolver.tsx` — apply favicon khi load custom domain
- `App.tsx` useEffect — apply favicon cho custom domain (dùng `faviconUrl`, KHÔNG dùng `imageUrl`)

## 5. Space Data Model

**FILE:** `client/src/types.ts` — interface `Space`
**FILE:** `server/models/space.model.js` — keyMap camelCase→snake_case

Key mapping quan trọng:
```js
customDomain: 'custom_domain',
faviconUrl: 'favicon_url',     // CẦN MIGRATION: ALTER TABLE spaces ADD COLUMN favicon_url TEXT
payosClientId: 'payos_client_id',
payosApiKey: 'payos_api_key',
payosChecksumKey: 'payos_checksum_key',
venmoHandle: 'venmo_handle',
stripeAccountId: 'stripe_account_id',
```

## 6. Payment Settings — Cấu Trúc (ĐÃ REFACTOR)

**Trước:** PayOS + Venmo nằm trong modal **Quản lý Không gian**
**Sau (hiện tại):** Tất cả nằm trong tab **Cấu hình thanh toán** riêng

- **FILE:** `client/src/components/admin/PaymentSettings.tsx`
- Chứa: PayOS (Client ID, API Key, Checksum Key), Venmo Handle, Stripe Account ID
- **KHÔNG** còn trong `SpaceManagement.tsx` nữa

## 7. Build & Deploy

```bash
npm run build          # Build client, output vào /dist
```
→ Upload toàn bộ `dist/` lên server production.

Sau khi build xong cần upload: `dist/assets/index-*.js`, `dist/assets/index-*.css`

## 8. Database Migrations Pending

```sql
-- Chạy trên PostgreSQL server production:
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS favicon_url TEXT;
```

## 9. Theme Files & Static Assets

```
public/themes/giacngo/
  logo.svg              # Logo SVG Giác Ngộ

public/themes/tathata/
  logo.png              # Logo PNG Tathata (file: 58bY7BZxHkMoyadH_...)
  logo.svg              # Logo SVG backup
  events/               # Ảnh events (event-01.jpg ... event-20.jpg)
```

Homepage HTML reference:
```html
<!-- giacngo_homepage.html -->
<link rel="icon" type="image/svg+xml" href="/themes/giacngo/logo.svg" />

<!-- tathata_homepage.html -->
<link rel="icon" type="image/png" href="/themes/tathata/logo.png" />
<img src="/themes/tathata/logo.png" ... />
```

## 10. Các Lỗi Đã Gặp & Cách Tránh

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Sidebar Space admin hiện Bodhi logo | Fallback về `systemConfig.templateSettings.logoUrl` (= Bodhi) | Chỉ dùng `currentSpace?.imageUrl || ''` |
| Favicon hiện ảnh bìa space | `imageUrl` bị dùng làm favicon | Dùng `faviconUrl` riêng |
| PayOS trong modal Space | Fields PayOS ở SpaceManagement | Đã chuyển sang PaymentSettings |
| JSX unclosed tag | Xóa block thiếu đóng `</div>` | Đếm kỹ thẻ mở/đóng khi xóa block lớn |
