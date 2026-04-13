import React, { useState } from 'react';

/**
 * UserAvatar — Hiển thị ảnh đại diện hoặc ký tự đầu tiên của tên người dùng.
 * Props:
 *   name      — tên người dùng (bắt buộc)
 *   url       — URL ảnh (tùy chọn; null/undefined/'' sẽ dùng initials)
 *   size      — kích thước (px), mặc định 40
 *   className — class Tailwind bổ sung (tùy chọn)
 *   style     — inline style bổ sung (tùy chọn)
 */
interface UserAvatarProps {
    name: string;
    url?: string | null;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

// Palette earthy-warm — phù hợp với Temple Wood theme
const INITIALS_PALETTE = [
    { bg: 'hsl(0,  55%, 38%)', fg: 'hsl(44, 55%, 92%)' },   // crimson
    { bg: 'hsl(28, 50%, 32%)', fg: 'hsl(44, 55%, 90%)' },   // teak
    { bg: 'hsl(35, 65%, 35%)', fg: 'hsl(44, 60%, 92%)' },   // amber
    { bg: 'hsl(170, 35%, 28%)', fg: 'hsl(170, 40%, 85%)' }, // sage
    { bg: 'hsl(220, 35%, 38%)', fg: 'hsl(220, 60%, 90%)' }, // slate blue
    { bg: 'hsl(290, 30%, 38%)', fg: 'hsl(290, 40%, 90%)' }, // plum
    { bg: 'hsl(130, 30%, 30%)', fg: 'hsl(130, 40%, 88%)' }, // forest
    { bg: 'hsl(195, 40%, 30%)', fg: 'hsl(195, 50%, 88%)' }, // teal
];

function isValidUrl(url?: string | null): boolean {
    if (!url) return false;
    // Reject placeholder-like values
    if (url.trim() === '' || url === 'null' || url === 'undefined') return false;
    return true;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, url, size = 40, className, style }) => {
    const [imgError, setImgError] = useState(false);
    const validUrl = isValidUrl(url) && !imgError;

    const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
    const colorIndex = Math.abs((name ?? '').charCodeAt(0)) % INITIALS_PALETTE.length;
    const { bg, fg } = INITIALS_PALETTE[colorIndex];

    const baseStyle: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        objectFit: 'cover',
        ...style,
    };

    if (validUrl) {
        return (
            <img
                src={url!}
                alt={name}
                className={className}
                style={{ ...baseStyle, display: undefined } as React.CSSProperties}
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div
            className={className}
            style={{
                ...baseStyle,
                background: bg,
                color: fg,
                fontWeight: 700,
                fontSize: size * 0.42,
                userSelect: 'none',
                letterSpacing: '-0.5px',
            }}
        >
            {initial}
        </div>
    );
};

export default UserAvatar;
