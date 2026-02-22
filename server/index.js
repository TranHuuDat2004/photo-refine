require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '../')));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

// Health check
app.get('/health', (req, res) => res.send('PhotoRefine Cloud Sync Server is running!'));

// Render Main Page
app.get('/', (req, res) => {
    res.render('index');
});

// Upload image to GitHub
app.post('/upload', async (req, res) => {
    try {
        const { image, fileName } = req.body;
        if (!image || !fileName) {
            return res.status(400).json({ error: 'Missing image or fileName' });
        }

        // Remove data:image/png;base64, prefix
        const base64Content = image.split(',')[1];
        const path = `edits/${fileName}`;
        const url = `https://api.github.com/repos/${REPO}/contents/${path}`;

        console.log(`Uploading to GitHub: ${path}`);

        const response = await axios.put(url, {
            message: `Save edit: ${fileName}`,
            content: base64Content,
            branch: BRANCH
        }, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        res.json({
            success: true,
            url: response.data.content.download_url,
            id: response.data.content.sha
        });
    } catch (error) {
        console.error('GitHub Upload Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to upload to GitHub', details: error.response?.data });
    }
});

// Get history from GitHub
app.get('/history', async (req, res) => {
    try {
        const url = `https://api.github.com/repos/${REPO}/contents/edits?ref=${BRANCH}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        // Map files to history items
        // Filter for images and sort by name (which includes timestamp)
        const history = response.data
            .filter(file => file.name.match(/\.(png|jpg|jpeg)$/i))
            .map(file => ({
                id: file.sha,
                image: file.download_url,
                name: file.name,
                // Extract timestamp from filename: edit_1708612345678.png
                timestamp: parseInt(file.name.split('_')[1]) || new Date().getTime()
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        res.json(history);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.json([]); // Folder doesn't exist yet
        }
        console.error('GitHub Fetch Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch history from GitHub' });
    }
});

// Delete from GitHub
app.delete('/history/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { path } = req.query; // Need path to delete

        const url = `https://api.github.com/repos/${REPO}/contents/${path}`;

        // GitHub delete requires the SHA
        const getFile = await axios.get(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        await axios.delete(url, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            },
            data: {
                message: `Delete edit: ${path}`,
                sha: getFile.data.sha,
                branch: BRANCH
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('GitHub Delete Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to delete from GitHub' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
