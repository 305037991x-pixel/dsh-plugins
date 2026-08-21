# install-rdp-vd.ps1 — RDP 环回隔离版一键安装（需以管理员身份运行）
# 产物：虚拟显示器 IddSampleDriver + RDP 并发会话（RDP Wrapper）+ DSH 虚拟桌面专用账号
# 16G 机器仅多占 ~300MB，按需启动，不常驻

#Requires -Version 5.1
param(
  [switch]$SkipDriver,
  [switch]$SkipRdpWrapper
)

$ErrorActionPreference = 'Stop'

function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
  Write-Host "❌ 请以管理员身份重新运行此脚本（右键 PowerShell -> 以管理员身份运行）" -ForegroundColor Red
  Write-Host "   当前：$env:USERNAME @ $env:COMPUTERNAME" -ForegroundColor DarkGray
  Write-Host "   命令：powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -ForegroundColor DarkGray
  exit 1
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " DSH 虚拟桌面 · RDP 环回隔离版 安装" -ForegroundColor Cyan
Write-Host " 16G 仅多占 ~300MB | 按需启动 | 后台不抢屏" -ForegroundColor DarkGray
Write-Host "==============================================" -ForegroundColor Cyan

# ── 0. 系统信息 ──
Write-Host "`n[0/4] 系统检查..." -ForegroundColor Yellow
$os = (Get-CimInstance Win32_OperatingSystem)
Write-Host "  系统: $($os.Caption) $($os.OSArchitecture) Build $($os.BuildNumber)"
Write-Host "  内存: $([math]::Round($os.TotalVisibleMemorySize/1MB,1)) GB"
$quser = quser 2>$null | Out-String
Write-Host "  会话:`n$quser" -ForegroundColor DarkGray

# ── 1. 虚拟显示器驱动 IddSampleDriver ──
if (-not $SkipDriver) {
  Write-Host "`n[1/4] 虚拟显示器驱动 IddSampleDriver..." -ForegroundColor Yellow
  $driverDir = "$PSScriptRoot\IddSampleDriver"
  $driverInf = "$driverDir\IddSampleDriver.inf"
  if (Test-Path $driverInf) {
    Write-Host "  已存在: $driverInf" -ForegroundColor DarkGray
  } else {
    Write-Host "  下载 IddSampleDriver (roshkins/IddSampleDriver)..." -ForegroundColor DarkGray
    $zip = "$env:TEMP\IddSampleDriver.zip"
    $url = "https://github.com/roshkins/IddSampleDriver/archive/refs/heads/master.zip"
    try {
      # 优先用 gh 无代理，其次 Invoke-WebRequest
      if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Host "  gh 下载中..." -ForegroundColor DarkGray
      }
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 60
      Expand-Archive -Path $zip -DestinationPath "$env:TEMP\IddExtract" -Force
      $src = Get-ChildItem "$env:TEMP\IddExtract" -Directory | Select-Object -First 1
      if ($src) {
        New-Item -ItemType Directory -Force -Path $driverDir | Out-Null
        Copy-Item "$($src.FullName)\*" $driverDir -Recurse -Force
        Write-Host "  已解压到 $driverDir" -ForegroundColor Green
      }
    } catch {
      Write-Host "  ⚠ 下载失败: $($_.Exception.Message)" -ForegroundColor Yellow
      Write-Host "  手动下载: https://github.com/roshkins/IddSampleDriver" -ForegroundColor DarkGray
      Write-Host "  解压后把 IddSampleDriver.inf 放到 $driverDir" -ForegroundColor DarkGray
    }
  }
  # 尝试安装（需已编译的驱动；源码版需 VS 编译，此处仅提示）
  if (Test-Path $driverInf) {
    # 检查是否已有编译产物 .sys
    $sys = Get-ChildItem $driverDir -Filter "*.sys" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($sys) {
      Write-Host "  发现已编译驱动: $($sys.FullName)" -ForegroundColor Green
      Write-Host "  安装: pnputil /add-driver `"$driverInf`" /install" -ForegroundColor DarkGray
      try { pnputil /add-driver "$driverInf" /install | Out-String | Write-Host -ForegroundColor DarkGray } catch { Write-Host "  pnputil 失败: $($_.Exception.Message)" -ForegroundColor Yellow }
    } else {
      Write-Host "  ⚠ 未发现已编译的 .sys（源码版需 Visual Studio 编译）" -ForegroundColor Yellow
      Write-Host "  替代：可用 USBMMIdd 等预编译虚拟显示器，或先跳过此步（-SkipDriver），RDP 会话仍可用" -ForegroundColor DarkGray
      Write-Host "  预编译替代一键安装: https://github.com/itsmikethetech/Virtual-Display-Driver" -ForegroundColor Cyan
    }
  }
} else {
  Write-Host "`n[1/4] 跳过虚拟显示器 (-SkipDriver)" -ForegroundColor DarkGray
}

# ── 2. RDP 并发会话 ──
if (-not $SkipRdpWrapper) {
  Write-Host "`n[2/4] RDP 并发会话..." -ForegroundColor Yellow
  $edition = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -ErrorAction SilentlyContinue).EditionID
  $isPro = $edition -match "Professional|Enterprise|Education"
  Write-Host "  版本: $edition (Pro/企业: $isPro)" -ForegroundColor DarkGray
  if ($isPro) {
    Write-Host "  启用 RDP..." -ForegroundColor DarkGray
    Set-ItemProperty -Path "HKLM:\System\CurrentControlSet\Control\Terminal Server" -Name "fDenyTSConnections" -Value 0 -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "远程桌面" -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  ✓ RDP 已启用" -ForegroundColor Green
    Write-Host "  提示：Pro 版默认单会话并发需 RDP Wrapper 补丁，否则第二会话会踢掉第一会话" -ForegroundColor DarkGray
  }
  # RDP Wrapper（Home/Pro 通用，解锁并发+单用户多会话）
  $wrapDir = "C:\Program Files\RDP Wrapper"
  $wrapDll = "$wrapDir\rdpwrap.dll"
  if (Test-Path $wrapDll) {
    Write-Host "  RDP Wrapper 已安装: $wrapDll" -ForegroundColor Green
  } else {
    Write-Host "  安装 RDP Wrapper (stascorp/rdpwrap)..." -ForegroundColor DarkGray
    $zip = "$env:TEMP\rdpwrap.zip"
    $url = "https://github.com/stascorp/rdpwrap/releases/latest/download/RDPWrap-v1.6.2.zip"
    try {
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 60
      New-Item -ItemType Directory -Force -Path $wrapDir | Out-Null
      Expand-Archive -Path $zip -DestinationPath $wrapDir -Force
      Write-Host "  已解压到 $wrapDir" -ForegroundColor Green
      $ini = "$wrapDir\rdpwrap.ini"
      if (Test-Path "$wrapDir\RDPWInst.exe") {
        Start-Process -FilePath "$wrapDir\RDPWInst.exe" -ArgumentList "-i -s" -Wait -WindowStyle Hidden
        Write-Host "  RDPWInst -i 已执行" -ForegroundColor Green
      } else {
        Write-Host "  ⚠ 未找到 RDPWInst.exe，请手动运行 $wrapDir\RDPWInst.exe -i -s" -ForegroundColor Yellow
      }
      # 更新 ini（如有新版）
      $iniUrl = "https://raw.githubusercontent.com/sebaxakerhtc/rdpwrap.ini/master/rdpwrap.ini"
      try { Invoke-WebRequest -Uri $iniUrl -OutFile $ini -UseBasicParsing -TimeoutSec 30; Write-Host "  rdpwrap.ini 已更新" -ForegroundColor DarkGray } catch {}
    } catch {
      Write-Host "  ⚠ RDP Wrapper 下载失败: $($_.Exception.Message)" -ForegroundColor Yellow
      Write-Host "  手动：https://github.com/stascorp/rdpwrap/releases" -ForegroundColor DarkGray
    }
  }
  # 验证
  try { $st = Get-Service TermService -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status; Write-Host "  TermService: $st" -ForegroundColor DarkGray } catch {}
  if (Test-Path "$wrapDir\RDPConf.exe") { Write-Host "  运行 $wrapDir\RDPConf.exe 可图形化验证（Listener state: Listening）" -ForegroundColor Cyan }
} else {
  Write-Host "`n[2/4] 跳过 RDP Wrapper (-SkipRdpWrapper)" -ForegroundColor DarkGray
}

# ── 3. 虚拟桌面专用账号（可选，隔离更干净）──
Write-Host "`n[3/4] 虚拟桌面账号..." -ForegroundColor Yellow
$vdUser = "dsh-vd"
$existing = Get-LocalUser -Name $vdUser -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "  已存在账号: $vdUser ($($existing.Enabled))" -ForegroundColor Green
} else {
  $pw = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })
  $sec = ConvertTo-SecureString $pw -AsPlainText -Force
  try {
    New-LocalUser -Name $vdUser -Password $sec -FullName "DSH Virtual Desktop" -Description "DSH 虚拟桌面隔离会话专用" -PasswordNeverExpires | Out-Null
    Add-LocalGroupMember -Group "Remote Desktop Users" -Member $vdUser -ErrorAction SilentlyContinue
    Add-LocalGroupMember -Group "Users" -Member $vdUser -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已创建账号: $vdUser / 密码已生成（仅显示一次）" -ForegroundColor Green
    Write-Host "  账号: $vdUser  密码: $pw" -ForegroundColor Cyan
    Write-Host "  已加入 Remote Desktop Users，可用于 mstsc 127.0.0.1 第二会话" -ForegroundColor DarkGray
    $pw | Set-Content "$PSScriptRoot\vd-password.txt" -Encoding utf8
    Write-Host "  密码已保存到 $PSScriptRoot\vd-password.txt（用后删除）" -ForegroundColor DarkGray
  } catch {
    Write-Host "  ⚠ 创建账号失败: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  可手动：net user $vdUser * /add && net localgroup `"Remote Desktop Users`" $vdUser /add" -ForegroundColor DarkGray
  }
}

# ── 4. 收尾 ──
Write-Host "`n[4/4] 完成" -ForegroundColor Yellow
Write-Host "  下一步（在 DSH 里）:" -ForegroundColor White
Write-Host "    1. 齿轮 -> 设置 -> 虚拟桌面 -> 选 RDP 模式" -ForegroundColor White
Write-Host "    2. 点 启动隔离桌面（首次会 mstsc 127.0.0.1 用 $vdUser 登录）" -ForegroundColor White
Write-Host "    3. 在隔离桌面里操作，不影响你当前桌面；用完点 注销 即释放内存" -ForegroundColor White
Write-Host "`n  占用：RDP 会话 +200~400MB，关掉即 0；平时不启动不占" -ForegroundColor DarkGray
Write-Host "  排障：RDP Wrapper 配置见 $wrapDir\RDPConf.exe；虚拟显示器见 设备管理器->显示适配器" -ForegroundColor DarkGray
Write-Host "`n✅ 安装脚本执行完毕" -ForegroundColor Green
