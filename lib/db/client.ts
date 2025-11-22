import { Db, MongoClient } from 'mongodb';

// MongoDB connection
let client: MongoClient | null = null;
let db: Db | null = null;

const MONGO_URI = process.env.MONGO_CONNECTION || '';
const DB_NAME = 'rat-racer';

/**
 * Get MongoDB client (singleton pattern)
 */
export async function getMongoClient(): Promise<MongoClient> {
    if (!MONGO_URI) {
        throw new Error('MONGO_CONNECTION environment variable is not set');
    }

    if (client) {
        return client;
    }

    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    return client;
}

/**
 * Get database instance
 */
export async function getDb(): Promise<Db> {
    if (db) return db;

    const mongoClient = await getMongoClient();
    db = mongoClient.db(DB_NAME);

    // Create indexes on first connection
    await createIndexes(db);

    return db;
}

/**
 * Create database indexes for performance
 */
async function createIndexes(database: Db) {
    try {
        // Rats collection indexes
        await database.collection('rats').createIndex({ id: 1 }, { unique: true });
        await database.collection('rats').createIndex({ tokenId: 1 }, { unique: true });
        await database.collection('rats').createIndex({ owner: 1 });

        // Races collection indexes
        await database.collection('races').createIndex({ id: 1 }, { unique: true });
        await database.collection('races').createIndex({ status: 1 });
        await database.collection('races').createIndex({ createdAt: -1 });

        // Wallets collection indexes
        await database.collection('wallets').createIndex({ address: 1 }, { unique: true });

        console.log('✅ Database indexes created');
    } catch (error) {
        // Indexes might already exist
        console.log('Indexes already exist or error creating:', error);
    }
}

/**
 * Close MongoDB connection (for cleanup)
 */
export async function closeConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}

/**
 * Helper: Generate unique ID
 */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

