# Domain Bloom Filter Generator

每天自动从多个域名源提取域名并生成布隆过滤器，通过 GitHub Actions 自动发布到 Release。

## 数据源

1. **GFWList** - https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt
2. **StevenBlack Hosts** - https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn-social/hosts
3. **Cloudflare Radar Top 5000** - 通过 API 获取每日排名前 5000 的域名

## 配置

需要在 GitHub Repository Settings → Secrets and variables → Actions 中配置：

- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token，需要有 Radar 读取权限

## 输出

每天生成的布隆过滤器将发布到 Release，以当天日期命名（格式：`YYYY-MM-DD`）。

## 本地运行

```bash
npm install
export CLOUDFLARE_API_TOKEN=your_token_here
node index.js
```

生成的布隆过滤器将保存为 `bloom-filter.json`。
