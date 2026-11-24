// 학생 활동 페이지 진입점: 로그인 확인 → API Key 확인 → 챗봇 대화 → 그림 그리기 → 제출
import './styles.css'
import './student.css'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebaseConfig.js'
import { CHAT_MODEL } from './chatConfig.js'
import { verifyApiKey } from './openai.js'
import { initChatbot } from './chatbot.js'
import { initDrawing } from './drawing.js'
import { submitActivity } from './submission.js'

const keySection = document.getElementById('key-section')
const chatSection = document.getElementById('chat-section')
const drawSection = document.getElementById('draw-section')

const keyForm = document.getElementById('key-form')
const keyInput = document.getElementById('key-input')
const keySubmit = document.getElementById('key-submit')
const keyStatus = document.getElementById('key-status')

const submitBtn = document.getElementById('draw-submit')
const submitStatus = document.getElementById('submit-status')

// 제출 시 함께 보낼 데이터
const session = {
  user: null,
  chat: null, // { conversation, turnCount, startedAt, endedAt }
  drawing: null,
  drawingStartedAt: null,
  submitted: false,
}

// ----- 로그인 확인 및 사용자 표시 -----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 로그인하지 않았다면 메인 페이지로 이동
    location.replace('/')
    return
  }

  session.user = user
  document.getElementById('user-name').textContent = user.displayName || '이름 없음'
  document.getElementById('user-email').textContent = user.email || ''
  const photo = document.getElementById('user-photo')
  if (user.photoURL) {
    photo.src = user.photoURL
    photo.hidden = false
  }
  document.getElementById('user-info').hidden = false
  document.getElementById('auth-checking').hidden = true
  document.getElementById('student-main').hidden = false
})

function setProgress(step) {
  const order = ['key', 'chat', 'draw']
  const current = order.indexOf(step)
  document.querySelectorAll('.progress-step').forEach((el) => {
    const index = order.indexOf(el.dataset.step)
    el.classList.toggle('is-active', index === current)
    el.classList.toggle('is-done', index < current)
  })
}

// ----- 1단계: API Key 확인 -----
keyForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const apiKey = keyInput.value.trim()
  if (!apiKey) return

  keySubmit.disabled = true
  keyStatus.className = 'status-text'
  keyStatus.textContent = '확인하는 중…'

  try {
    await verifyApiKey(apiKey, CHAT_MODEL)
    keyInput.value = ''
    keySection.hidden = true
    startChat(apiKey)
  } catch (err) {
    keyStatus.classList.add('is-error')
    keyStatus.textContent = err.message || 'API Key를 확인하지 못했어요.'
  } finally {
    keySubmit.disabled = false
  }
})

// ----- 2단계: 챗봇 대화 -----
function startChat(apiKey) {
  chatSection.hidden = false
  setProgress('chat')
  initChatbot({
    apiKey,
    onEnd: (chat) => {
      session.chat = chat
      startDrawing(chat.endedAt)
    },
  })
}

// ----- 3단계: 그림 그리기 -----
function startDrawing(startedAt) {
  chatSection.hidden = true
  drawSection.hidden = false
  setProgress('draw')
  session.drawing = initDrawing()
  session.drawingStartedAt = startedAt
  drawSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ----- 제출 -----
submitBtn.addEventListener('click', async () => {
  if (!session.drawing || session.submitted) return
  if (session.drawing.isEmpty()) {
    submitStatus.className = 'status-text is-error'
    submitStatus.textContent = '아직 그림이 비어 있어요. 오늘의 마음을 그려 주세요!'
    return
  }

  submitBtn.disabled = true
  submitStatus.className = 'status-text'
  submitStatus.textContent = '제출하는 중…'

  try {
    const submittedAt = new Date()
    await submitActivity({
      user: session.user,
      chat: session.chat,
      drawingBlob: await session.drawing.toBlob(),
      drawingStartedAt: session.drawingStartedAt,
      submittedAt,
    })
    session.submitted = true
    submitBtn.textContent = '✅ 제출 완료'
    submitStatus.textContent = '제출했어요! 오늘도 정말 수고 많았어 🌷 (오늘 다시 제출하면 새 내용으로 바뀌어요)'
  } catch (err) {
    console.error(err)
    submitStatus.classList.add('is-error')
    submitStatus.textContent = `제출하지 못했어요. 다시 시도해 주세요. (${err.code || err.message})`
    submitBtn.disabled = false
  }
})
