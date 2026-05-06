import { Request, Response, NextFunction } from 'express';
// server/services/syncProgressStore.js
// Isolated store to avoid circular imports between weaviateService and koiiController.

const syncProgress = new Map();

export const getSyncProgress = (aiConfigId: any) => syncProgress.get(Number(aiConfigId)) || null;

export const initProgress = (aiConfigId: any, sources: any) => {
    syncProgress.set(Number(aiConfigId), {
        total: sources.length,
        indexed: 0,
        failed: 0,
        files: sources.map((s: any) => ({
            id: s.id,
            name: s.fileName || (s.type === 'qa' ? `Q&A #${s.id}` : `Source #${s.id}`),
            type: s.type,
            status: 'pending', // pending | indexing | done | failed | skipped
        })),
    });
};

export const updateFileProgress = (aiConfigId: any, sourceId: any, status: any) => {
    const p = syncProgress.get(Number(aiConfigId));
    if (!p) return;
    const file = p.files.find((f: any) => f.id === sourceId);
    if (file) {
        file.status = status;
        if (status === 'done') p.indexed++;
        if (status === 'failed') p.failed++;
    }
};
