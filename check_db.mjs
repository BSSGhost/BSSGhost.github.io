import dotenv from 'dotenv';
dotenv.config();
const { getDbSslConfig } = await import('./db-ssl.js');

const mysql = await import('mysql2/promise');
const ssl = await getDbSslConfig();
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sunu_moyenne',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...(ssl ? { ssl } : {}),
});

async function main() {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables existantes :');
    tables.forEach((t) => {
      const name = Object.values(t)[0];
      console.log(' -', name);
    });
    
    // Check structure of existing tables
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      try {
        const [columns] = await pool.execute(`DESCRIBE \`${tableName}\``);
        console.log(`\nStructure de \`${tableName}\` :`);
        columns.forEach((c) => {
          console.log(` - ${c.Field} (${c.Type}) KEY=${c.Key} NULL=${c.Null}`);
        });
      } catch (e) {
        console.log(`Erreur lecture \`${tableName}\`:`, e.message);
      }
    }
  } catch (error) {
    console.error('Erreur MySQL:', error.message);
  } finally {
    await pool.end();
  }
}

main();