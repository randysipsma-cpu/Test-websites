import assert from 'node:assert/strict';
import {parseStationApi,readStationApi} from './metadata-station-api.mjs';
assert.equal(parseStationApi({nowPlaying:{track:{artist:'Artist',title:'Song'}}}).title,'Artist - Song');
assert.equal(parseStationApi({title:'Website'}),null);
assert.equal(parseStationApi({artist:'Artist',title:'Song'},{format:'flat'}).title,'Artist - Song');
assert.equal(parseStationApi([{id:1,track:{title:'Wrong'}},{id:2,track:{title:'Right'}}],{stationId:2}).title,'Right');
assert.equal(parseStationApi([{id:1,track:{title:'Wrong'}}]),null);
assert.equal(await readStationApi({url:'https://radio.example.com/api'},{approve:async()=>false,fetcher:async()=>{throw Error('must not fetch')}}),null);
console.log('Station API fixtures passed');
