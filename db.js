require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : false
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            state JSONB NOT NULL DEFAULT '{}'
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            group_name TEXT NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS plants (
            id SERIAL PRIMARY KEY,
            data JSONB NOT NULL
        );
    `);

    // Seed default chat messages if the table is empty
    const { rowCount } = await pool.query('SELECT 1 FROM chat_messages LIMIT 1');
    if (rowCount === 0) {
        const defaults = [
            { group: 'general',     text: 'Welcome to General Chat! Share your notes here.' },
            { group: 'biology',     text: 'Biology study group active.' },
            { group: 'history',     text: 'Discuss history timelines here.' },
            { group: 'programming', text: 'Share your code snippets!' },
        ];
        for (const d of defaults) {
            await pool.query(
                'INSERT INTO chat_messages (group_name, sender, text) VALUES ($1, $2, $3)',
                [d.group, 'System', d.text]
            );
        }
    }

    console.log('✅ Database initialized successfully');
}

module.exports = { pool, initDB };
