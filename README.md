# 随手问 · 安装包与自动更新

此公开仓库仅分发安装包、更新清单及发布校验工具。产品源码在独立私有仓库中开发。

目前正在准备首个已签名的自动更新版本。清单中的 0.0.0 表示暂无更新，不是可安装版本。

## 发布

1. 在私有源码环境构建并签名。Mac ZIP 中的应用还须通过 Apple 公证并附加票据；Windows EXE 须有有效 Authenticode 签名。
2. 在本仓库 Settings → Secrets and variables → Actions → Variables 设置 `APPLE_TEAM_ID`（Mac 开发者团队 ID）和 `WINDOWS_PUBLISHER_SUBJECT`（Windows 签名证书完整 Subject）。这些是公开身份，不是密钥。证书私钥只保留在私有构建环境。
3. 创建 `vX.Y.Z` 的 Draft Release，上传 `Suishouwen-X.Y.Z-mac-arm64.zip`、`Suishouwen-X.Y.Z-mac-x64.zip` 和/或 `Suishouwen-X.Y.Z-Setup.exe`。DMG 供首次安装，可一并上传。可以仅发布已验证的平台。
4. 发布 Release。Actions 下载实际资产，验证签名和公证，计算摘要。所有实际包含的平台通过后，才原子更新相应清单；缺少的平台保持原版本。
5. 在 Actions 的 Promote verified release 工作流查看结果。首次签名版本需手动安装一次。

工作流拒绝预发布版本、版本倒退及未知发布者。重试可在 Actions 手动运行并填写版本标签。更新检查失败不会影响已有应用使用。

更新入口：`https://raw.githubusercontent.com/Fun336/suishouwen-releases/main/`
