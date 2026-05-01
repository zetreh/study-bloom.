const fs = require('fs');
let content = fs.readFileSync('c:\\Study Grow\\app.js', 'utf-8');
content = content.replace(/fetch\('\/api\//g, "fetch('http://localhost:3000/api/");
content = content.replace(/fetch\(`\/api\//g, "fetch(`http://localhost:3000/api/");
fs.writeFileSync('c:\\Study Grow\\app.js', content, 'utf-8');
console.log('Fixed URLs in app.js');
