# atne storage

给 [♡ atne ♡](https://atnefallhmhz.vercel.app) 用的**你自己的**文件仓库。

点一下按钮，Cloudflare 会自动帮你建一个 R2 桶、部署一个 Worker。
之后你上传的所有文件都进你自己的桶，**atne 站点看不到你的文件，也拿不到你的密钥**。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/fallhmhz/atne-storage)

---

## 部署要几步

1. **点上面那个按钮**。没有 Cloudflare 账号的话会让你注册一个，免费。
2. Cloudflare 会把这个仓库复制一份到你的 GitHub，然后问你要一个 **`UPLOAD_KEY`** ——
   这是你的上传口令。这个输入框应该是空的，请自己填一串足够长的随机口令，
   **不要使用模板文字或别人给你的口令；填完先存下来**，待会要用。
3. **R2 bucket 那一栏选择 `+ Create new`，新建 `atoolne-storage`**，
   千万别选已有的桶 —— 尤其别选你用来存别的东西的私有桶。
   这个 Worker 会把桶里的内容通过 `/f/` 公开出去。
4. 等它自己建桶、部署完，你会拿到一个地址，长这样：
   `https://atoolne.你的名字.workers.dev`
5. 回到 atne 的**存储设置**，把这个地址和刚才那串口令填进去，点「测试连接」。

绿了就完事了。

## 费用

Cloudflare R2 免费额度：**10GB 存储 + 每月 100 万次读**，
个人存点图片字体绰绰有余，超了才开始计费。Worker 免费额度每天 10 万次请求。

## 它能做什么

| | |
|---|---|
| `GET /` | 健康检查 |
| `GET /_ping` | 带上 `x-upload-key` 时会告诉你口令对不对 |
| `GET /f/<名字>` | 公开读取 —— 你分享出去的链接就是走这条 |
| `PUT /<名字>` | 上传，要 `x-upload-key` |
| `DELETE /<名字>` | 删除，要 `x-upload-key` |

只有读是公开的，写和删都要口令。

## 想改点什么

在 `wrangler.jsonc` 里：

- **`MAX_MB`** —— 单个文件上限，默认 25MB
- **`ALLOW_ORIGIN`** —— 默认 `*`（谁都能调）。想收紧就换成你常用的站点地址，
  比如 `https://atnefallhmhz.vercel.app`

改完在 Cloudflare 后台重新部署一下就生效。

## 忘了口令怎么办

不用重新部署。去 Cloudflare 后台 → Workers → 你这个 Worker →
Settings → Variables and Secrets，把 `UPLOAD_KEY` 改成一个新的，
再回 atne 的存储设置更新一遍就行。

## 想绑自己的域名

Worker 的 Settings → Domains & Routes 里可以加自定义域名。
绑了之后链接会变成 `https://cdn.你的域名/f/xxx.png`，
比 `workers.dev` 更稳（`*.workers.dev` 在某些网络下不通）。
绑完记得把 atne 存储设置里的地址也换成新域名。
