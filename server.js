const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ytdl = require('ytdl-core');
const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Download endpoint
app.post('/downloads', async (req, res) => {
  try {
    const { url, format, platform } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Generate a unique ID for this download
    const downloadId = uuidv4();
    const fileName = `video-${downloadId}.${format}`;
    const outputPath = path.join(downloadsDir, fileName);
    
    // Handle different platforms
    switch (platform) {
      case 'youtube':
        await downloadYouTubeVideo(url, outputPath, format);
        break;
      case 'facebook':
      case 'instagram':
      case 'twitter':
      case 'tiktok':
        await downloadSocialMediaVideo(url, outputPath, format, platform);
        break;
      default:
        await downloadGenericVideo(url, outputPath, format);
    }
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    // Success response
    res.json({
      success: true,
      fileName,
      format,
      size: `${fileSizeMB} MB`,
      downloadUrl: `/downloads/${fileName}`
    });
    
    // Set a cleanup timeout (24 hours)
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }, 24 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download video. Please check the URL and try again.' 
    });
  }
});

// YouTube video download function
async function downloadYouTubeVideo(url, outputPath, format) {
  return new Promise((resolve, reject) => {
    const videoStream = ytdl(url, { quality: 'highest' });
    
    if (format === 'mp4') {
      videoStream.pipe(fs.createWriteStream(outputPath))
        .on('finish', resolve)
        .on('error', reject);
    } else {
      // For iPhone format (mov)
      const tempPath = `${outputPath}.temp.mp4`;
      videoStream.pipe(fs.createWriteStream(tempPath))
        .on('finish', () => {
          // Convert to iPhone format using ffmpeg
          ffmpeg(tempPath)
            .outputOptions('-c:v', 'h264')
            .outputOptions('-c:a', 'aac')
            .save(outputPath)
            .on('end', () => {
              fs.unlinkSync(tempPath);
              resolve();
            })
            .on('error', (err) => {
              fs.unlinkSync(tempPath);
              reject(err);
            });
        })
        .on('error', reject);
    }
  });
}

// Social media video download function using puppeteer
async function downloadSocialMediaVideo(url, outputPath, format, platform) {
  let browser;
  try {
    // Launch puppeteer with appropriate flags for server environment
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Find video element based on platform
    let videoUrl;
    
    if (platform === 'facebook') {
      // Wait for video to load
      await page.waitForSelector('video', { timeout: 10000 });
      videoUrl = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });
    } else if (platform === 'instagram') {
      await page.waitForSelector('video', { timeout: 10000 });
      videoUrl = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });
    } else if (platform === 'twitter' || platform === 'x.com') {
      await page.waitForSelector('video', { timeout: 10000 });
      videoUrl = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });
    } else if (platform === 'tiktok') {
      await page.waitForSelector('video', { timeout: 10000 });
      videoUrl = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        return videoElement ? videoElement.src : null;
      });
    }
    
    if (!videoUrl) {
      throw new Error(`Could not find video on ${platform}`);
    }
    
    // Download the video
    const response = await page.goto(videoUrl);
    const buffer = await response.buffer();
    
    if (format === 'mp4') {
      fs.writeFileSync(outputPath, buffer);
    } else {
      // For iPhone format (mov)
      const tempPath = `${outputPath}.temp.mp4`;
      fs.writeFileSync(tempPath, buffer);
      
      // Convert to iPhone format
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .outputOptions('-c:v', 'h264')
          .outputOptions('-c:a', 'aac')
          .save(outputPath)
          .on('end', () => {
            fs.unlinkSync(tempPath);
            resolve();
          })
          .on('error', (err) => {
            fs.unlinkSync(tempPath);
            reject(err);
          });
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Generic video download function for other sources
async function downloadGenericVideo(url, outputPath, format) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Try to find any video element
    await page.waitForSelector('video', { timeout: 10000 });
    const videoUrl = await page.evaluate(() => {
      const videoElement = document.querySelector('video');
      return videoElement ? videoElement.src : null;
    });
    
    if (!videoUrl) {
      throw new Error('Could not find video on page');
    }
    
    // Download the video
    const response = await page.goto(videoUrl);
    const buffer = await response.buffer();
    
    if (format === 'mp4') {
      fs.writeFileSync(outputPath, buffer);
    } else {
      // For iPhone format (mov)
      const tempPath = `${outputPath}.temp.mp4`;
      fs.writeFileSync(tempPath, buffer);
      
      // Convert to iPhone format
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .outputOptions('-c:v', 'h264')
          .outputOptions('-c:a', 'aac')
          .save(outputPath)
          .on('end', () => {
            fs.unlinkSync(tempPath);
            resolve();
          })
          .on('error', (err) => {
            fs.unlinkSync(tempPath);
            reject(err);
          });
      });
    }
  } catch (error) {
    // If puppeteer approach fails, try using node-fetch as fallback
    const fetch = require('node-fetch');
    const response = await fetch(url);
    const buffer = await response.buffer();
    
    if (format === 'mp4') {
      fs.writeFileSync(outputPath, buffer);
    } else {
      // For iPhone format (mov)
      const tempPath = `${outputPath}.temp.mp4`;
      fs.writeFileSync(tempPath, buffer);
      
      // Convert to iPhone format
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .outputOptions('-c:v', 'h264')
          .outputOptions('-c:a', 'aac')
          .save(outputPath)
          .on('end', () => {
            fs.unlinkSync(tempPath);
            resolve();
          })
          .on('error', (err) => {
            fs.unlinkSync(tempPath);
            reject(err);
          });
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});