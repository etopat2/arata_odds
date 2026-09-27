// Count alone cannot constrain large bookmaker responses. Measure serialized
// bytes and keep both individual entries and the total cache bounded.
export class BoundedCache extends Map{
 constructor(maxBytes=8*1024*1024,maxEntryBytes=1024*1024){super();this.maxBytes=maxBytes;this.maxEntryBytes=maxEntryBytes;this.sizes=new Map();this.bytes=0;}
 delete(key){this.bytes-=this.sizes.get(key)||0;this.sizes.delete(key);return super.delete(key);}
 clear(){super.clear();this.sizes.clear();this.bytes=0;}
 set(key,value){this.delete(key);const bytes=new TextEncoder().encode(JSON.stringify(value)).byteLength;if(bytes>this.maxEntryBytes)return this;while(this.bytes+bytes>this.maxBytes&&this.size)this.delete(this.keys().next().value);super.set(key,value);this.sizes.set(key,bytes);this.bytes+=bytes;return this;}
}
