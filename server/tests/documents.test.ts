import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import jwt from 'jsonwebtoken';

// Mock database connection pool so it doesn't try to connect to PG
vi.mock('../db.js', () => ({
  pool: {
    query: vi.fn(),
  },
  verifyPassword: vi.fn(),
  mapRowToCamelCase: vi.fn(row => row),
}));

// Mock Models
vi.mock('../models/space.model.js', () => ({
  spaceModel: {
    findById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) {
        return { id: 1, userId: 123, name: 'Giac Ngo', slug: 'giacngo' };
      }
      return null;
    }),
  },
}));

vi.mock('../models/spaceMember.model.js', () => ({
  spaceMemberModel: {
    isMember: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../models/document.model.js', () => ({
  documentModel: {
    find: vi.fn().mockResolvedValue({
      data: [
        {
          id: 12,
          title: 'Bài viết Giác Ngộ số 1',
          summary: 'Tóm tắt bài viết...',
          content: 'Nội dung bài viết...',
          spaceId: 1,
          createdAt: '2026-06-29T00:00:00.000Z',
        },
      ],
      total: 1,
    }),
  },
}));

vi.mock('../models/user.model.js', () => ({
  userModel: {
    findById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 123) {
        return { id: 123, email: 'admin@giac.ngo', isActive: true, isGlobalAdmin: false };
      }
      return null;
    }),
  },
}));

describe('GET /api/v1/documents', () => {
  const secret = 'fallback_secret_giacngo123';
  const token = jwt.sign({ id: 123 }, secret);

  it('should return 401 if not authenticated', async () => {
    const res = await request(app).get('/api/v1/documents?spaceId=1');
    expect(res.status).toBe(401);
  });

  it('should return 400 if spaceId is missing', async () => {
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('spaceId is required');
  });

  it('should return 404 if space does not exist', async () => {
    const res = await request(app)
      .get('/api/v1/documents?spaceId=999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('should return 200 and documents list if authenticated and authorized', async () => {
    const res = await request(app)
      .get('/api/v1/documents?spaceId=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].title).toBe('Bài viết Giác Ngộ số 1');
  });
});
