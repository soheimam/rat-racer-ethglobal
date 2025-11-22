import { Db, MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';

// MongoDB connection
let client: MongoClient | null = null;
let db: Db | null = null;

const MONGO_URI = process.env.MONGO_CONNECTION || '';
const DB_NAME = 'rat-racer';

/**
 * Get MongoDB client (singleton pattern)
 * Uses MongoDB Stable API v1 as recommended by Atlas
 */
export async function getMongoClient(): Promise<MongoClient> {
    if (!MONGO_URI) {
        throw new Error('MONGO_CONNECTION environment variable is not set');
    }

    if (client) {
        try {
            // Ping to check if connection is still alive
            await client.db('admin').command({ ping: 1 });
            return client;
        } catch (error) {
            console.log('⚠️ Existing connection dead, reconnecting...');
            client = null;
        }
    }

    // MongoDB Atlas recommended options with Stable API
    const options: MongoClientOptions = {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
        retryWrites: true,
        retryReads: true,
    };

    try {
        client = new MongoClient(MONGO_URI, options);
        await client.connect();

        // Verify connection with ping
        await client.db('admin').command({ ping: 1 });
        console.log('✅ Pinged deployment. Successfully connected to MongoDB!');

        return client;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        client = null;
        throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    }
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

