const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\13929\\AppData\\Local\\Temp\\trae\\toolcall-output\\708394b0-9597-462d-865c-66940d1b1f39.txt', 'utf8');

const prefix = 'The MCP server responded with: ';
const start = text.indexOf(prefix);
console.log('prefix found at:', start);

const outerJson = text.slice(start + prefix.length).trim();
console.log('outerJson length:', outerJson.length);
console.log('outerJson first 100:', outerJson.slice(0, 100));

const outer = JSON.parse(outerJson);
console.log('outer type:', typeof outer);
console.log('outer is array:', Array.isArray(outer));
console.log('outer length:', outer.length);
console.log('outer[0] keys:', Object.keys(outer[0]));

const innerText = outer[0].text;
console.log('innerText length:', innerText.length);
console.log('innerText first 100:', innerText.slice(0, 100));

const data = JSON.parse(innerText);
console.log('data type:', typeof data);
console.log('data is array:', Array.isArray(data));
console.log('data length:', data.length);
console.log('data[0] keys:', Object.keys(data[0]));
console.log('data[0] name:', data[0].name);
