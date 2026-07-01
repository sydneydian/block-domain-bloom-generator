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
    .replace(/\.+$/, '')         // 移除末尾连续的点 (例如 javlib..... -> javlib)
    .trim();

  // 5. 验证合规性（利用正则确保清洗完后符合域名的基本结构，防止ip或垃圾字符混入）
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (domainRegex.test(domain)) {
    return domain.toLowerCase();
  }

  return null; // 如果是纯 IP (如 85.17.73.31) 或无效行，直接抛弃
}