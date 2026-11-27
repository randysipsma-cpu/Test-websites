import assert from 'node:assert/strict';import {parseIcyBlock} from './metadata-icy.mjs';
assert.equal(parseIcyBlock(Buffer.from("StreamTitle='Artist - Song';\0")).title,'Artist - Song');
assert.equal(parseIcyBlock(Buffer.from("StreamTitle='There\\'s a song';")).title,"There\\'s a song");
assert.equal(parseIcyBlock(Buffer.from("StreamTitle='';")).title,null);
assert.equal(parseIcyBlock(Buffer.from([83,116,114,101,97,109,84,105,116,108,101,61,39,233,39,59])).title,'é');
