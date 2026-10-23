import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({notFound(){throw new Error('NOT_FOUND');},redirect(path){throw new Error('REDIRECT:'+path);}}));
const aliases=['sandbox','effects','ui','viewports','palette-preview'];
describe('legacy development route privacy and canonical redirects',()=>{
 beforeEach(()=>vi.unstubAllEnvs());
 afterEach(()=>vi.unstubAllEnvs());
 it.each(aliases)('blocks the %s legacy route outside development',async name=>{
  vi.stubEnv('NODE_ENV','production');const route=await import(`../../app/catana/dev/${name}/page.js`);
  await expect(route.default({searchParams:{private:'case'}})).rejects.toThrow('NOT_FOUND');
 });
 it.each(aliases)('redirects %s bookmarks and preserves repeated query parameters',async name=>{
  vi.stubEnv('NODE_ENV','development');const route=await import(`../../app/catana/dev/${name}/page.js`);
  await expect(route.default({searchParams:Promise.resolve({preset:'duel',value:['a','b']})})).rejects.toThrow('REDIRECT:/dev/'+name+'?preset=duel&value=a&value=b');
 });
});
