// server.js
require('dotenv').config();
const express = require('express');
const app = express();

app.post('/api/tts', async (req, res) => {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    }
  );
  const data = await response.json();
  res.json(data);
});

app.listen(3000);