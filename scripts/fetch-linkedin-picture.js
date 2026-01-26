/**
 * Script to fetch LinkedIn profile picture
 * Run this with: node scripts/fetch-linkedin-picture.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LINKEDIN_URL = 'https://www.linkedin.com/in/sb1994';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'assets', 'blog', 'authors');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'sunando-bhattacharya.jpg');

async function fetchLinkedInPicture() {
  console.log('Fetching LinkedIn profile picture...');
  
  try {
    // Try using a service to get the profile picture
    // Option 1: Use LinkPreview API if you have an API key
    if (process.env.LINKPREVIEW_API_KEY) {
      const linkPreviewUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(LINKEDIN_URL)}`;
      const response = await fetch(linkPreviewUrl, {
        headers: {
          'X-Linkpreview-Api-Key': process.env.LINKPREVIEW_API_KEY,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.image) {
          await downloadImage(data.image, OUTPUT_FILE);
          console.log('✅ Successfully fetched and saved profile picture!');
          console.log(`📁 Saved to: ${OUTPUT_FILE}`);
          return;
        }
      }
    }
    
    // Option 2: Try fetching from LinkedIn's public profile page
    console.log('Trying to fetch from LinkedIn public profile...');
    const response = await fetch(LINKEDIN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Try to extract og:image
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        const imageUrl = ogImageMatch[1];
        await downloadImage(imageUrl, OUTPUT_FILE);
        console.log('✅ Successfully fetched and saved profile picture!');
        console.log(`📁 Saved to: ${OUTPUT_FILE}`);
        return;
      }
    }
    
    console.log('❌ Could not automatically fetch profile picture.');
    console.log('\n📝 Manual steps:');
    console.log('1. Visit your LinkedIn profile: https://www.linkedin.com/in/sb1994');
    console.log('2. Right-click on your profile picture and "Copy image address"');
    console.log('3. Update the picture URL in src/lib/author.ts');
    console.log('   OR download the image and save it to: public/assets/blog/authors/sunando-bhattacharya.jpg');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n📝 Please manually set your profile picture:');
    console.log('1. Download your LinkedIn profile picture');
    console.log(`2. Save it to: ${OUTPUT_FILE}`);
    console.log('3. The image will be used automatically');
  }
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

// Run the script
fetchLinkedInPicture();
