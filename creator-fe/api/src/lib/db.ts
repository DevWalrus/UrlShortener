import { MongoClient } from 'mongodb';

let clientPromise: Promise<MongoClient> | null = null;

export async function getDb() {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');

    clientPromise = (async () => {
      const c = new MongoClient(uri);
      await c.connect();
      return c;
    })();
  }

  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? 'clintendev');
}
