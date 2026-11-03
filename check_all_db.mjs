import dotenv from 'dotenv';
dotenv.config();

const { getDbSslConfig } = await import('./db-ssl.js');
const mysql = await import('mysql2/promise');
const ssl = await getDbSslConfig();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 2,
  ...(ssl ? { ssl } : {}),
});

async function main() {
  try {
    const [databases] = await pool.execute(`
      SELECT SCHEMA_NAME
      FROM information_schema.SCHEMATA
      ORDER BY SCHEMA_NAME
    `);

    console.log('\nBASES DE DONNEES ACCESSIBLES :');

    for (const db of databases) {
      const name = db.SCHEMA_NAME;
      console.log(`\n========== ${name} ==========`);

      const [tables] = await pool.execute(`
        SELECT
          TABLE_NAME,
          TABLE_ROWS,
          ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS SIZE_MB,
          TABLE_TYPE
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [name]);

      if (tables.length === 0) {
        console.log('Aucune table visible.');
        continue;
      }

      for (const table of tables) {
        console.log(
          `- ${table.TABLE_NAME} | type=${table.TABLE_TYPE} | lignes estimees=${table.TABLE_ROWS ?? 'N/A'} | taille=${table.SIZE_MB ?? 'N/A'} MiB`
        );
      }
    }
  } catch (error) {
    console.error('Erreur MySQL :', error.message);
  } finally {
    await pool.end();
  }
}

main();
