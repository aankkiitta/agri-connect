const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// REPLACE WITH YOUR KEY FROM newsapi.org
const NEWS_API_KEY = 'c243896d83994259b3dad52cc101f66e'; 

app.get('/news', async (req, res) => {
    try {
        const query = req.query.q || 'agriculture';
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 12;

        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                apiKey: NEWS_API_KEY,
                pageSize: pageSize,
                page: page,
                sortBy: 'publishedAt',
                language: 'en'
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch news" });
    }
});

app.listen(3000, () => console.log('Backend running on http://localhost:3000'));