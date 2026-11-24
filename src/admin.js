// 교사 모니터링 페이지 진입점: 관리자 확인 → 날짜 필터 → 제출 목록 → 대화·그림 보기
import './styles.css'
import './student.css' // 말풍선·버튼 등 공통 컴포넌트 스타일 재사용
import './admin.css'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebaseConfig.js'
import { isAdmin } from './adminConfig.js'
import { fetchSubmissions, deleteSubmission, getDrawingUrl } from './adminData.js'

const dateList = document.getElementById('date-list')
const submissionList = document.getElementById('submission-list')
const submissionCount = document.getElementById('submission-count')
const sidebarStatus = document.getElementById('sidebar-status')
const chatView = document.getElementById('chat-view')
const drawingView = document.getElementById('drawing-view')
const detailMeta = document.getElementById('detail-meta')

const state = {
  submissions: [],
  checkedDates: new Set(),
  selectedId: null,
}

// ----- 날짜·시간 형식 -----
const pad = (n) => String(n).padStart(2, '0')
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeText = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function dateLabel(key) {
  const [y, m, d] = key.split('-').map(Number)
  const day = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

function durationText(sec) {
  if (typeof sec !== 'number') return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

function setStatus(text, isError = false) {
  sidebarStatus.textContent = text
  sidebarStatus.classList.toggle('is-error', isError)
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

// ----- 날짜 목록 -----
function renderDates() {
  const counts = new Map()
  for (const s of state.submissions) {
    const key = dateKey(s.submittedAt)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  // 데이터가 사라진 날짜는 선택에서 제외
  for (const key of state.checkedDates) {
    if (!counts.has(key)) state.checkedDates.delete(key)
  }

  dateList.replaceChildren()
  if (counts.size === 0) {
    dateList.append(el('p', 'empty-text', '아직 제출된 기록이 없어요.'))
    return
  }

  for (const [key, count] of counts) {
    const label = el('label', 'date-item')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = key
    checkbox.checked = state.checkedDates.has(key)
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.checkedDates.add(key)
      else state.checkedDates.delete(key)
      renderSubmissions()
    })
    label.append(checkbox, el('span', 'date-text', dateLabel(key)), el('span', 'count-badge', String(count)))
    dateList.append(label)
  }
}

// ----- 제출 목록 -----
function renderSubmissions() {
  const visible = state.submissions.filter((s) => state.checkedDates.has(dateKey(s.submittedAt)))
  submissionCount.textContent = String(visible.length)
  submissionList.replaceChildren()

  if (state.checkedDates.size === 0) {
    submissionList.append(el('li', 'empty-text', '날짜를 선택하면 제출 기록이 보여요.'))
    return
  }

  for (const s of visible) {
    const item = el('li', 'submission-item')
    item.classList.toggle('is-selected', s.id === state.selectedId)

    const openBtn = el('button', 'submission-open')
    openBtn.type = 'button'
    openBtn.append(
      el('span', 'submission-name', s.name || s.email || '이름 없음'),
      el('span', 'submission-time', `(${dateKey(s.submittedAt)}, ${timeText(s.submittedAt)})`),
    )
    openBtn.addEventListener('click', () => selectSubmission(s.id))

    const deleteBtn = el('button', 'delete-btn', '삭제')
    deleteBtn.type = 'button'
    deleteBtn.setAttribute('aria-label', `${s.name || '이름 없음'} 기록 삭제`)
    deleteBtn.addEventListener('click', () => removeSubmission(s, deleteBtn))

    item.append(openBtn, deleteBtn)
    submissionList.append(item)
  }
}

// ----- 상세 보기 -----
function clearDetail() {
  state.selectedId = null
  detailMeta.hidden = true
  chatView.replaceChildren(el('p', 'empty-text', '왼쪽에서 날짜를 고른 뒤 제출 기록을 눌러 주세요.'))
  drawingView.replaceChildren(el('p', 'empty-text', '선택한 기록의 그림이 여기에 보여요.'))
}

function selectSubmission(id) {
  const s = state.submissions.find((item) => item.id === id)
  if (!s) return
  state.selectedId = id
  renderSubmissions()

  // 요약 정보
  detailMeta.replaceChildren(
    el('strong', 'detail-name', `${s.name || '이름 없음'} (${dateKey(s.submittedAt)}, ${timeText(s.submittedAt)})`),
    el('span', 'muted-small', s.email || ''),
    el(
      'span',
      'detail-stats',
      `대화 ${s.turnCount ?? '-'}회 · 대화 시간 ${durationText(s.chatDurationSec)} · 그림 시간 ${durationText(s.drawingDurationSec)}`,
    ),
  )
  detailMeta.hidden = false

  // 대화 내용
  chatView.replaceChildren()
  if (!s.conversation.length) {
    chatView.append(el('p', 'empty-text', '대화 기록이 없어요.'))
  }
  for (const m of s.conversation) {
    const bubble = el('div', `bubble bubble-${m.role === 'user' ? 'user' : 'assistant'}`, m.content)
    if (m.sentAt) bubble.title = timeText(m.sentAt)
    chatView.append(bubble)
  }
  chatView.scrollTop = 0

  // 그림
  showDrawing(s)
}

async function showDrawing(s) {
  if (!s.imagePath) {
    drawingView.replaceChildren(el('p', 'empty-text', '그림이 없어요.'))
    return
  }
  drawingView.replaceChildren(el('p', 'empty-text', '그림을 불러오는 중…'))

  const failed = () => {
    if (state.selectedId === s.id) {
      drawingView.replaceChildren(el('p', 'empty-text', '그림을 불러오지 못했어요.'))
    }
  }

  let url
  try {
    url = await getDrawingUrl(s.imagePath)
  } catch (err) {
    console.error(err)
    failed()
    return
  }
  // 불러오는 사이 다른 기록을 골랐다면 무시
  if (state.selectedId !== s.id) return

  const img = el('img', 'drawing-image')
  img.src = url
  img.alt = `${s.name || '학생'}의 그림`
  img.addEventListener('error', failed)
  const link = el('a', 'link-btn', '원본 크게 보기 ↗')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener'
  drawingView.replaceChildren(img, link)
}

// ----- 삭제 -----
async function removeSubmission(s, button) {
  const label = `${s.name || '이름 없음'} (${dateKey(s.submittedAt)}, ${timeText(s.submittedAt)})`
  if (!confirm(`${label} 기록을 삭제할까요?\n대화 내용과 그림이 모두 지워지며 되돌릴 수 없어요.`)) return

  button.disabled = true
  setStatus('삭제하는 중…')
  try {
    await deleteSubmission(s)
    state.submissions = state.submissions.filter((item) => item.id !== s.id)
    if (state.selectedId === s.id) clearDetail()
    renderDates()
    renderSubmissions()
    setStatus('삭제했어요.')
  } catch (err) {
    console.error(err)
    button.disabled = false
    setStatus(`삭제하지 못했어요. (${err.code || err.message})`, true)
  }
}

// ----- 불러오기 -----
async function loadData() {
  setStatus('불러오는 중…')
  try {
    state.submissions = await fetchSubmissions()
    if (state.selectedId && !state.submissions.some((s) => s.id === state.selectedId)) clearDetail()
    renderDates()
    renderSubmissions()
    setStatus(`전체 ${state.submissions.length}개의 기록`)
  } catch (err) {
    console.error(err)
    setStatus(`불러오지 못했어요. (${err.code || err.message})`, true)
  }
}

document.getElementById('refresh-btn').addEventListener('click', loadData)

document.getElementById('select-all-dates').addEventListener('click', () => {
  for (const s of state.submissions) state.checkedDates.add(dateKey(s.submittedAt))
  renderDates()
  renderSubmissions()
})

document.getElementById('clear-dates').addEventListener('click', () => {
  state.checkedDates.clear()
  renderDates()
  renderSubmissions()
})

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth))

// ----- 관리자 확인 -----
onAuthStateChanged(auth, (user) => {
  // 로그인하지 않았거나 관리자가 아니면 메인 페이지로 이동
  if (!isAdmin(user)) {
    location.replace('/')
    return
  }

  document.getElementById('admin-name').textContent = user.displayName || '관리자'
  document.getElementById('admin-email').textContent = user.email || ''
  const photo = document.getElementById('admin-photo')
  if (user.photoURL) {
    photo.src = user.photoURL
    photo.hidden = false
  }

  document.getElementById('auth-checking').hidden = true
  document.getElementById('admin-main').hidden = false
  renderSubmissions()
  loadData()
})
