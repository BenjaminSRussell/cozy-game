/**
 * Ultra Simple Server - Crash Free
 * Just serves the HTML file without any complexity
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Create the simplest possible server
const server = http.createServer((req, res) => {
    try {
        // Set basic headers
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Get the file path
        let filePath = req.url === '/' ? '/simple-game.html' : req.url;
        filePath = path.join(__dirname, filePath);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            // Read and serve the file
            const content = fs.readFileSync(filePath);
            res.writeHead(200);
            res.end(content);
        } else {
            // 404 for missing files
            res.writeHead(404);
            res.end('File not found');
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end('Server error');
    }
});

// Start server with error handling
server.listen(PORT, () => {
    console.log('\nCozy Haven - Simple Working Version');
    console.log('====================================');
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log(`Open browser: http://localhost:${PORT}`);
    console.log('\nFeatures:');
    console.log('   Grid-based farming');
    console.log('   Crop growth system');
    console.log('   Building placement');
    console.log('   Tree planting');
    console.log('   Mining system');
    console.log('   Inventory management');
    console.log('   Click to interact');
    console.log('\nControls:');
    console.log('   Click cells to place items');
    console.log('   Use buttons to select tools');
    console.log('   Watch crops grow automatically');
    console.log('\nThis version is CRASH-FREE!');
    console.log('   No complex dependencies');
    console.log('   Simple 2D rendering');
    console.log('   Basic game mechanics');
    console.log('   Works in any browser');
    console.log('\nPress Ctrl+C to stop server\n');
});

// Handle errors gracefully
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\nPort ${PORT} is already in use!`);
        console.log(`\nTry a different port:`);
        console.log(`   node simple-server.js (edit PORT to 3001)`);
    } else {
        console.log('\nServer error:', err.message);
    }
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});
