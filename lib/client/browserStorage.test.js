import {describe,it,expect} from 'vitest';
import {readBrowserStorage,removeBrowserStorage} from './browserStorage.js';
import {readStoredPlayerIdentity,writeStoredPlayerIdentity} from '../../app/_features/account/playerIdentityStorage.js';
import {readLastActiveMatch,clearLastActiveMatch,getCredentialsStorageKey} from '../../app/_features/matches/session/activeMatchStorage.js';
import {readPendingFriendChallenge,clearPendingFriendChallenge} from '../../app/_features/matches/session/pendingFriendChallenge.js';
import {consumeGameStartTransition} from '../../app/_features/game/effects/gameStartTransition.js';

function memoryStorage(values={}) {
 const map=new Map(Object.entries(values));
 return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
const active=JSON.stringify({matchID:'m1',playerID:'0',savedAtMs:10});
describe('browser namespace migration through application storage owners',()=>{
 it('moves identity, recovery, credentials and pending invite without losing the pair',()=>{
  const s=memoryStorage({'catana:lobby:playerName':'Ada','catana:lobby:playerEmoji':'😀','catana:lobby:playerColor':'royal','catana:last-active-match':active,'catana:lobby:credentials:m1:0':'secret','catana:lobby:pending-friend-challenge':active});
  expect(readStoredPlayerIdentity(s).name).toBe('Ada');
  expect(readLastActiveMatch(s)).toMatchObject({matchID:'m1',playerID:'0'});
  expect(readPendingFriendChallenge(s)).toMatchObject({matchID:'m1',playerID:'0'});
  expect(getCredentialsStorageKey({matchID:'m1',playerID:'0'})).toBe('settlehex:lobby:credentials:m1:0');
  expect(s.getItem('settlehex:lobby:credentials:m1:0')).toBe('secret');
  expect(s.getItem('catana:lobby:playerName')).toBeNull();
 });
 it('does not restore signed-out identity or cleared recovery from legacy writes by an old tab',()=>{
  const s=memoryStorage({'catana:lobby:playerName':'Ada','catana:last-active-match':active,'catana:lobby:pending-friend-challenge':active});
  readStoredPlayerIdentity(s);writeStoredPlayerIdentity(s,{});clearLastActiveMatch(s);clearPendingFriendChallenge(s);
  s.setItem('catana:lobby:playerName','Stale');s.setItem('catana:last-active-match',active);s.setItem('catana:lobby:pending-friend-challenge',active);
  expect(readStoredPlayerIdentity(s).name).toBe('');expect(readLastActiveMatch(s)).toBeNull();expect(readPendingFriendChallenge(s)).toBeNull();
 });
 it('keeps explicit canonical empty identity while removing a stale legacy value',()=>{
  const s=memoryStorage({'settlehex:lobby:playerName':'','catana:lobby:playerName':'Stale'});
  expect(readStoredPlayerIdentity(s).name).toBe('');expect(s.getItem('catana:lobby:playerName')).toBeNull();
 });
 it('consumes a legacy session transition once',()=>{
  const s=memoryStorage({'catana:game-start-transition':JSON.stringify({matchID:'m1',createdAt:100})});
  expect(consumeGameStartTransition({storage:s,matchID:'m1',now:110})).toBe(true);
  expect(s.getItem('settlehex:game-start-transition')).toBeNull();
  expect(consumeGameStartTransition({storage:s,matchID:'m1',now:110})).toBe(false);
 });
 it('leaves the only legacy copy intact when canonical writes fail',()=>{
  const s=memoryStorage({'catana:lobby:playerName':'Ada'});s.setItem=()=>{throw new Error('quota');};
  expect(readStoredPlayerIdentity(s).name).toBe('Ada');expect(s.getItem('catana:lobby:playerName')).toBe('Ada');
 });
 it('keeps explicit false/empty preferences and sees another migrated tab change',()=>{
  const s=memoryStorage({'settlehex:audioMuted':'false','catana:audioMuted':'true','settlehex:themeId':'','catana:themeId':'classic'});
  expect(readBrowserStorage(s,'settlehex:audioMuted')).toBe('false');expect(readBrowserStorage(s,'settlehex:themeId')).toBe('');
  s.setItem('settlehex:audioMuted','true');expect(readBrowserStorage(s,'settlehex:audioMuted')).toBe('true');
  s.removeItem('settlehex:audioMuted');s.setItem('catana:audioMuted','true');expect(readBrowserStorage(s,'settlehex:audioMuted')).toBeNull();
 });
 it('never restores a released seat credential from a stale legacy tab',()=>{
  const s=memoryStorage({'catana:lobby:credentials:m1:0':'old-secret'});const key=getCredentialsStorageKey({matchID:'m1',playerID:'0'});
  expect(readBrowserStorage(s,key)).toBe('old-secret');removeBrowserStorage(s,key);s.setItem('catana:lobby:credentials:m1:0','stale-secret');expect(readBrowserStorage(s,key)).toBeNull();
 });
 it('tolerates blocked storage' ,()=>{
  const s={getItem(){throw new Error('denied');}};
  expect(readStoredPlayerIdentity(s).name).toBe('');expect(readLastActiveMatch(s)).toBeNull();
 });
});
