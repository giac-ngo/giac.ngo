import { useEffect } from 'react';

/**
 * Hook: gọi `onClose` khi user nhấn phím ESC.
 * @param onClose - hàm đóng modal/window
 * @param enabled  - bật/tắt hook (default: true)
 */
export function useEscapeKey(onClose: () => void, enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, enabled]);
}
