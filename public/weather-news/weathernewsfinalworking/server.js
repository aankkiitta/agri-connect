const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

const API_KEY = 'c243896d83994259b3dad52cc101f66e'; 

app.get('/news', async (req, res) => {
    try {
        const query = req.query.q || 'agriculture';
        const page = req.query.page || 1;
        const pageSize = req.query.pageSize || 12;

        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                page: page,
                pageSize: pageSize,
                apiKey: API_KEY,
                language: 'en'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log(""));