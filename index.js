require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
    originalUrl: String,
    shortUrl: { type: String, unique: true },
    clicks: { type: Number, default: 0 },
});

const Url = mongoose.model('Url', urlSchema);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/redirects', async (req, res) => {
    try {
        const redirects = await Url.find({}, 'originalUrl shortUrl clicks');
        res.json(redirects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.get('/redirects/:shortUrl', async (req, res) => {
    try {
        const { shortUrl } = req.params;
        const url = await Url.findOne({ shortUrl });
        if (!url) {
            return res.status(404).json({ error: 'Redirect not found' });
        }
        res.json(url);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


app.post('/shorten', async (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl) {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
        let url = await Url.findOne({ originalUrl });
        if (!url) {
            const shortUrl = await generateUniqueShortUrl();
            url = new Url({
                originalUrl,
                shortUrl,
            });
            await url.save();
        }
        res.json({ shortUrl: url.shortUrl });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;

    try {

        const url = await Url.findOneAndUpdate(
            { shortUrl },
            { $inc: { clicks: 1 } },
            { new: true }
        );


        if (!url) {
            return res.redirect(process.env.DEFAULT_URL)
        }

        res.redirect(url.originalUrl);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
app.delete('/redirects/:shortUrl', async (req, res) => {
    const { shortUrl } = req.params;

    try {
        const deletedUrl = await Url.findOneAndDelete({ shortUrl });

        if (!deletedUrl) {
            return res.status(404).json({ error: 'Redirect not found' });
        }

        res.json({ message: 'Redirect deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});





async function generateUniqueShortUrl() {
    const length = 6;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortUrl = '';
    for (let i = 0; i < length; i++) {
        shortUrl += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existingUrl = await Url.findOne({ shortUrl });
    if (existingUrl) {
        return generateUniqueShortUrl();
    }

    return shortUrl;
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});