import { MongoClient, type Db } from "mongodb"

/**
 * MongoDB connection, cached on globalThis so dev hot-reload and repeated
 * serverless invocations reuse one client instead of opening a new
 * connection per request.
 */
const globalForMongo = globalThis as unknown as {
  __visaTrackerMongoClientPromise?: Promise<MongoClient>
}

function getUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env (e.g. MONGODB_URI=mongodb+srv://user:pass@cluster/dbname).",
    )
  }
  return uri
}

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo.__visaTrackerMongoClientPromise) {
    const client = new MongoClient(getUri())
    globalForMongo.__visaTrackerMongoClientPromise = client.connect()
  }
  return globalForMongo.__visaTrackerMongoClientPromise
}

let dbPromise: Promise<Db> | null = null
let indexesEnsured = false

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return
  indexesEnsured = true
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("applications").createIndex({ id: 1 }, { unique: true }),
    db.collection("applications").createIndex({ userId: 1 }),
    db.collection("documents").createIndex({ id: 1 }, { unique: true }),
    db.collection("documents").createIndex({ applicationId: 1 }),
    db.collection("supportTickets").createIndex({ id: 1 }, { unique: true }),
    db.collection("supportTickets").createIndex({ userId: 1 }),
  ])
}

/** Resolves the database used by the app. Uses the db name from the URI's path, or MONGODB_DB as an override. */
export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = await getClientPromise()
      const db = client.db(process.env.MONGODB_DB)
      await ensureIndexes(db)
      return db
    })()
  }
  return dbPromise
}
