# publish-all.ps1 — 本机维护一键发布（源码 → 校验 → 提交 → 推送）
# 用法（在 dsh-plugins 仓库目录下）：
#   .\publish-all.ps1 -Message "fix: xxx"          # 常规发布
#   .\publish-all.ps1 -Message "feat: xxx" -Push   # 发布并推送（默认即推送）
#   .\publish-all.ps1 -DryRun                      # 只检查不提交
#
# 前置：本仓库已 git init 并设置 origin；gh CLI 或 git 凭据可用。
param(
    [Parameter(Mandatory = $false)]
    [string]$Message = 'chore: sync plugins',
    [switch]$DryRun,
    [switch]$NoPush,
    [string]$RepoUrl = 'https://github.com/305037991x-pixel/dsh-plugins.git'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# ── 0. 前提检查 ───────────────────────────────────────────────────
Write-Host "[0/4] 检查环境..." -ForegroundColor Yellow
if (-not (Test-Path "$root\.git")) {
    Write-Host "尚未 git init，初始化仓库..." -ForegroundColor Yellow
    git -C $root init -q
    git -C $root remote add origin $RepoUrl
    if ($LASTEXITCODE -ne 0) { git -C $root remote set-url origin $RepoUrl }
}

# noreply 邮箱（避免 GH007 隐私拦截，见 PITFALLS.md #12）
$email = git -C $root config user.email
if (-not $email) {
    git -C $root config user.email '305037991x-pixel@users.noreply.github.com'
    git -C $root config user.name '305037991x-pixel'
    Write-Host "  已设置 noreply 提交身份" -ForegroundColor DarkGray
}

# ── 1. 清理本机开发痕迹 + 校验每个包完整性 ─────────────────────────
Write-Host "[1/4] 清理与校验 packages/ ..." -ForegroundColor Yellow
$dirty = @()
Get-ChildItem "$root\packages" -Directory | ForEach-Object {
    $pkg = $_.Name
    # 删除本机专属文件（保持仓库干净）
    Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(verify|tmp|probe)-|\.log$|^web\.(stdout|stderr)\.log$|^restart-web\.ps1$' } |
        ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  🧹 $pkg: 移除 $($_.Name)" -ForegroundColor DarkGray }
    # 校验必备文件
    foreach ($f in 'package.json', 'README.md', 'LICENSE', 'lib') {
        if (-not (Test-Path (Join-Path $_.FullName $f))) { $dirty += "$pkg/$f" }
    }
}
if ($dirty.Count -gt 0) {
    Write-Host "✗ 以下文件缺失，先补齐再发布：$($dirty -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ 所有包文件完整" -ForegroundColor Green

# ── 2. 扫描敏感信息 ───────────────────────────────────────────────
Write-Host "[2/4] 敏感信息扫描..." -ForegroundColor Yellow
$secrets = Get-ChildItem "$root" -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\.git\\|node_modules' } |
    Select-String -Pattern 'sk-[A-Za-z0-9]{20,}|api[_-]?key\s*[:=]\s*["'']?[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}' -List -ErrorAction SilentlyContinue
if ($secrets) {
    Write-Host "✗ 发现疑似敏感信息，中止发布：" -ForegroundColor Red
    $secrets | ForEach-Object { Write-Host "  $($_.Path): $($_.Line.Substring(0, [Math]::Min(60, $_.Line.Length)))" -ForegroundColor Red }
    exit 1
}
Write-Host "  ✓ 无敏感信息" -ForegroundColor Green

# ── 3. 提交 ───────────────────────────────────────────────────────
Write-Host "[3/4] git add + commit..." -ForegroundColor Yellow
git -C $root add -A
$changed = git -C $root status --porcelain
if (-not $changed) { Write-Host "  ✓ 无改动，跳过提交" -ForegroundColor Green }
else {
    $changed | ForEach-Object { Write-Host "  + $_" -ForegroundColor DarkGray }
    if ($DryRun) { Write-Host "  [DryRun] 不提交" -ForegroundColor DarkGray; exit 0 }
    git -C $root commit -m $Message
    if ($LASTEXITCODE -ne 0) { Write-Host "✗ commit 失败（检查 git 身份）" -ForegroundColor Red; exit 1 }
    Write-Host "  ✓ 已提交: $Message" -ForegroundColor Green
}

# ── 4. 推送 ───────────────────────────────────────────────────────
if ($NoPush) { Write-Host "[4/4] 跳过推送（-NoPush）" -ForegroundColor DarkGray; exit 0 }
Write-Host "[4/4] 推送 origin..." -ForegroundColor Yellow
git -C $root push origin HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ push 失败。若报 GH007（隐私邮箱），已自动使用 noreply；" -ForegroundColor Red
    Write-Host "  可手动：git -C $root config user.email 305037991x-pixel@users.noreply.github.com" -ForegroundColor DarkGray
    exit 1
}
Write-Host "✅ 发布完成：$RepoUrl" -ForegroundColor Green
Write-Host "  验证安装：dsh plugin --profile web add github:305037991x-pixel/dsh-plugins#path:packages/<插件名>" -ForegroundColor DarkGray
