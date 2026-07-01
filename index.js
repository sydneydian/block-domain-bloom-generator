import pkg from 'bloom-filters';
const { BloomFilter } = pkg;
import { writeFileSync } from 'fs';

// ==================== 工具函数 ====================

/**
 * 从 GFWList 清洗域名（Base64 编码）
 */
function cleanGfwLine(line) {
  line = line.trim();

  // 1. 过滤掉注释、空行、AdBlock头部信息
  if (!line || line.startsWith('!') || line.startsWith('[') || line.startsWith('@@')) {
    return null;
  }

  // 2. 移除常见的正则表达式前缀与修饰符
  let domain = line
    .replace(/^\|\|/, '')       // 移除 AutoProxy 的域名通配符 || (例如 ||discord.com -> discord.com)
    .replace(/^\|https?:\/\//, '') // 移除精准 HTTP(S) 协议头 (例如 |http://85.17.73.31/ -> 85.17.73.31/)
    .replace(/^\|/, '')          // 移除普通的 | 锚定符
    .replace(/^\./, '')          // 移除开头的小圆点 (例如 .twitter.com -> twitter.com)
    .replace(/^\*/, '');         // 移除开头的星号通配符 (例如 *.i-scmp.com -> i-scmp.com)

  // 3. 切割并丢弃路径、端口和参数 (只保留 Host 部分)
  // 例如 discordapp.com/app -> discordapp.com
  domain = domain.split('/')[0].split(':')[0];

  // 4. 清理残留在域名中间或结尾的通配符、连字符、多余的点
  domain = domain
    .replace(/\*/g, '')          // 移除所有位置的 * 号 (例如 cdn*.i-scmp.com -> cdn-scmp.com)
    .replace(/^\./, '')          // 再次移除开头的点（例如 *.i-scmp.com 去星号后剩 .i-scmp.com -> i-scmp.com）
    .replace(/\.+$/, '')         // 移除末尾连续的点 (例如 javlib..... -> javlib)
    .trim();

  // 5. 验证合规性（利用正则确保清洗完后符合域名的基本结构，防止ip或垃圾字符混入）
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (domainRegex.test(domain)) {
    return domain.toLowerCase();
  }

  return null; // 如果是纯 IP (如 85.17.73.31) 或无效行，直接抛弃
}

/**
 * 从 Hosts 格式清洗域名
 * 格式：0.0.0.0 domain.com
 * 需要去除注释行和 0.0.0.0 前缀
 */
function cleanHostsLine(line) {
  line = line.trim();

  // 过滤注释和空行
  if (!line || line.startsWith('#')) {
    return null;
  }

  // 去除 0.0.0.0 或 127.0.0.1 前缀
  const parts = line.split(/\s+/);
  if (parts.length < 2) {
    return null;
  }

  const domain = parts[1].toLowerCase().trim();

  // 验证域名格式
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (domainRegex.test(domain)) {
    return domain;
  }

  return null;
}

// ==================== 数据获取函数 ====================

/**
 * 获取 GFWList 域名
 */
async function fetchGfwlist() {
  console.log('📡 Fetching GFWList...');
  const url = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const base64Text = await response.text();
    // 解码 Base64
    const decoded = Buffer.from(base64Text, 'base64').toString('utf-8');
    const lines = decoded.split('\n');

    const domains = new Set();
    for (const line of lines) {
      const domain = cleanGfwLine(line);
      if (domain) {
        domains.add(domain);
      }
    }

    console.log(`✅ GFWList: ${domains.size} domains`);
    return domains;
  } catch (error) {
    console.error('❌ Error fetching GFWList:', error.message);
    return new Set();
  }
}

/**
 * 获取 StevenBlack Hosts 域名
 */
async function fetchStevenBlackHosts() {
  console.log('📡 Fetching StevenBlack Hosts...');
  const url = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn-social/hosts';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    const domains = new Set();
    for (const line of lines) {
      const domain = cleanHostsLine(line);
      if (domain) {
        domains.add(domain);
      }
    }

    console.log(`✅ StevenBlack Hosts: ${domains.size} domains`);
    return domains;
  } catch (error) {
    console.error('❌ Error fetching StevenBlack Hosts:', error.message);
    return new Set();
  }
}

/**
 * 获取 Tranco Top 5000 域名
 * Tranco 是一个抗操纵的研究型网站排名榜（https://tranco-list.eu）
 * 流程：先请求最新榜单元数据拿到 list_id，再按 /download/{list_id}/5000 下载前 5000 名
 * CSV 格式为 "rank,domain"，无需认证
 */
async function fetchTranco() {
  console.log('📡 Fetching Tranco Top 5000...');

  const TOP_N = 5000;

  try {
    // 1. 获取最新榜单元数据
    const metaResp = await fetch('https://tranco-list.eu/api/lists/date/latest');
    if (!metaResp.ok) {
      throw new Error(`HTTP error fetching list metadata! status: ${metaResp.status}`);
    }

    const meta = await metaResp.json();
    const listId = meta.list_id;
    if (!listId) {
      throw new Error(`No list_id in Tranco response: ${JSON.stringify(meta)}`);
    }

    // 2. 下载前 5000 名（把下载路径末尾的数量替换为 5000）
    const downloadUrl = `https://tranco-list.eu/download/${listId}/${TOP_N}`;
    const csvResp = await fetch(downloadUrl);
    if (!csvResp.ok) {
      throw new Error(`HTTP error downloading list! status: ${csvResp.status}`);
    }

    const csvText = await csvResp.text();
    const lines = csvText.split('\n');

    const domains = new Set();
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // 格式："rank,domain"，取逗号后的域名部分
      const parts = line.split(',');
      const domain = (parts[1] || parts[0]).toLowerCase().trim();
      if (domainRegex.test(domain)) {
        domains.add(domain);
      }
    }

    console.log(`✅ Tranco: ${domains.size} domains (list ${listId})`);
    return domains;
  } catch (error) {
    console.error('❌ Error fetching Tranco:', error.message);
    return new Set();
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 Starting domain bloom filter generation...\n');

  // 并行获取所有数据源
  const [gfwDomains, hostsDomains, trancoDomains] = await Promise.all([
    fetchGfwlist(),
    fetchStevenBlackHosts(),
    fetchTranco()
  ]);

  // 合并所有域名
  const allDomains = new Set([
    ...gfwDomains,
    ...hostsDomains,
    ...trancoDomains
  ]);

  console.log(`\n📊 Total unique domains: ${allDomains.size}`);

  if (allDomains.size === 0) {
    console.error('❌ No domains collected. Exiting.');
    process.exit(1);
  }

  // 创建布隆过滤器
  // 假设预期域名数量，错误率设为 0.01 (1%)
  const expectedElements = allDomains.size;
  const errorRate = 0.01;

  console.log(`\n🔧 Creating Bloom Filter (expected: ${expectedElements}, error rate: ${errorRate})...`);

  const filter = BloomFilter.create(expectedElements, errorRate);

  // 添加所有域名到布隆过滤器
  for (const domain of allDomains) {
    filter.add(domain);
  }

  console.log('✅ Bloom filter created');

  // 导出为 JSON
  const exported = filter.saveAsJSON();
  const output = {
    metadata: {
      created: new Date().toISOString(),
      totalDomains: allDomains.size,
      sources: {
        gfwlist: gfwDomains.size,
        stevenBlackHosts: hostsDomains.size,
        tranco: trancoDomains.size
      },
      bloomFilter: {
        size: filter._size,
        nbHashes: filter._nbHashes,
        errorRate: errorRate
      }
    },
    filter: exported
  };

  writeFileSync('bloom-filter.json', JSON.stringify(output, null, 2));
  console.log('💾 Saved to bloom-filter.json');

  console.log('\n✨ Done!');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
