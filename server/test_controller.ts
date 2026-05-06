import { getSocialPosts } from './controllers/spaceSocialController.js';

const req = {
    params: { id: '1' },
    query: { page: '1', limit: '10' },
    user: { id: 1 }
} as any;

const res = {
    status: (code: number) => {
        console.log('STATUS:', code);
        return res;
    },
    json: (data: any) => {
        console.log('JSON DATA:', data);
        process.exit();
    }
} as any;

getSocialPosts(req, res).catch(e => console.error(e));
