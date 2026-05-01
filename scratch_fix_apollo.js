const fs = require('fs');
let content = fs.readFileSync('c:\\Study Grow\\app.js', 'utf-8');
content = content.replace("const endpoint = `/api/apollo`;", "const endpoint = `http://localhost:3000/api/apollo`;");
fs.writeFileSync('c:\\Study Grow\\app.js', content, 'utf-8');
console.log('Fixed apollo endpoint in app.js');
