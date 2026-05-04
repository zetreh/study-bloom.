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

// Admin: Get all users
app.get('/api/users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT email, state FROM users ORDER BY email ASC');
        res.json(rows);
    } catch (err) {
        console.error('GET /api/users error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete user
app.delete('/api/users/:email', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE email = $1', [req.params.email]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/users error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Reset user progress
app.post('/api/users/:email/reset', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT state FROM users WHERE email = $1', [req.params.email]);
        if (rows.length > 0) {
            const userState = rows[0].state;
            userState.credits = 0;
            userState.plant = { type: 'Sunflower', stage: 0, health: 100 };
            
            await pool.query('UPDATE users SET state = $1 WHERE email = $2', [userState, req.params.email]);
            res.json({ success: true, state: userState });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('POST /api/users/reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Community Chat ───────────────────────────────────────────────────────────

// Get all chat messages grouped by channel
app.get('/api/chat', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, group_name, sender, text FROM chat_messages ORDER BY id ASC'
        );

        // Restructure into { general: [...], biology: [...], ... }
        const chat = { general: [], biology: [], history: [], programming: [] };
        for (const row of rows) {
            if (!chat[row.group_name]) chat[row.group_name] = [];
            chat[row.group_name].push({ id: row.id, sender: row.sender, text: row.text });
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
        const { rowCount } = await pool.query('SELECT 1 FROM banned_users WHERE username = $1', [req.body.sender]);
        if (rowCount > 0) {
            return res.status(403).json({ error: 'You are banned from the community chat.' });
        }

        await pool.query(
            'INSERT INTO chat_messages (group_name, sender, text) VALUES ($1, $2, $3)',
            [req.params.group, req.body.sender, req.body.text]
        );

        // Return full updated chat
        const { rows } = await pool.query(
            'SELECT id, group_name, sender, text FROM chat_messages ORDER BY id ASC'
        );
        const chat = { general: [], biology: [], history: [], programming: [] };
        for (const row of rows) {
            if (!chat[row.group_name]) chat[row.group_name] = [];
            chat[row.group_name].push({ id: row.id, sender: row.sender, text: row.text });
        }
        res.json({ success: true, chat });
    } catch (err) {
        console.error('POST /api/chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a chat message
app.delete('/api/chat/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM chat_messages WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get banned users
app.get('/api/banned_users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT username FROM banned_users ORDER BY username ASC');
        res.json(rows.map(r => r.username));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ban a user
app.post('/api/banned_users', async (req, res) => {
    try {
        await pool.query('INSERT INTO banned_users (username) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unban a user
app.delete('/api/banned_users/:username', async (req, res) => {
    try {
        await pool.query('DELETE FROM banned_users WHERE username = $1', [req.params.username]);
        res.json({ success: true });
    } catch (err) {
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

app.listen(PORT, () => {
    console.log(`🌱 Study Grow server running on port ${PORT}`);
});

initDB().catch(err => {
    console.error('❌ Failed to initialize database:', err);
});
