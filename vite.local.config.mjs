import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url));
export default defineConfig({
 root:fileURLToPath(new URL('./frontend',import.meta.url)),
 publicDir:fileURLToPath(new URL('./public',import.meta.url)),
 resolve:{alias:{'@':root}},
 css:{postcss:root},
 plugins:[react(),{name:'arata-local-health',configureServer(server){server.middlewares.use('/__arata/health',(_req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({app:'arata-odds',service:'frontend',status:'ready'}));});}}],
 server:{host:'127.0.0.1',port:5173,strictPort:true,fs:{allow:[root]},proxy:{'/api':{target:process.env.ARATA_API_PROXY||'http://127.0.0.1:3001',changeOrigin:true}}},
 build:{outDir:fileURLToPath(new URL('./dist/local',import.meta.url)),emptyOutDir:true},
});
