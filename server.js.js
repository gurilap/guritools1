
import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// TMDb API Credentials
const TMDB_API_KEY = '9dba7388e0cc6e2c49be5d66ece46b98';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5ZGJhNzM4OGUwY2M2ZTJjNDliZTVkNjZlY2U0NmI5OCIsIm5iZiI6MTc0MjEyMzUyNC4yNDQsInN1YiI6IjY3ZDZiMjA0MTkxODY4YzU0ZmYxODlhZCIs

"Sjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.x-m15u8d8Z00-ZqRAyx8_taBySbf-Tk3Wn0rC1_7RWY';

// Ensure public and downloads folders exist
const publicPath = path.join(__dirname, 'public');
const downloadsPath = path.join(publicPath, 'downloads');

if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  try {
    const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    fs.writeFileSync(path.join(publicPath, 'index.html'), htmlContent);
  } catch(e) {
      console.log("index.html template not found in root, ignoring copy.");
  }
}
if (!fs.existsSync(downloadsPath)) {
  fs.mkdirSync(downloadsPath, { recursive: true });
}

// Middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public
app.use(express.static(publicPath, { index: false }));

// Auto-delete downloaded files after 1 hour
function deleteFileAfterDelay(filePath, delay) {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file ${filePath}:`, err);
      else console.log(`Deleted file: ${filePath}`);
    });
  }, delay);
}

// TMDb Movie Search API
app.get('/search-movie', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ success: false, error: 'Query is required' });
  const tmdbUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;
  try {
    const response = await fetch(tmdbUrl, {
      headers: {
        "Authorization": `Bearer ${TMDB_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      res.json({ success: true, movies: data.results });
    } else {
      res.json({ success: false, error: 'No movies found' });
    }
  } catch (error) {
    console.error("TMDb API Error:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch movies' });
  }
});

// Video Download API using yt-dlp and ffmpeg (MP4 output)
app.post('/download', async (req, res) => {
  const videoUrl = req.body.url;
  if (!videoUrl) return res.status(400).json({ error: 'Video URL is required' });
  const fileName = `video_${Date.now()}.mp4`;
  const outputPath = path.join(downloadsPath, fileName);
  
  const command = `yt-dlp -o "${outputPath}" -f "bv*[ext=mp4][vcodec^=avc]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 "${videoUrl}"`;
  
  try {
    await execPromise(command);
    console.log(`Downloaded: ${outputPath}`);
    deleteFileAfterDelay(outputPath, 3600000);
    
    return res.json({ success: true, downloadUrl: `/api/fetch-file/${fileName}` });
  } catch (error) {
    console.error(`Download Error: ${error}`);
    return res.status(500).json({ error: 'Failed to download video' });
  }
});

// iPhone / Safari Fix Route
app.get('/api/fetch-file/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(downloadsPath, fileName);
  
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found or expired.');
    }
  
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
  
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="GuriTools_${fileName}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', fileSize);
  
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout);
    });
  });
}

app.get('*', (req, res) => {
    const htmlPath = path.join(publicPath, 'index.html');
    if(fs.existsSync(htmlPath)){
        res.sendFile(htmlPath);
    } else {
        res.send("Welcome to GuriTools API. Frontend UI missing in public folder.");
    }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
