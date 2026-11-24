// 그림 그리기 캔버스

// 기본 색상 팔레트 (HSL)
const PALETTE = [
  { name: '검정', h: 0, s: 0, l: 15 },
  { name: '회색', h: 0, s: 0, l: 55 },
  { name: '빨강', h: 2, s: 78, l: 55 },
  { name: '주황', h: 25, s: 90, l: 58 },
  { name: '노랑', h: 46, s: 95, l: 58 },
  { name: '초록', h: 120, s: 40, l: 48 },
  { name: '하늘', h: 198, s: 75, l: 60 },
  { name: '파랑', h: 222, s: 65, l: 50 },
  { name: '보라', h: 272, s: 50, l: 58 },
  { name: '분홍', h: 335, s: 75, l: 72 },
  { name: '갈색', h: 25, s: 45, l: 38 },
]

// 내부 해상도 (화면 크기와 상관없이 일정한 그림 크기 유지)
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 700
const MAX_HISTORY = 30
const BACKGROUND = '#ffffff'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export function initDrawing() {
  const canvas = document.getElementById('draw-canvas')
  const preview = document.getElementById('draw-preview')
  const ctx = canvas.getContext('2d')
  const pctx = preview.getContext('2d')

  const paletteEl = document.getElementById('palette')
  const colorPreview = document.getElementById('color-preview')
  const brightness = document.getElementById('brightness')
  const opacity = document.getElementById('opacity')
  const brushSize = document.getElementById('brush-size')
  const penBtn = document.getElementById('tool-pen')
  const eraserBtn = document.getElementById('tool-eraser')
  const undoBtn = document.getElementById('tool-undo')
  const clearBtn = document.getElementById('tool-clear')

  const state = {
    color: PALETTE[0],
    brightness: 0,
    opacity: 1,
    size: 8,
    tool: 'pen',
  }

  const history = []
  let points = null
  let isDirty = false

  for (const c of [canvas, preview]) {
    c.width = CANVAS_WIDTH
    c.height = CANVAS_HEIGHT
  }
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // ----- 색상 -----
  function currentColor() {
    if (state.tool === 'eraser') return BACKGROUND
    const { h, s, l } = state.color
    return `hsl(${h} ${s}% ${clamp(l + state.brightness, 0, 100)}%)`
  }

  function refreshColorPreview() {
    colorPreview.style.backgroundColor = currentColor()
    colorPreview.style.opacity = state.tool === 'eraser' ? 1 : state.opacity
  }

  PALETTE.forEach((color, i) => {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'swatch'
    swatch.style.backgroundColor = `hsl(${color.h} ${color.s}% ${color.l}%)`
    swatch.setAttribute('role', 'radio')
    swatch.setAttribute('aria-label', color.name)
    swatch.setAttribute('aria-checked', String(i === 0))
    swatch.title = color.name
    swatch.addEventListener('click', () => {
      state.color = color
      paletteEl.querySelectorAll('.swatch').forEach((el) => el.setAttribute('aria-checked', 'false'))
      swatch.setAttribute('aria-checked', 'true')
      setTool('pen')
    })
    paletteEl.append(swatch)
  })

  // ----- 슬라이더 -----
  function bindRange(input, outputId, apply, format = (v) => v) {
    const output = document.getElementById(outputId)
    const update = () => {
      const value = Number(input.value)
      apply(value)
      output.textContent = format(value)
      refreshColorPreview()
    }
    input.addEventListener('input', update)
    update()
  }

  bindRange(brightness, 'brightness-value', (v) => (state.brightness = v), (v) => (v > 0 ? `+${v}` : v))
  bindRange(opacity, 'opacity-value', (v) => (state.opacity = v / 100), (v) => `${v}%`)
  bindRange(brushSize, 'brush-size-value', (v) => (state.size = v))

  // ----- 도구 -----
  function setTool(tool) {
    state.tool = tool
    penBtn.classList.toggle('is-active', tool === 'pen')
    eraserBtn.classList.toggle('is-active', tool === 'eraser')
    penBtn.setAttribute('aria-pressed', String(tool === 'pen'))
    eraserBtn.setAttribute('aria-pressed', String(tool === 'eraser'))
    refreshColorPreview()
  }

  function saveHistory() {
    history.push({ image: ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT), dirty: isDirty })
    if (history.length > MAX_HISTORY) history.shift()
    undoBtn.disabled = false
  }

  penBtn.addEventListener('click', () => setTool('pen'))
  eraserBtn.addEventListener('click', () => setTool('eraser'))

  undoBtn.addEventListener('click', () => {
    const prev = history.pop()
    if (prev) {
      ctx.putImageData(prev.image, 0, 0)
      isDirty = prev.dirty
    }
    undoBtn.disabled = history.length === 0
  })

  clearBtn.addEventListener('click', () => {
    if (!isDirty) return
    if (!confirm('그림을 모두 지울까요?')) return
    saveHistory()
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    isDirty = false
  })

  undoBtn.disabled = true

  // ----- 그리기 -----
  // 한 획을 하나의 경로로 그려서 불투명도가 겹쳐 진해지지 않도록 함
  function strokePath(target, pts, alpha) {
    target.save()
    target.globalAlpha = alpha
    target.strokeStyle = currentColor()
    target.fillStyle = currentColor()
    target.lineWidth = state.size
    target.lineCap = 'round'
    target.lineJoin = 'round'

    if (pts.length === 1) {
      target.beginPath()
      target.arc(pts[0].x, pts[0].y, state.size / 2, 0, Math.PI * 2)
      target.fill()
    } else {
      target.beginPath()
      target.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2
        const midY = (pts[i].y + pts[i + 1].y) / 2
        target.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY)
      }
      const last = pts[pts.length - 1]
      target.lineTo(last.x, last.y)
      target.stroke()
    }
    target.restore()
  }

  function strokeAlpha() {
    return state.tool === 'eraser' ? 1 : state.opacity
  }

  function toCanvasPoint(e) {
    const rect = preview.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    }
  }

  function drawPreview() {
    pctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    strokePath(pctx, points, strokeAlpha())
  }

  preview.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    preview.setPointerCapture(e.pointerId)
    points = [toCanvasPoint(e)]
    drawPreview()
  })

  preview.addEventListener('pointermove', (e) => {
    if (!points) return
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]
    for (const ev of events) points.push(toCanvasPoint(ev))
    drawPreview()
  })

  function finishStroke() {
    if (!points) return
    saveHistory()
    strokePath(ctx, points, strokeAlpha())
    pctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    points = null
    isDirty = true
  }

  preview.addEventListener('pointerup', finishStroke)
  preview.addEventListener('pointercancel', finishStroke)

  refreshColorPreview()

  return {
    // 아무것도 그리지 않았는지 확인
    isEmpty: () => !isDirty,
    // 제출용 이미지 (PNG Blob)
    toBlob: () =>
      new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('그림을 이미지로 바꾸지 못했어요.'))), 'image/png'),
      ),
  }
}
