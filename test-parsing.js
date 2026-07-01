// 离线单元测试：验证解析逻辑（不依赖网络）
function cleanGfwLine(line) {
  line = line.trim();
  if (!line || line.startsWith('!') || line.startsWith('[') || line.startsWith('@@')) return null;
  let domain = line
    .replace(/^\|\|/, '')
    .replace(/^\|https?:\/\//, '')
    .replace(/^\|/, '')
    .replace(/^\./, '')
    .replace(/^\*/, '');
  domain = domain.split('/')[0].split(':')[0];
  domain = domain.replace(/\*/g, '').replace(/^\./, '').replace(/\.+$/, '').trim();
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain) ? domain.toLowerCase() : null;
}

function cleanHostsLine(line) {
  line = line.trim();
  if (!line || line.startsWith('#')) return null;
  const parts = line.split(/\s+/);
  if (parts.length < 2) return null;
  const domain = parts[1].toLowerCase().trim();
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain) ? domain : null;
}

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

console.log('GFWList parsing:');
eq(cleanGfwLine('||twitter.com'), 'twitter.com', '|| prefix');
eq(cleanGfwLine('.facebook.com'), 'facebook.com', '. prefix');
eq(cleanGfwLine('*.i-scmp.com'), 'i-scmp.com', '*. prefix');
eq(cleanGfwLine('discordapp.com/app'), 'discordapp.com', 'path strip');
eq(cleanGfwLine('!comment'), null, 'comment rejected');
eq(cleanGfwLine('@@||whitelist.com'), null, 'whitelist rejected');
eq(cleanGfwLine('[AutoProxy]'), null, 'header rejected');
eq(cleanGfwLine('|http://85.17.73.31/'), null, 'raw IP rejected');

console.log('Hosts parsing:');
eq(cleanHostsLine('# comment'), null, 'comment rejected');
eq(cleanHostsLine('0.0.0.0 ads.example.com'), 'ads.example.com', '0.0.0.0 prefix stripped');
eq(cleanHostsLine('0.0.0.0 tracker.bad.net'), 'tracker.bad.net', 'another domain');
eq(cleanHostsLine('127.0.0.1 localhost'), null, 'localhost (no TLD) rejected');
eq(cleanHostsLine(''), null, 'empty rejected');

console.log(`\n${fail === 0 ? '✨ All' : '⚠️'} ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
