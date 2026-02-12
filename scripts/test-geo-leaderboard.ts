
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Maintenant on peut importer
import { calculateGeoLeaderboard } from './lib/utils/geo-leaderboard-utils';

async function test() {
    const userId = 'f8ddb587-6037-4cad-a0d9-107bd02d1338';
    console.log('--- Testing calculateGeoLeaderboard ---');
    try {
        const lh = await calculateGeoLeaderboard(userId, 'national');
        const entry = lh.find(p => p.user_id === userId);
        console.log('Mathis in National Leaderboard:', entry ? { rank: entry.rank, points: entry.points, name: entry.player_name } : 'NOT FOUND');
        console.log('Total players in National:', lh.length);

        if (lh.length > 0) {
            console.log('First 3 players:', lh.slice(0, 3).map(p => ({ name: p.player_name, points: p.points })));
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

test();
