import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

function getSql() {
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
}

// Lazy initialization prevents build-time connection attempts.
let sqlClient: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!sqlClient) sqlClient = getSql();
  return sqlClient;
}
