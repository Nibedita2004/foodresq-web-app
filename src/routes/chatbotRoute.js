// src/routes/chatbotRoute.js
const express = require('express');
const router = express.Router();
// --- THIS IS THE FIX ---
const { CohereClient } = require('cohere-ai'); // <-- Corrected package name

// Initialize the Cohere client
// It automatically reads the COHERE_API_KEY from process.env
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/* Friendly local fallback replies (still good to keep!) */
const FALLBACKS = [
  "Hi! I'm ResQBot — I can explain how ResQFood works, how to register, or how to claim pickups.",
  "To create a listing: register as a donor, fill title/quantity/expiry/location and press Create.",
  "To claim a pickup: register as a volunteer, then press Claim on an available listing in your dashboard."
];

function fallbackReply() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

function meaningful(s) {
  return typeof s === 'string' && /\w/.test(s);
}

// The new chat route using Cohere
router.post('/chat', async (req, res) => {
  try {
    const raw = req.body && (req.body.message ?? req.body.text ?? req.body.msg);
    const message = (typeof raw === 'string') ? raw.trim() : '';

    console.log('🛰 /api/chat incoming —', {
      ip: req.ip, contentType: req.headers['content-type'], bodyPreview: String(raw || '').slice(0,400)
    });

    if (!meaningful(message)) {
      return res.status(400).json({ error: 'Please provide a non-empty "message" string.' });
    }

    // Check for the API key
    if (!process.env.COHERE_API_KEY) {
      console.warn('COHERE_API_KEY missing — serving fallback reply.');
      return res.json({ reply: fallbackReply(), modelUsed: 'local-fallback' });
    }

    // --- This is the new API call ---
    // FIX: Updated log message to correct model
    console.log('→ Calling Cohere API (model: command-a-03-2025)');

const response = await cohere.chat({
      model: 'command-a-03-2025', // <-- This is the new, supported model
      message: message,
      
      // FIX: This is the new "fine-tuned" preamble to remove stars and improve answers
      preamble: `
        You are ResQBot, a friendly and helpful assistant for a food rescue platform called "ResQFood".
        Your goal is to answer user questions clearly and concisely.

        *CRITICAL INSTRUCTIONS:*
        1.  *DO NOT use markdown.* Do not use asterisks () for bolding or any other markdown formatting.
        2.  *DO NOT use emojis.*
        3.  Keep answers short and to the point. One or two sentences is best.
        4.  Answer only based on the information provided below.
        5.  If a question is unrelated to the food rescue project, do not respond.

        *Platform Information:*
        * *Purpose:* ResQFood connects Donors (like restaurants or cafes) with surplus food to Volunteers.
        * *Donors:* A donor is a person or business that lists surplus food on the platform. To do this, they must register, then create a listing with a title, quantity, expiry date, and pickup location.
        * *Volunteers:* A volunteer is someone who picks up the food. To do this, they must register, browse the listings, and click "Claim" on a listing they want to pick up.
        
        *Example Q&A:*
        * User: "What is a donor?"
        * You: "A donor is a person or business that lists surplus food on the ResQFood platform for volunteers to pick up."
        * User: "how to claim pickups"
        * You: "To claim a pickup, you must first register as a volunteer. Then, you can browse available food listings and press the 'Claim' button."
      `,
    });
    
    // --- End of new API call ---

    const reply = response.text; // The Cohere SDK makes this very simple
    console.log(`✅ Cohere replied.`);

    // FIX: Updated log message to correct model
    return res.json({ reply: reply, modelUsed: 'cohere-command-a-03-2025' });

  } catch (err) {
    // If Cohere fails, we still serve a fallback
    console.error('Cohere API error:', err.stack || err.message || err);
    return res.status(500).json({ error: 'Chatbot API error', reply: fallbackReply(), modelUsed: 'none' });
  }
});

module.exports = router;