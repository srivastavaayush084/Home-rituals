const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Home Rituals', 'public', 'reels');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const codes = [
  { code: 'DaiWjuOSkbg', file: 'video-1.mp4' },
  { code: 'DZ2YyyQK2HO', file: 'video-2.mp4' },
  { code: 'DaKBJZAIWpM', file: 'video-3.mp4' },
  { code: 'DZ_0C_MxnNE', file: 'video-4.mp4' },
  { code: 'DZ6jnjCRTmn', file: 'video-5.mp4' },
  { code: 'DZsPIbOtjwY', file: 'video-6.mp4' },
];

async function extractAndDownload() {
  for (let item of codes) {
    console.log(`Searching video MP4 for ${item.code}...`);
    try {
      const embedUrl = `https://www.instagram.com/p/${item.code}/embed/`;
      const res = await fetch(embedUrl, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
      });
      const html = await res.text();
      
      // Match raw mp4 url in JavaScript payload inside embed HTML
      const rawMatches = html.match(/https?:\\\/\\\/[^\x22\s]+\.mp4[^\x22\s]*/g) || html.match(/https?:[^\x22\s]+\.mp4[^\x22\s]*/g);
      
      if (rawMatches && rawMatches.length > 0) {
        let cleanUrl = rawMatches[0].replace(/\\\/\\\\/g, '/').replace(/\\\//g, '/').replace(/\\u0026/g, '&');
        console.log(`Downloading video for ${item.code} from ${cleanUrl.substring(0, 60)}...`);
        
        const vidRes = await fetch(cleanUrl);
        if (vidRes.ok) {
          const buffer = Buffer.from(await vidRes.arrayBuffer());
          const filePath = path.join(dir, item.file);
          fs.writeFileSync(filePath, buffer);
          console.log(`SUCCESS: Saved ${item.file} (${buffer.length} bytes)`);
        } else {
          console.error(`HTTP ${vidRes.status} downloading video for ${item.code}`);
        }
      } else {
        console.log(`No direct MP4 URL found in embed HTML for ${item.code}`);
      }
    } catch (e) {
      console.error(`Error for ${item.code}:`, e.message);
    }
  }
}

extractAndDownload();
