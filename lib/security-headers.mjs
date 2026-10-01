const CSP=[
 "default-src 'self'","base-uri 'none'","object-src 'none'","frame-ancestors 'none'","frame-src 'none'",
 "script-src 'self'","style-src 'self' 'unsafe-inline'","img-src 'self' data: https:",
 "font-src 'self' data:","connect-src 'self'","worker-src 'self' blob:",
 "manifest-src 'self'","form-action 'self'"
].join('; ');

export function applySecurityHeaders(headers,requestUrl,isApi=false){
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('Content-Security-Policy',CSP);
 headers.set('X-Frame-Options','DENY');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), display-capture=()');
 headers.set('Cross-Origin-Resource-Policy','same-origin');
 headers.set('Cross-Origin-Opener-Policy','same-origin');
 headers.set('X-XSS-Protection','0');
 if(new URL(requestUrl).protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');
 if(isApi)headers.set('Cache-Control','no-store');
 return headers;
}
