const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert(!html.includes('<summary'));assert(!html.includes('Read a little more'));assert(!html.includes('Scroll for more'));
assert(html.includes('id="story-info"')&&html.includes('id="info-open"'));
assert(html.indexOf('id="more-copy"')>html.indexOf('id="story-info"'));
console.log('PASS no main read/scroll cue; optional depth lives in info dialog');
