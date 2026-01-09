/**
 * Simple Development Server for Cozy Haven
 * 
 * Serves the game locally for testing and development
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm'
};

// Create a simple HTTP server
const server = http.createServer((req, res) => {
    // Parse URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Security check - prevent directory traversal
    if (pathname.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Get file path
    const filePath = path.join(__dirname, pathname);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        
        // Set CORS headers for development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Server error');
                return;
            }
            
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(data);
        });
    });
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\n❌ Port ${PORT} is already in use!`);
        console.log(`\n🔧 Try a different port or stop the other server:`);
        console.log(`   npx http-server -p 3001`);
        console.log(`   python -m http.server 3001`);
        console.log(`   node server.js (edit PORT to 3001)\n`);
    } else {
        console.log('❌ Server error:', err);
    }
});

// Start server
server.listen(PORT, () => {
    console.log('\n🎮 Cozy Haven - Free Farming Game');
    console.log('=====================================');
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${__dirname}`);
    console.log(`🌐 Open browser: http://localhost:${PORT}`);
    console.log('\n🎯 Game Features:');
    console.log('   ✅ 1,450+ Free Assets');
    console.log('   ✅ WebGL 2.0 Renderer');
    console.log('   ✅ 3D Isometric World');
    console.log('   ✅ Complete Farming Systems');
    console.log('   ✅ Mining & Caves');
    console.log('   ✅ Building & Customization');
    console.log('   ✅ Seasonal Changes');
    console.log('   ✅ Mobile Friendly');
    console.log('\n🎮 Controls:');
    console.log('   W A S D - Move player');
    console.log('   Click - Interact with world');
    console.log('   Space - Action/Use tool');
    console.log('   ESC - Open menu');
    console.log('\n💡 Tips:');
    console.log('   • Click on crops to harvest');
    console.log('   • Click on buildings to interact');
    console.log('   • Click on ore deposits to mine');
    console.log('   • Click on empty terrain to plant');
    console.log('\n🛑 Press Ctrl+C to stop server\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    server.close(() => {
        process.exit(0);
    });
});
