import { BloomFilter } from 'bloom-filters';
import { readFileSync } from 'fs';

console.log('🧪 Testing bloom filter...\n');

// 读取生成的布隆过滤器
let filterData;
try {
  filterData = JSON.parse(readFileSync('bloom-filter.json', 'utf-8'));
} catch (error) {
  console.error('❌ Error: bloom-filter.json not found. Run `node index.js` first.');
  process.exit(1);
}

console.log('📊 Metadata:');
console.log(`  Created: ${filterData.metadata.created}`);
console.log(`  Total domains: ${filterData.metadata.totalDomains}`);
console.log(`  Sources:`);
console.log(`    - GFWList: ${filterData.metadata.sources.gfwlist}`);
console.log(`    - StevenBlack Hosts: ${filterData.metadata.sources.stevenBlackHosts}`);
console.log(`    - Cloudflare Radar: ${filterData.metadata.sources.cloudflareRadar}`);
console.log(`  Bloom Filter:`);
console.log(`    - Size: ${filterData.metadata.bloomFilter.size}`);
console.log(`    - Hash functions: ${filterData.metadata.bloomFilter.nbHashes}`);
console.log(`    - Error rate: ${filterData.metadata.bloomFilter.errorRate}`);

// 重新加载布隆过滤器
const filter = BloomFilter.fromJSON(filterData.filter);

console.log('\n🔍 Testing known domains (should be present):');
const testDomains = [
  'google.com',
  'facebook.com',
  'twitter.com',
  'youtube.com',
  'instagram.com'
];

for (const domain of testDomains) {
  const has = filter.has(domain);
  console.log(`  ${has ? '✅' : '❌'} ${domain}: ${has ? 'found' : 'not found'}`);
}

console.log('\n🔍 Testing random domains (likely not present):');
const randomDomains = [
  'this-is-totally-random-12345.com',
  'nonexistent-test-domain-xyz.org',
  'fake-domain-for-testing.net'
];

for (const domain of randomDomains) {
  const has = filter.has(domain);
  console.log(`  ${has ? '⚠️' : '✅'} ${domain}: ${has ? 'found (false positive?)' : 'not found'}`);
}

console.log('\n✨ Test completed!');
