# atoolne storage template

给 [atoolne](https://www.atoolne.com) 使用的私人文件仓库部署模板。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/fallhmhz/atoolne-storage-template)

## 先分清两个仓库

- **这个 Public 仓库**是公开模板，只负责提供部署程序。
- 点击部署后，Cloudflare 会在你的 GitHub 中创建一个 **Private 仓库**。那个才是你自己的运行副本，可以按自己的习惯改名。

如果你现在看到的仓库是 Private，而且第一条提交来自 `cloudflare[bot]`，说明它已经是你的个人副本，**不用再点一次 Deploy to Cloudflare**。

文件不会存在 GitHub 里。图片、字体和 CSS 都保存在你自己的 Cloudflare R2；`UPLOAD_KEY` 保存在 Cloudflare Secret，并在 atoolne 中加密保存。

## 部署

1. 点击上面的 **Deploy to Cloudflare**。
2. 登录 Cloudflare 和 GitHub。Cloudflare 会从模板创建一份 Private 仓库。
3. `UPLOAD_KEY` 请自己填写一串足够长的随机口令，并先保存好。不要使用示例文字，也不要与别人共用。
4. 在 R2 bucket 一栏选择 **Create new**，新建 `atoolne-storage`。不要选择已有桶，尤其不要选择存放其他私人资料的桶。
5. 等待 Cloudflare 创建 R2、部署 Worker。完成后会得到类似这样的地址：
   `https://atoolne.你的名字.workers.dev`
6. 回到 atoolne 的「存储设置」，填入 Worker 地址和 `UPLOAD_KEY`，再点「测试连接」。

## 文件链路

上传时，浏览器会把文件直接发送到你的 Worker，再写入你的私人 R2。atoolne 的服务器不接收文件字节，也拿不到明文 `UPLOAD_KEY`。

分享时，atoolne 统一生成：

`https://file.atoolne.com/f/文件名`

EdgeOne 会根据文件归属，从对应的私人 Worker 读取文件并返回。分享者不会看到你的 Worker 地址；文件仍然保存在你自己的 R2。

## Worker 接口

| 接口 | 用途 |
|---|---|
| `GET /` | 检查 Worker 是否运行 |
| `GET /_ping` | 检查 `UPLOAD_KEY` 是否正确 |
| `GET /f/<名字>` | 公开读取，供 EdgeOne 获取文件 |
| `PUT /<名字>` | 上传，需要 `x-upload-key` |
| `DELETE /<名字>` | 删除，需要 `x-upload-key` |

文件读取是公开的，因为成果链接需要被访问；上传和删除始终需要口令。

## 可调整设置

在 `wrangler.jsonc` 中：

- `MAX_MB`：单个文件上限，默认 25MB。
- `ALLOW_ORIGIN`：浏览器跨域访问范围，默认 `*`。它不会绕过 `UPLOAD_KEY`；不熟悉跨域规则时请保持默认，否则可能造成正式站或测试站无法上传。

Cloudflare 的免费额度和计费规则可能变化，请以 Cloudflare 控制台当时显示的内容为准。

## 忘记 UPLOAD_KEY

不需要重新部署，也不会影响 R2 里的文件。

进入 Cloudflare 对应 Worker 的 **Settings → Variables and Secrets**，重新设置 `UPLOAD_KEY`，再回到 atoolne 更新仓库口令。

## 修改私人仓库名称

GitHub 仓库改名不会删除 Worker 或 R2 文件，但 Cloudflare 的自动构建连接可能需要重新确认。改名后请到 Worker 的 **Settings → Builds**，检查 Git repository 是否仍连接到新的仓库名。

## 给 Worker 绑定自定义域名

这不是必需步骤。绑定后，只需要在 atoolne 的存储设置中把 Worker 地址换成新域名；对外分享的成果链接仍然使用 `file.atoolne.com`。
