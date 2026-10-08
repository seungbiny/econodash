import {refreshAll} from '../lib/market-data.mjs';
import {handleRefresh} from '../lib/refresh-api.mjs';
export default {
  async fetch(request,env={}) {
    if(new URL(request.url).pathname!=='/api/refresh')return new Response('Not found',{status:404});
    return handleRefresh(request,refreshAll,String(env.ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean));
  }
};
