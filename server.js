require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));

// ─── User State ───────────────────────────────────────────────────────────────

// Get user state
app.get('/api/state/:email', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT state FROM users WHERE email = $1',
            [req.params.email]
        );
        if (rows.length > 0) {
            res.json({ success: true, state: rows[0].state });
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        console.error('GET /api/state error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Save user state (upsert)
app.post('/api/state/:email', async (req, res) => {
    try {
        await pool.query(
            `INSERT INTO users (email, state)
             VALUES ($1, $2)
             ON CONFLICT (email) DO UPDATE SET state = $2`,
            [req.params.email, req.body]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('POST /api/state error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Community Chat ───────────────────────────────────────────────────────────

// Get all chat messages grouped by channel
app.get('/api/chat', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT group_name, sender, text FROM chat_messages ORDER BY id ASC'
        );

        // Restructure into { general: [...], biology: [...], ... }
        const chat = { general: [], biology: [], history: [], programming: [] };
        for (const row of rows) {
            if (!chat[row.group_name]) chat[row.group_name] = [];
            chat[row.group_name].push({ sender: row.sender, text: row.text });
        }
        res.json(chat);
    } catch (err) {
        console.error('GET /api/chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Post a chat message
app.post('/api/chat/:group', async (req, res) => {
    try {
        await pool.query(
            'INSERT INTO chat_messages (group_name, sender, text) VALUES ($1, $2, $3)',
            [req.params.group, req.body.sender, req.body.text]
        );

        // Return full updated chat
        const { rows } = await pool.query(
            'SELECT group_name, sender, text FROM chat_messages ORDER BY id ASC'
        );
        const chat = { general: [], biology: [], history: [], programming: [] };
        for (const row of rows) {
            if (!chat[row.group_name]) chat[row.group_name] = [];
            chat[row.group_name].push({ sender: row.sender, text: row.text });
        }
        res.json({ success: true, chat });
    } catch (err) {
        console.error('POST /api/chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Custom Plants ────────────────────────────────────────────────────────────

// Get all custom plants
app.get('/api/plants', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT data FROM plants ORDER BY id ASC');
        res.json(rows.map(r => r.data));
    } catch (err) {
        console.error('GET /api/plants error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add a custom plant
app.post('/api/plants', async (req, res) => {
    try {
        await pool.query('INSERT INTO plants (data) VALUES ($1)', [req.body]);
        const { rows } = await pool.query('SELECT data FROM plants ORDER BY id ASC');
        res.json({ success: true, plants: rows.map(r => r.data) });
    } catch (err) {
        console.error('POST /api/plants error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Apollo AI Proxy ──────────────────────────────────────────────────────────

const upload = multer({ dest: 'uploads/' });

app.post('/api/apollo', async (req, res) => {
    const { contents } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        res.json({ text: data.candidates[0].content.parts[0].text });
    } catch (err) {
        console.error('Gemini API Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/apollo/upload', upload.single('file'), async (req, res) => {
    res.json({ success: true, file: req.file.originalname });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌱 Study Grow server running on port ${PORT}`);
});

initDB().catch(err => {
    console.error('❌ Failed to initialize database:', err);
});

// Global error handlers to prevent silent crashes
process.on('uncaughtException', err => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
