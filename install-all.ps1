# install-all.ps1 — 一键安装全部 dsh-plugins 插件
# 用法（在另一台电脑上）：
#   powershell -ExecutionPolicy Bypass -File .\install-all.ps1
#   或加 -SkipConfirm 跳过逐个确认
# 前置要求：已安装 DSH（dsh CLI）、pnpm 在 PATH 上、Node.js >= 22.19
param(
    [switch]$SkipConfirm,
    [string]$Profile = 'web'
)

$ErrorActionPreference = 'Stop'

# ── 插件清单（与仓库 README 保持一致）──────────────────────────────
$plugins = @(
    @{ Name = 'dsh-balance';              Desc = 'DeepSeek 余额芯片' },
    @{ Name = 'dsh-opencode-go';          Desc = 'OpenCode GO 用量芯片' },
    @{ Name = 'dsh-conversation-cost';    Desc = '对话额度/费用统计' },
    @{ Name = 'dsh-opencode-go-pricing';  Desc = 'GO 计价表同步' },
    @{ Name = 'dsh-task-notify';          Desc = '回复完成系统通知' },
    @{ Name = 'dsh-skill-browser';        Desc = '侧边栏技能浏览器' },
    @{ Name = 'dsh-vision-bridge';        Desc = '图片自动识图转文字' },
    @{ Name = 'dsh-codex-annotations';    Desc = 'Codex 风格选中文本批注' },
    @{ Name = 'dsh-open-file';            Desc = '产物路径单击预览/Ctrl+点击打开/文件夹定位' },
    @{ Name = 'dsh-virtual-desktop';      Desc = '虚拟桌面 MVP（本机版）：网页看屏+远程键鼠' }
)

$repo = 'github:305037991x-pixel/dsh-plugins'

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " dsh-plugins 一键安装（profile: $Profile）" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ── 前置检查 ──────────────────────────────────────────────────────
Write-Host "`n[1/3] 前置检查..." -ForegroundColor Yellow
$node = node -v 2>$null
if (-not $node) { Write-Host "✗ Node.js 未安装（需要 >= 22.19）" -ForegroundColor Red; exit 1 }
Write-Host "  Node.js: $node"

$pnpm = pnpm --version 2>$null
if (-not $pnpm) {
    Write-Host "✗ pnpm 不在 PATH 上，尝试安装..." -ForegroundColor Yellow
    npm i -g pnpm
    $pnpm = pnpm --version 2>$null
    if (-not $pnpm) { Write-Host "✗ pnpm 安装失败，请手动 npm i -g pnpm" -ForegroundColor Red; exit 1 }
}
Write-Host "  pnpm: $pnpm"

$dsh = dsh --version 2>$null
if (-not $dsh) { Write-Host "✗ dsh CLI 未找到（需先安装 DeepSeek Harness）" -ForegroundColor Red; exit 1 }
Write-Host "  dsh: $dsh"

# ── 逐条安装 ──────────────────────────────────────────────────────
Write-Host "`n[2/3] 安装 $($plugins.Count) 个插件..." -ForegroundColor Yellow
$ok = 0; $fail = @()
foreach ($p in $plugins) {
    $spec = "$repo#path:packages/$($p.Name)"
    $action = if ($SkipConfirm) { 'y' } else { Read-Host "安装 $($p.Name)（$($p.Desc)）? [y/N]" }
    if ($action -notmatch '^[yY]') { Write-Host "  跳过 $($p.Name)" -ForegroundColor DarkGray; continue }
    Write-Host "  → dsh plugin --profile $Profile add $spec"
    dsh plugin --profile $Profile add $spec 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -eq 0) { $ok++; Write-Host "  ✓ $($p.Name) 安装成功" -ForegroundColor Green }
    else { $fail += $p.Name; Write-Host "  ✗ $($p.Name) 安装失败（见上方输出）" -ForegroundColor Red }
}

# ── 收尾 ──────────────────────────────────────────────────────────
Write-Host "`n[3/3] 完成：成功 $ok / 共 $($plugins.Count)" -ForegroundColor Yellow
if ($fail.Count -gt 0) {
    Write-Host "失败列表: $($fail -join ', ')" -ForegroundColor Red
    Write-Host "常见原因见仓库 PITFALLS.md（pnpm 版本门禁 / 依赖解析等）" -ForegroundColor DarkGray
    exit 1
}

Write-Host "`n✅ 全部插件安装完成！下一步：" -ForegroundColor Green
Write-Host "  1. 重启 dsh web（会话会中断，页面需刷新）" -ForegroundColor White
Write-Host "  2. 硬刷新页面 Ctrl+Shift+R" -ForegroundColor White
Write-Host "  3. 个别插件需额外配置（API Key 等），见各插件 README" -ForegroundColor White
Write-Host "  踩坑速查：https://github.com/305037991x-pixel/dsh-plugins/blob/main/PITFALLS.md" -ForegroundColor DarkGray
