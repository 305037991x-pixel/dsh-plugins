// @ts-check
/**
 * dsh-open-file — host half.
 *
 * 对话产物路径一体化处理（整合 dsh-file-mentions / dsh-pathlink /
 * dsh-markdown-preview 思路 + 官方 host.openPath 的 Windows 实现）：
 *
 *   1. POST /api/open-file/check   —— 路径存在性验证（跨会话 cwd 兜底解析）
 *   2. POST /api/open-file/preview —— 话内预览内容（文本/markdown/图片/xlsx 表格）
 *   3. POST /api/open-file/open    —— 系统默认应用打开（Windows: Invoke-Item）
 *   4. POST /api/open-file/reveal  —— 文件管理器中定位所在文件夹（explorer /select）
 *
 * 安全：所有外部命令经 execFile 传参（不经 shell）；路径解析后必须 existsSync；
 * 相对路径按「指定会话 cwd → 全部会话 cwd → 进程 cwd」顺序兜底。
 * 纯 Node 实现 + 两个轻依赖（markdown-it / xlsx，均为纯 JS）。
 */
import { existsSync, statSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, isAbsolute, extname, basename, dirname } from 'node:path'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const MarkdownIt = require('markdown-it')
const XLSX = require('xlsx')

/** Stable Cordis plugin name. */
export const name = 'dsh-open-file'

/** Required services: the web server (routes). sessions 为可选服务。 */
export const inject = ['webServer']

// ── 预览限制 ──────────────────────────────────────────────────────
const MAX_TEXT = 256 * 1024 // 文本预览截断
const MAX_IMAGE = 10 * 1024 * 1024 // 图片上限
const MAX_XLSX = 8 * 1024 * 1024 // xlsx 上限
const MAX_SHEETS = 16
const MAX_CELLS = 200000

const TEXT_EXTS = new Set([
	'md', 'markdown', 'txt', 'log', 'json', 'yaml', 'yml', 'js', 'ts', 'jsx', 'tsx',
	'py', 'c', 'cpp', 'h', 'hpp', 'java', 'go', 'rs', 'rb', 'php', 'sh', 'ps1',
	'bat', 'cmd', 'csv', 'tsv', 'ini', 'toml', 'xml', 'html', 'htm', 'css', 'scss',
	'sql', 'vue', 'svelte', 'env', 'gitignore', 'conf', 'cfg'
])
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'])
const MIME_BY_EXT = {
	png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
	webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif'
}

/**
 * 解析到第一个真实存在的绝对路径；找不到返回 null。
 * 相对路径：指定 cwd → 全部会话 cwd → 进程 cwd。绝对 / ~ 路径不依赖会话。
 */
function resolveFirst(p, cwds, processCwd) {
	const abs = resolvePath(p, null)
	if (abs !== null && existsSync(abs)) return abs
	const tried = new Set()
	for (const cwd of cwds) {
		if (!cwd || tried.has(cwd)) continue
		tried.add(cwd)
		const hit = resolve(cwd, p)
		if (existsSync(hit)) return hit
	}
	if (processCwd) {
		const hit = resolve(processCwd, p)
		if (existsSync(hit)) return hit
	}
	return null
}

/** 绝对路径原样；~/ 展开；相对路径需 cwd（传 null 表示暂不解析）。 */
function resolvePath(p, cwd) {
	if (isAbsolute(p)) return p
	if (p.startsWith('~/')) return homedir() + p.slice(1)
	if (typeof cwd === 'string' && cwd !== '') return resolve(cwd, p)
	return null
}

/** 收集全部会话 cwd（可选服务，缺失时为空）。 */
function listCwds(ctx) {
	const out = []
	const sessions = ctx.get('sessions')
	if (sessions && typeof sessions.list === 'function') {
		for (const s of sessions.list()) {
			const cwd = s && s.header && typeof s.header.cwd === 'string' ? s.header.cwd : null
			if (cwd) out.push(cwd)
		}
	}
	return out
}

/** 读取请求体（JSON，最大 256KB）。 */
function readBody(req) {
	return new Promise((resolveBody, reject) => {
		const chunks = []
		let size = 0
		req.on('data', (chunk) => {
			size += chunk.length
			if (size > 256 * 1024) {
				reject(new Error('request body too large'))
				req.destroy()
				return
			}
			chunks.push(chunk)
		})
		req.on('end', () => {
			try {
				const text = Buffer.concat(chunks).toString('utf8')
				resolveBody(text === '' ? {} : JSON.parse(text))
			} catch (error) {
				reject(error)
			}
		})
		req.on('error', reject)
	})
}

function writeJson(res, status, body) {
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store'
	})
	res.end(JSON.stringify(body))
}

/** 单引号转义，用于 PowerShell -LiteralPath 参数。 */
function powershellLiteral(path) {
	return "'" + String(path).replace(/'/g, "''") + "'"
}

/** 系统默认应用打开（Windows: Invoke-Item；mac: open；Linux: xdg-open）。 */
function systemOpen(abs) {
	const platform = process.platform
	return new Promise((done) => {
		if (platform === 'win32') {
			execFile('powershell.exe', ['-NoProfile', '-Command', `Invoke-Item -LiteralPath ${powershellLiteral(abs)}`], { timeout: 15000, windowsHide: true }, (err) => done(!err))
			return
		}
		const command = platform === 'darwin' ? 'open' : 'xdg-open'
		execFile(command, [abs], { timeout: 15000 }, (err) => done(!err))
	})
}

/** 文件管理器中定位（Windows: explorer /select；mac: open -R；Linux: xdg-open 父目录）。 */
function systemReveal(abs) {
	const platform = process.platform
	return new Promise((done) => {
		if (platform === 'win32') {
			// explorer.exe 要求 /select, 与路径在同一参数内（分开传参会被忽略）；
			// 不能加 windowsHide：explorer 继承 CREATE_NO_WINDOW 后新窗口不显示
			execFile('explorer.exe', ['/select,' + abs], { timeout: 15000 }, () => done(true))
			return
		}
		if (platform === 'darwin') {
			execFile('open', ['-R', abs], { timeout: 15000 }, (err) => done(!err))
			return
		}
		execFile('xdg-open', [dirname(abs)], { timeout: 15000 }, (err) => done(!err))
	})
}

/** xlsx → 每 sheet 的 HTML 表格。限制 sheet 数与单元格总量。 */
function xlsxToHtml(buf) {
	const wb = XLSX.read(buf, { type: 'buffer' })
	const sheets = wb.SheetNames.slice(0, MAX_SHEETS)
	const htmlParts = []
	let totalCells = 0
	for (const name of sheets) {
		const ws = wb.Sheets[name]
		if (!ws) continue
		const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
		const cells = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1)
		totalCells += cells
		if (totalCells > MAX_CELLS) break
		const html = XLSX.utils.sheet_to_html(ws, { id: 'dsh-open-file-sheet-' + name.replace(/\W+/g, '_'), header: '', footer: '' })
		htmlParts.push({ name, html })
	}
	return { sheets: htmlParts, total: sheets.length, truncated: htmlParts.length < wb.SheetNames.length }
}

/**
 * 插件主体：注册 4 个路由。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
	const webServer = ctx.webServer
	if (webServer === undefined) return

	/** 解析路径（跨会话 cwd 兜底），返回绝对路径或 null。 */
	const resolveFor = (p) => resolveFirst(p, listCwds(ctx), process.cwd())

	ctx.effect(() => webServer.register({
		kind: 'exact',
		path: '/api/open-file/check',
		handler: async (req, res) => {
			try {
				const body = await readBody(req)
				const paths = Array.isArray(body && body.paths)
					? body.paths.filter((p) => typeof p === 'string' && p !== '')
					: []
				const valid = []
				for (const p of paths) {
					try {
						if (resolveFor(p) !== null) valid.push(p)
					} catch (error) { /* 单条失败不影响其他 */ }
				}
				writeJson(res, 200, { valid })
			} catch (error) {
				writeJson(res, 500, { valid: [], error: error instanceof Error ? error.message : String(error) })
			}
		}
	}), 'dsh-open-file: check route')

	ctx.effect(() => webServer.register({
		kind: 'exact',
		path: '/api/open-file/preview',
		handler: async (req, res) => {
			try {
				const body = await readBody(req)
				const path = body && typeof body.path === 'string' && body.path !== '' ? body.path : null
				if (path === null) { writeJson(res, 400, { ok: false, error: 'missing path' }); return }
				const abs = resolveFor(path)
				if (abs === null) { writeJson(res, 404, { ok: false, error: '路径不存在: ' + path }); return }
				const stat = statSync(abs)
				if (stat.isDirectory()) { writeJson(res, 200, { ok: true, kind: 'dir', name: basename(abs), path: abs }); return }
				const ext = extname(abs).slice(1).toLowerCase()
				const name = basename(abs)

				if (IMAGE_EXTS.has(ext)) {
					if (stat.size > MAX_IMAGE) { writeJson(res, 200, { ok: true, kind: 'unsupported', name, ext, reason: 'too-large' }); return }
					const data = await fs.readFile(abs)
					writeJson(res, 200, { ok: true, kind: 'image', name, mime: MIME_BY_EXT[ext] || 'application/octet-stream', data: data.toString('base64') })
					return
				}
				if (ext === 'xlsx' || ext === 'xlsm') {
					if (stat.size > MAX_XLSX) { writeJson(res, 200, { ok: true, kind: 'unsupported', name, ext, reason: 'too-large' }); return }
					const buf = await fs.readFile(abs)
					try {
						const table = xlsxToHtml(buf)
						writeJson(res, 200, { ok: true, kind: 'xlsx', name, ...table })
					} catch (error) {
						writeJson(res, 200, { ok: true, kind: 'unsupported', name, ext, reason: 'parse-error' })
					}
					return
				}
				if (TEXT_EXTS.has(ext) || stat.size <= MAX_TEXT) {
					const raw = await fs.readFile(abs, 'utf8')
					const truncated = raw.length > MAX_TEXT
					const content = truncated ? raw.slice(0, MAX_TEXT) : raw
					if (ext === 'md' || ext === 'markdown') {
						const md = new MarkdownIt({ html: false, linkify: true })
						writeJson(res, 200, { ok: true, kind: 'md', name, html: md.render(content), truncated })
					} else {
						writeJson(res, 200, { ok: true, kind: 'text', name, ext, content, truncated })
					}
					return
				}
				writeJson(res, 200, { ok: true, kind: 'unsupported', name, ext })
			} catch (error) {
				writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
			}
		}
	}), 'dsh-open-file: preview route')

	ctx.effect(() => webServer.register({
		kind: 'exact',
		path: '/api/open-file/open',
		handler: async (req, res) => {
			try {
				const body = await readBody(req)
				const path = body && typeof body.path === 'string' && body.path !== '' ? body.path : null
				if (path === null) { writeJson(res, 400, { ok: false }); return }
				const abs = resolveFor(path)
				if (abs === null) { writeJson(res, 404, { ok: false, error: '路径不存在: ' + path }); return }
				const ok = await systemOpen(abs)
				writeJson(res, ok ? 200 : 500, { ok })
			} catch (error) {
				writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
			}
		}
	}), 'dsh-open-file: open route')

	ctx.effect(() => webServer.register({
		kind: 'exact',
		path: '/api/open-file/reveal',
		handler: async (req, res) => {
			try {
				const body = await readBody(req)
				const path = body && typeof body.path === 'string' && body.path !== '' ? body.path : null
				if (path === null) { writeJson(res, 400, { ok: false }); return }
				const abs = resolveFor(path)
				if (abs === null) { writeJson(res, 404, { ok: false, error: '路径不存在: ' + path }); return }
				const ok = await systemReveal(abs)
				writeJson(res, ok ? 200 : 500, { ok, debug: { input: path, resolved: abs, platform: process.platform } })
			} catch (error) {
				writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
			}
		}
	}), 'dsh-open-file: reveal route')
}
