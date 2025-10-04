export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY;
  
  console.log('Request body:', JSON.stringify(req.body)); // Debug log
  
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google TTS Error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    console.log('Google TTS Success, has audioContent:', !!data.audioContent); // Debug log
    
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}

// export default async function handler(req, res) {
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
//     if (req.method === 'OPTIONS') {
//       return res.status(200).end();
//     }
    
//     const GOOGLE_API_KEY = process.env.GOOGLE_TTS_API_KEY;
    
//     try {
//       const response = await fetch(
//         `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(req.body)
//         }
//       );
      
//       const data = await response.json();
//       res.json(data);
//     } catch (error) {
//       res.status(500).json({ error: 'TTS request failed' });
//     }
//   }