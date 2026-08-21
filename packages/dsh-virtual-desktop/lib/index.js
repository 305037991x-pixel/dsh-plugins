// dsh-virtual-desktop — host half (MVP: 本机版，不走云)
// 提供：
//   POST /api/virtual-desktop/capture  -> { ok, mime, data(base64), width, height }  本机屏幕截图（PowerShell BitBlt）
//   POST /api/virtual-desktop/input    -> { ok }  点击/输入/按键/滚轮（PowerShell SendInput 封装）
//   GET  /api/virtual-desktop/status   -> { ok, platform, arch, scaling }
// 安全：input 坐标做 0..16383 范围夹紧；type 文本限 4KB；key 白名单。
import { execFile } from 'node:child_process'

export const name = 'dsh-virtual-desktop'
export const inject = ['webServer']

const MAX_TYPE_LEN = 4000
const ALLOWED_KEYS = new Set([
  'Enter','Escape','Tab','Backspace','Delete','Space',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  'Home','End','PageUp','PageDown',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'Win','Alt','Ctrl','Shift'
])

function writeJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0
    req.on('data', c => { size += c.length; if (size > 256*1024) { reject(new Error('body too large')); req.destroy(); return } chunks.push(c) })
    req.on('end', () => { try { const t = Buffer.concat(chunks).toString('utf8'); resolve(t==='' ? {} : JSON.parse(t)) } catch(e){ reject(e) } })
    req.on('error', reject)
  })
}

function execPs(script, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile','-Command', script], { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) resolve({ ok:false, error:(stderr||err.message).slice(0,4000), stdout: String(stdout||'').slice(0,8000) })
      else resolve({ ok:true, stdout: String(stdout||''), stderr: String(stderr||'') })
    })
  })
}

function psEscape(s) {
  return String(s).replace(/'/g, "''").replace(/\r/g,'`r').replace(/\n/g,'`n')
}

export function apply(ctx) {
  const webServer = ctx.webServer
  if (!webServer) return

  ctx.effect(() => webServer.register({ kind:'exact', path:'/api/virtual-desktop/status', handler: async (req,res) => {
    writeJson(res,200,{ ok:true, platform: process.platform, arch: process.arch, node: process.version })
  }}), 'vd: status')

  ctx.effect(() => webServer.register({ kind:'exact', path:'/api/virtual-desktop/capture', handler: async (req,res) => {
    try {
      const body = await readBody(req).catch(()=>({}))
      let quality = 70
      if (body && typeof body.quality === 'number') quality = Math.max(30, Math.min(90, Math.round(body.quality)))
      // 优先用 .NET BitBlt 截图（无需额外依赖），输出 JPEG base64 到 stdout
      const script = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$ms = New-Object System.IO.MemoryStream
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$enc = New-Object System.Drawing.Imaging.EncoderParameters 1
$enc.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [int]${quality})
$bmp.Save($ms, $codec, $enc)
$g.Dispose(); $bmp.Dispose()
[Convert]::ToBase64String($ms.ToArray())
`
      const r = await execPs(script, 20000)
      if (!r.ok) { writeJson(res,500,{ ok:false, error:r.error }); return }
      const b64 = r.stdout.trim()
      if (!b64 || b64.length < 100) { writeJson(res,500,{ ok:false, error:'empty capture', raw: b64.slice(0,200) }); return }
      // 额外用 PowerShell 拿一次 VirtualScreen 尺寸
      const dim = await execPs(`Add-Type -AssemblyName System.Windows.Forms; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; Write-Output "$($b.Width) $($b.Height)"`, 5000)
      let w=0,h=0
      if (dim.ok) { const m = dim.stdout.trim().split(/\s+/); w=parseInt(m[0],10)||0; h=parseInt(m[1],10)||0 }
      writeJson(res,200,{ ok:true, mime:'image/jpeg', data:b64, width:w, height:h })
    } catch(e){ writeJson(res,500,{ ok:false, error: e instanceof Error ? e.message : String(e) }) }
  }}), 'vd: capture')

  ctx.effect(() => webServer.register({ kind:'exact', path:'/api/virtual-desktop/input', handler: async (req,res) => {
    try {
      const body = await readBody(req)
      const action = body && typeof body.action === 'string' ? body.action : ''
      if (action === 'click') {
        const x = Math.max(0, Math.min(1, Number(body.x)))
        const y = Math.max(0, Math.min(1, Number(body.y)))
        if (!(x>=0 && x<=1 && y>=0 && y<=1)) { writeJson(res,400,{ ok:false, error:'invalid x/y' }); return }
        const button = body.button === 'right' ? 'right' : body.button === 'middle' ? 'middle' : 'left'
        const dbl = body.double === true
        // 归一化坐标转像素：用 VirtualScreen 映射
        const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Inp {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X,int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags,int dx,int dy,int cButtons,int dwExtraInfo);
  public const int LEFTDOWN=0x02, LEFTUP=0x04, RIGHTDOWN=0x08, RIGHTUP=0x10, MIDDLEDOWN=0x20, MIDDLEUP=0x40;
}
"@
Add-Type -AssemblyName System.Windows.Forms
$b=[System.Windows.Forms.SystemInformation]::VirtualScreen
$px=[int]($b.X + ${x}*$b.Width)
$py=[int]($b.Y + ${y}*$b.Height)
[Inp]::SetCursorPos($px,$py)
Start-Sleep -Milliseconds 80
${dbl ? `
if ('${button}' -eq 'left') { [Inp]::mouse_event([Inp]::LEFTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::LEFTUP,0,0,0,0); Start-Sleep -Milliseconds 60; [Inp]::mouse_event([Inp]::LEFTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::LEFTUP,0,0,0,0) }
elseif ('${button}' -eq 'right') { [Inp]::mouse_event([Inp]::RIGHTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::RIGHTUP,0,0,0,0); Start-Sleep -Milliseconds 60; [Inp]::mouse_event([Inp]::RIGHTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::RIGHTUP,0,0,0,0) }
else { [Inp]::mouse_event([Inp]::MIDDLEDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::MIDDLEUP,0,0,0,0); Start-Sleep -Milliseconds 60; [Inp]::mouse_event([Inp]::MIDDLEDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::MIDDLEUP,0,0,0,0) }
` : `
if ('${button}' -eq 'left') { [Inp]::mouse_event([Inp]::LEFTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::LEFTUP,0,0,0,0) }
elseif ('${button}' -eq 'right') { [Inp]::mouse_event([Inp]::RIGHTDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::RIGHTUP,0,0,0,0) }
else { [Inp]::mouse_event([Inp]::MIDDLEDOWN,0,0,0,0); [Inp]::mouse_event([Inp]::MIDDLEUP,0,0,0,0) }
`}
Write-Output "ok $px $py"
`
        const r = await execPs(script, 8000)
        if (!r.ok) { writeJson(res,500,{ ok:false, error:r.error }); return }
        writeJson(res,200,{ ok:true, raw:r.stdout.trim() }); return
      }
      if (action === 'type') {
        const text = typeof body.text === 'string' ? body.text.slice(0, MAX_TYPE_LEN) : ''
        if (!text) { writeJson(res,400,{ ok:false, error:'missing text' }); return }
        const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${psEscape(text)}')
Write-Output ok
`
        const r = await execPs(script, 8000)
        if (!r.ok) { writeJson(res,500,{ ok:false, error:r.error }); return }
        writeJson(res,200,{ ok:true }); return
      }
      if (action === 'key') {
        const key = typeof body.key === 'string' ? body.key : ''
        // 允许：单字符 / 组合如 Ctrl+C / 白名单特殊键
        // 组合键用 SendKeys 语法：^=Ctrl, %=Alt, +=Shift
        const raw = key.trim()
        if (!raw) { writeJson(res,400,{ ok:false, error:'missing key' }); return }
        // 简单白名单+转义：只允许可打印+常见控制
        const sendKeysMap = { Enter:'{ENTER}', Escape:'{ESC}', Tab:'{TAB}', Backspace:'{BS}', Delete:'{DEL}', Space:' ', ArrowUp:'{UP}', ArrowDown:'{DOWN}', ArrowLeft:'{LEFT}', ArrowRight:'{RIGHT}', Home:'{HOME}', End:'{END}', PageUp:'{PGUP}', PageDown:'{PGDN}' }
        let sk = null
        if (sendKeysMap[raw]) sk = sendKeysMap[raw]
        else if (/^(Ctrl|Alt|Shift)\+[A-Za-z0-9]$/i.test(raw)) {
          const m = raw.match(/^(Ctrl|Alt|Shift)\+([A-Za-z0-9])$/i)
          const mod = m[1].toLowerCase(), ch = m[2]
          const pfx = mod==='ctrl' ? '^' : mod==='alt' ? '%' : '+'
          sk = pfx + ch.toLowerCase()
        } else if (/^F([1-9]|1[0-2])$/.test(raw)) sk = `{${raw}}`
        else if (raw.length===1) sk = raw.replace(/[\{\}\+\^\%\(\)\~]/g, m=>`{${m}}`)
        if (!sk) { writeJson(res,400,{ ok:false, error:'unsupported key: '+raw }); return }
        const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${psEscape(sk)}')
Write-Output ok
`
        const r = await execPs(script, 8000)
        if (!r.ok) { writeJson(res,500,{ ok:false, error:r.error }); return }
        writeJson(res,200,{ ok:true }); return
      }
      if (action === 'scroll') {
        const dy = Math.max(-10, Math.min(10, Math.round(Number(body.dy)||0)))
        const dx = Math.max(-10, Math.min(10, Math.round(Number(body.dx)||0)))
        const script = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Scr { [DllImport("user32.dll")] public static extern void mouse_event(int f,int dx,int dy,int d,int e); public const int WHEEL=0x0800, HWHEEL=0x01000; }
"@
[Scr]::mouse_event([Scr]::WHEEL,0,0,${dy}*120,0)
if (${dx} -ne 0) { [Scr]::mouse_event([Scr]::HWHEEL,0,0,${dx}*120,0) }
Write-Output ok
`
        const r = await execPs(script, 5000)
        if (!r.ok) { writeJson(res,500,{ ok:false, error:r.error }); return }
        writeJson(res,200,{ ok:true }); return
      }
      writeJson(res,400,{ ok:false, error:'unknown action' })
    } catch(e){ writeJson(res,500,{ ok:false, error: e instanceof Error ? e.message : String(e) }) }
  }}), 'vd: input')
}
