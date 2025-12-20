const fs = require('fs');
const path = require('path');

function encodeToBase64Url(input) {
  const base64 = Buffer.from(input, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildQueryString(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

function parseFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);
  if (!match) return {};
  const frontMatter = match[1];
  const data = {};
  const lines = frontMatter.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

function formatDate(dateInput) {
  const date = new Date(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]}-${date.getDate()}-${date.getFullYear()}`;
}

function findIndexFiles(dir, excludeDirs = [], results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        findIndexFiles(filePath, excludeDirs, results);
      }
    } else if (file === 'index.html') {
      results.push(filePath);
    }
  }
  return results;
}

function getSlugFromPath(filePath, baseDir) {
  const relativePath = path.relative(baseDir, path.dirname(filePath));
  return relativePath.replace(/[\/\\]/g, '-');
}

function generateTokens() {
  const blogsDir = path.join(__dirname, '../../blogs');
  
  if (!fs.existsSync(blogsDir)) {
    console.error('❌ blogs directory not found');
    process.exit(1);
  }
  const excludeDirs = ['layouts'];
  const indexFiles = findIndexFiles(blogsDir, excludeDirs);
  
  if (indexFiles.length === 0) {
    console.log('⚠️  No index.html files found');
    const dataDir = path.join(__dirname, '../../_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'og_tokens.json'), '{}');
    return;
  }
  
  const tokensMap = {};
  console.log(`\n📦 Processing ${indexFiles.length} blog posts...\n`);
  
  indexFiles.forEach(filePath => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = parseFrontMatter(fileContent);
    const params = {
      title: data.title || 'Untitled Post',
      subtitle: data.subtitle || '',
      desc: data.desc || data.excerpt || '',
      author: data.author || 'Pawan Pandey',
      date: data.date ? formatDate(data.date) : '',
      readtime: data.readtime || data.reading_time || '',
      theme: data.theme || 'charcoal'
    };
    const queryString = buildQueryString(params);
    const token = encodeToBase64Url(queryString);
    const slug = getSlugFromPath(filePath, blogsDir);
    tokensMap[slug] = token;
    const relativePath = path.relative(blogsDir, filePath);
    console.log(`✓ ${relativePath.replace('/index.html', '')} → ${slug}`);
  });
  
  const dataDir = path.join(__dirname, '../../_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(dataDir, 'og_tokens.json'),
    JSON.stringify(tokensMap, null, 2)
  );
  
  console.log(`\n✅ Generated ${Object.keys(tokensMap).length} tokens`);
  console.log(`💾 Saved to: data/og_tokens.json\n`);
  if (Object.keys(tokensMap).length > 0) {
    console.log('📋 Token mapping example:');
    const firstKey = Object.keys(tokensMap)[0];
    console.log(`   "${firstKey}": "${tokensMap[firstKey].substring(0, 40)}..."\n`);
  }
}

try {
  generateTokens();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}