// dsh-virtual-desktop — browser half (MVP 本机版)
// 在右侧边栏注入一个「虚拟桌面」面板：截图预览 + 点击/输入/按键 + 刷新
// 点击截图采用归一化坐标 (0..1) 发给 host，host 再映射到 VirtualScreen 像素
window.__ModuleLoader__.load({
  id: 'dsh-virtual-desktop',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const react = require('react')
    const jsx = require('react/jsx-runtime')

    const CSS = `
.vd-root{font-size:13px;line-height:1.5}
.vd-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.vd-toolbar button,.vd-row button{font:inherit;font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-default,rgba(0,0,0,.12));background:var(--dsw-alias-bg-default,#fff);cursor:pointer}
.vd-toolbar button.primary,.vd-row button.primary{background:#3b82f6;color:#fff;border-color:transparent}
.vd-toolbar button:disabled{opacity:.5;cursor:not-allowed}
.vd-stage{position:relative;border:1px solid var(--dsw-alias-border-default,rgba(0,0,0,.12));border-radius:8px;overflow:hidden;background:#111;min-height:180px;display:flex;align-items:center;justify-content:center}
.vd-stage img{display:block;max-width:100%;height:auto;cursor:crosshair;user-select:none}
.vd-hint{color:var(--dsw-alias-label-tertiary,#888);font-size:12px;margin-top:6px}
.vd-row{display:flex;gap:6px;margin-top:8px}
.vd-row input{flex:1;min-width:0;padding:6px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-default,rgba(0,0,0,.12));font:inherit}
.vd-badge{display:inline-block;font-size:11px;padding:2px 6px;border-radius:999px;background:rgba(0,0,0,.06);margin-left:6px}
.vd-callout{margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.25);font-size:12px}
`

    function ensureCss() {
      if (document.querySelector('style[data-vd]')) return
      const s = document.createElement('style'); s.dataset.vd='1'; s.textContent = CSS; document.head.appendChild(s)
    }

    async function api(path, body) {
      const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: body?JSON.stringify(body):undefined, cache:'no-store' })
      const j = await r.json().catch(()=>({}))
      if (!r.ok) throw new Error(j.error||('HTTP '+r.status))
      return j
    }

    function VirtualDesktopPanel() {
      ensureCss()
      const [img, setImg] = React.useState(null) // { data, width, height }
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState('')
      const [text, setText] = React.useState('')
      const imgRef = React.useRef(null)

      const capture = React.useCallback(async () => {
        setBusy(true); setMsg('截图中…')
        try {
          const j = await api('/api/virtual-desktop/capture', { quality: 68 })
          if (!j.ok) throw new Error(j.error||'capture failed')
          setImg({ data: j.data, width: j.width, height: j.height })
          setMsg(`已更新 ${j.width}×${j.height}`)
        } catch(e){ setMsg('截图失败: '+(e.message||String(e))) }
        finally{ setBusy(false) }
      }, [])

      React.useEffect(()=>{ capture() }, [capture])

      const onImgClick = async (e) => {
        if (!imgRef.current) return
        const rect = imgRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        setMsg(`点击 ${(x*100).toFixed(1)}%, ${(y*100).toFixed(1)}% …`)
        try {
          await api('/api/virtual-desktop/input', { action:'click', x: Math.max(0,Math.min(1,x)), y: Math.max(0,Math.min(1,y)) })
          setMsg('已点击，1s 后自动刷新')
          setTimeout(capture, 900)
        } catch(err){ setMsg('点击失败: '+(err.message||String(err))) }
      }

      const doType = async () => {
        if (!text) return
        try { await api('/api/virtual-desktop/input', { action:'type', text }); setMsg('已输入'); setTimeout(capture, 600) }
        catch(err){ setMsg('输入失败: '+(err.message||String(err))) }
      }
      const doKey = async (k) => {
        try { await api('/api/virtual-desktop/input', { action:'key', key:k }); setMsg('已按键 '+k); setTimeout(capture, 600) }
        catch(err){ setMsg('按键失败: '+(err.message||String(err))) }
      }

      return jsx.jsxs('div', { className:'vd-root', children: [
        jsx.jsxs('div', { className:'vd-toolbar', children: [
          jsx.jsx('button', { className:'primary', disabled:busy, onClick:capture, children: busy? '截图中…' : '刷新截图' }),
          jsx.jsx('button', { disabled:busy, onClick:()=>doKey('Enter'), children:'回车' }),
          jsx.jsx('button', { disabled:busy, onClick:()=>doKey('Escape'), children:'Esc' }),
          jsx.jsx('button', { disabled:busy, onClick:()=>doKey('Alt+Tab'), children:'Alt+Tab' }),
        ]}),
        jsx.jsxs('div', { className:'vd-stage', onClick: onImgClick, children: [
          img ? jsx.jsx('img', { ref:imgRef, src:'data:image/jpeg;base64,'+img.data, alt:'desktop' })
              : jsx.jsx('div', { style:{color:'#aaa',padding:'24px'}, children: busy? '正在获取屏幕…' : '暂无截图，点刷新重试' })
        ]}),
        jsx.jsx('div', { className:'vd-hint', children: '点截图任意位置 = 在本机该位置点击鼠标（归一化坐标，适配多显示器）。操作后自动刷新。' }),
        jsx.jsxs('div', { className:'vd-row', children: [
          jsx.jsx('input', { value:text, onChange:e=>setText(e.target.value), placeholder:'输入要键入的文字（可含中文）', onKeyDown:e=>{ if(e.key==='Enter') doType() } }),
          jsx.jsx('button', { className:'primary', onClick:doType, children:'键入' }),
        ]}),
        jsx.jsxs('div', { className:'vd-row', children: [
          jsx.jsx('button', { onClick:()=>doKey('Win'), children:'Win' }),
          jsx.jsx('button', { onClick:()=>doKey('Ctrl+C'), children:'Ctrl+C' }),
          jsx.jsx('button', { onClick:()=>doKey('Ctrl+V'), children:'Ctrl+V' }),
          jsx.jsx('button', { onClick:()=>doKey('Ctrl+A'), children:'Ctrl+A' }),
        ]}),
        msg ? jsx.jsx('div', { className:'vd-hint', children: msg }) : null,
        jsx.jsx('div', { className:'vd-callout', children: 'MVP为本机直控版：会移动你当前桌面的鼠标。下一步升级为“隔离虚拟桌面（不抢屏）”：用虚拟显示器 + 独立 RDP 会话实现后台运行。' }),
      ]})
    }

    const NS = 'vd'
    const zh = { 'dock.label': '虚拟桌面', 'dock.hint': '看本机屏幕 · 点鼠标 · 键入文字 (MVP本机版，会移动当前鼠标)' }
    const en = { 'dock.label': 'Virtual Desktop', 'dock.hint': 'View desktop · click · type (MVP: controls your current desktop)' }

    const uiStore = { open:false, listeners:new Set(), subscribe(l){ this.listeners.add(l); return ()=>this.listeners.delete(l) }, getSnapshot(){ return this.open }, set(v){ if(this.open!==v){ this.open=v; for(const f of [...this.listeners]) try{ f() }catch(e){} } }, toggle(){ this.set(!this.open) } }
    function useOpen(){ return react.useSyncExternalStore(uiStore.subscribe.bind(uiStore), uiStore.getSnapshot.bind(uiStore)) }

    function DockAction(props){
      const { t } = props
      const open = useOpen()
      const label = t('dock.label')
      return jsx.jsx('button', { type:'button', 'aria-label': label, 'aria-expanded': open, onClick: ()=> uiStore.toggle(), title: t('dock.hint'), style:{ width:36, height:36, borderRadius:8, border:'none', background: open ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent', color: open ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-label-tertiary)', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center' }, children: jsx.jsx('span', { style:{ fontSize:16 }, children: '🖥️' }) })
    }

    function OverlayPanel(){
      const open = useOpen()
      if (!open) return null
      return jsx.jsx('div', { style:{ position:'absolute', left:76, bottom:12, width:560, maxWidth:'calc(100vw - 88px)', maxHeight:'min(72vh, 760px)', background:'var(--dsw-alias-bg-base)', border:'1px solid var(--dsw-alias-border-l1)', borderRadius:14, boxShadow:'var(--dsw-shadow-lv2)', display:'flex', flexDirection:'column', overflow:'hidden', pointerEvents:'auto' }, children:
        jsx.jsxs('div', { style:{ display:'flex', flexDirection:'column', minHeight:0, flex:1 }, children:[
          jsx.jsxs('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid var(--dsw-alias-border-l1)', flex:'none' }, children:[
            jsx.jsx('div', { style:{ fontWeight:600, fontSize:13 }, children:'虚拟桌面 · 本机版' }),
            jsx.jsx('button', { onClick:()=>uiStore.set(false), style:{ border:'none', background:'transparent', cursor:'pointer', padding:'4px 8px' }, children:'关闭' })
          ]}),
          jsx.jsx('div', { style:{ overflow:'auto', padding:12, flex:1, minHeight:0 }, children: jsx.jsx(VirtualDesktopPanel, {}) })
        ]})
      })
    }

    // 设置页内虚拟桌面区（主入口）
    function VirtualDesktopSettingsSection(props){
      return jsx.jsx(VirtualDesktopPanel, {})
    }

    const name = 'dsh-virtual-desktop'
    const inject = ['slots','locale']
    function apply(ctx){
      ctx.effect(()=> ctx.locale.register(NS, { zh, en }), 'vd: locale')
      // 主入口：设置页「虚拟桌面」区
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name:'settings.section', id:'dsh-virtual-desktop', order: 9,
        label: () => ctx.locale.bind(NS)('dock.label'),
        locale: NS
      }, VirtualDesktopSettingsSection))
      // 兼容：保留侧边浮层（点击没反应常因 overlay 被其他 overlay 盖住，设置页入口不受影响）
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name:'sidebar.footer.action', id:'dsh-virtual-desktop', order: 5, locale: NS }, DockAction))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name:'shell.overlay', id:'dsh-virtual-desktop', order: 40, locale: NS }, OverlayPanel))
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
