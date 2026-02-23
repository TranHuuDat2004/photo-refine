const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const Edit = require('./models/Edit');

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
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/photorefine';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? 'https://photo-refine.onrender.com/login'
    : 'http://localhost:3000/login';

const googleClient = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Auth Middleware
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            throw new Error();
        }

        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Health check
app.get('/health', (req, res) => res.send('PhotoRefine Cloud Sync Server is running!'));

// Render Main Page
app.get('/', (req, res) => {
    res.render('index');
});

// Render Login Page or Handle Google OAuth Callback
app.get('/login', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;

    if (error) {
        return res.send(`<script>alert('Google Login Failed: ${error}'); window.location.href='/login';</script>`);
    }

    if (code) {
        try {
            const { tokens } = await googleClient.getToken(code);
            googleClient.setCredentials(tokens);

            // Fetch user info using the access token
            const userInfoRes = await googleClient.request({ url: 'https://www.googleapis.com/oauth2/v3/userinfo' });
            const { sub: googleId, email, name, picture } = userInfoRes.data;

            // Find existing user by googleId or email
            let user = await User.findOne({
                $or: [{ googleId }, { email }]
            });

            if (user) {
                let needsSave = false;
                if (!user.googleId) { user.googleId = googleId; needsSave = true; }
                if (!user.profilePicture && picture) { user.profilePicture = picture; needsSave = true; }
                if (needsSave) await user.save();
            } else {
                let baseUsername = name.replace(/\s+/g, '').toLowerCase();
                let uniqueUsername = baseUsername;
                let counter = 1;

                while (await User.findOne({ username: uniqueUsername })) {
                    uniqueUsername = `${baseUsername}${counter}`;
                    counter++;
                }

                user = await User.create({
                    username: uniqueUsername,
                    email: email,
                    googleId: googleId,
                    profilePicture: picture
                });
            }

            const appToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

            return res.send(`
                <script>
                    localStorage.setItem('photo_refine_user', JSON.stringify({
                        id: '${user._id}',
                        username: '${user.username}',
                        profilePicture: '${user.profilePicture || ''}'
                    }));
                    localStorage.setItem('photo_refine_token', '${appToken}');
                    window.location.href = '/';
                </script>
            `);

        } catch (err) {
            console.error('Google Auth callback error:', err);
            return res.send(`<script>alert('Failed to authenticate with Google Server'); window.location.href='/login';</script>`);
        }
    }

    res.render('login', {
        GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || ''
    });
});

// Generate Google OAuth URL endpoint
app.get('/api/auth/google/url', (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google Auth is not fully configured.' });
    }
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    });
    res.json({ url });
});

// --- Auth Routes ---

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = await User.create({ username, password });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
            res.json({
                _id: user._id,
                username: user.username,
                token
            });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'Google Auth is not configured on the server.' });
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // Find existing user by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email }]
        });

        if (user) {
            // Update missing google info if needed
            let needsSave = false;
            if (!user.googleId) { user.googleId = googleId; needsSave = true; }
            if (!user.profilePicture && picture) { user.profilePicture = picture; needsSave = true; }
            if (needsSave) await user.save();
        } else {
            // Create a new user automatically
            // Handle edge case where their google name conflicts with an existing username
            let baseUsername = name.replace(/\s+/g, '').toLowerCase();
            let uniqueUsername = baseUsername;
            let counter = 1;

            while (await User.findOne({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter}`;
                counter++;
            }

            user = await User.create({
                username: uniqueUsername,
                email: email,
                googleId: googleId,
                profilePicture: picture
            });
        }

        // Generate our own JWT token for the app
        const appToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            _id: user._id,
            username: user.username,
            profilePicture: user.profilePicture,
            token: appToken
        });

    } catch (error) {
        console.error('Google Auth error:', error);
        res.status(401).json({ error: 'Invalid Google Token', details: error.message });
    }
});

app.post('/api/auth/google/custom', async (req, res) => {
    try {
        const { googleId, email, name, picture } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({ error: 'Missing fundamental Google Auth identifiers.' });
        }

        // Find existing user by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email }]
        });

        if (user) {
            // Update missing google info if needed
            let needsSave = false;
            if (!user.googleId) { user.googleId = googleId; needsSave = true; }
            if (!user.profilePicture && picture) { user.profilePicture = picture; needsSave = true; }
            if (needsSave) await user.save();
        } else {
            // Create a new user automatically
            let baseUsername = name.replace(/\s+/g, '').toLowerCase();
            let uniqueUsername = baseUsername;
            let counter = 1;

            while (await User.findOne({ username: uniqueUsername })) {
                uniqueUsername = `${baseUsername}${counter}`;
                counter++;
            }

            user = await User.create({
                username: uniqueUsername,
                email: email,
                googleId: googleId,
                profilePicture: picture
            });
        }

        // Generate our own JWT token for the app
        const appToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            _id: user._id,
            username: user.username,
            profilePicture: user.profilePicture,
            token: appToken
        });

    } catch (error) {
        console.error('Google Custom Auth error:', error);
        res.status(500).json({ error: 'Failed to process custom Google login', details: error.message });
    }
});

// --- Editor Routes (Protected) ---

// Upload image to GitHub & Save Reference to MongoDB
app.post('/upload', auth, async (req, res) => {
    try {
        const { image, fileName } = req.body;
        if (!image || !fileName) {
            return res.status(400).json({ error: 'Missing image or fileName' });
        }

        // Remove data:image/png;base64, prefix
        const base64Content = image.split(',')[1];
        const githubPath = `edits/${req.user._id}/${fileName}`; // Scope path by user ID
        const url = `https://api.github.com/repos/${REPO}/contents/${githubPath}`;

        console.log(`Uploading to GitHub: ${githubPath}`);

        const response = await axios.put(url, {
            message: `Save edit for user ${req.user.username}: ${fileName}`,
            content: base64Content,
            branch: BRANCH
        }, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });

        const githubUrl = response.data.content.download_url;
        const githubSha = response.data.content.sha;

        // Save to MongoDB
        const edit = await Edit.create({
            userId: req.user._id,
            fileName: fileName,
            githubUrl: githubUrl,
            githubSha: githubSha
        });

        res.json({
            success: true,
            url: githubUrl,
            id: edit._id,
            githubSha: githubSha
        });
    } catch (error) {
        console.error('Upload Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to upload photo', details: error.response?.data || error.message });
    }
});

// Get user's history from MongoDB
app.get('/history', auth, async (req, res) => {
    try {
        // Find edits for this specific user, sorted from newest to oldest
        const edits = await Edit.find({ userId: req.user._id }).sort({ createdAt: -1 });

        const history = edits.map(edit => ({
            id: edit._id,                // MongoDB ID
            image: edit.githubUrl,       // GitHub raw URL
            name: edit.fileName,         // Original file name
            githubSha: edit.githubSha,   // Needed for deletions
            timestamp: new Date(edit.createdAt).getTime()
        }));

        res.json(history);
    } catch (error) {
        console.error('Fetch History Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Delete from GitHub and MongoDB
app.delete('/history/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the edit and verify it belongs to the user
        const edit = await Edit.findOne({ _id: id, userId: req.user._id });
        if (!edit) {
            return res.status(404).json({ error: 'Edit not found or unauthorized' });
        }

        const githubPath = `edits/${req.user._id}/${edit.fileName}`;
        const url = `https://api.github.com/repos/${REPO}/contents/${githubPath}`;

        // Delete from GitHub
        try {
            await axios.delete(url, {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: 'application/vnd.github.v3+json'
                },
                data: {
                    message: `Delete edit: ${githubPath}`,
                    sha: edit.githubSha,
                    branch: BRANCH
                }
            });
        } catch (githubError) {
            console.error('GitHub Delete Error (might already be deleted):', githubError.response?.data || githubError.message);
            // Continue to delete from DB even if GitHub delete fails
        }

        // Delete from MongoDB
        await Edit.deleteOne({ _id: id });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error.message);
        res.status(500).json({ error: 'Failed to delete edit' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
