// 챗봇 대화 화면

import { CHAT_MODEL, MIN_TURNS, MAX_TURNS, GREETING, buildInstructions } from './chatConfig.js'
import { createChatReply } from './openai.js'

export function initChatbot({ apiKey, onEnd }) {
  const log = document.getElementById('chat-log')
  const form = document.getElementById('chat-form')
  const input = document.getElementById('chat-input')
  const sendBtn = document.getElementById('chat-send')
  const endBtn = document.getElementById('chat-end')
  const counter = document.getElementById('turn-counter')
  const notice = document.getElementById('chat-notice')

  // 대화 기록 (API 전송용)과 각 메시지 시각 (Firestore 저장용)
  const messages = [{ role: 'assistant', content: GREETING }]
  const sentAt = [new Date()]
  let userTurns = 0
  let waiting = false
  let firstMessageAt = null

  function addBubble(role, text) {
    const bubble = document.createElement('div')
    bubble.className = `bubble bubble-${role}`
    bubble.textContent = text
    log.append(bubble)
    log.scrollTop = log.scrollHeight
    return bubble
  }

  function updateState() {
    const reachedMax = userTurns >= MAX_TURNS
    counter.textContent = `${userTurns} / ${MAX_TURNS}`
    input.disabled = waiting || reachedMax
    sendBtn.disabled = waiting || reachedMax
    endBtn.disabled = waiting || userTurns < MIN_TURNS

    if (reachedMax) {
      notice.textContent = '오늘 이야기는 여기까지! 대화 끝내기 버튼을 눌러 그림을 그려 보자.'
    } else if (userTurns >= MIN_TURNS) {
      notice.textContent = '원하면 언제든 대화를 마치고 그림을 그릴 수 있어요.'
    } else {
      notice.textContent = `${MIN_TURNS - userTurns}번 더 이야기하면 대화를 마칠 수 있어요.`
    }
  }

  async function send(text) {
    const now = new Date()
    if (!firstMessageAt) firstMessageAt = now
    messages.push({ role: 'user', content: text })
    sentAt.push(now)
    userTurns += 1
    addBubble('user', text)

    waiting = true
    updateState()
    const typing = addBubble('assistant', '생각하는 중…')
    typing.classList.add('is-typing')

    try {
      const reply = await createChatReply({
        apiKey,
        model: CHAT_MODEL,
        instructions: buildInstructions(userTurns),
        messages,
      })
      typing.remove()
      messages.push({ role: 'assistant', content: reply })
      sentAt.push(new Date())
      addBubble('assistant', reply)
    } catch (err) {
      // 실패한 메시지는 횟수에서 빼고 입력창에 되돌려 줌
      typing.remove()
      messages.pop()
      sentAt.pop()
      userTurns -= 1
      if (userTurns === 0) firstMessageAt = null
      log.lastElementChild?.remove()
      input.value = text
      addBubble('error', `⚠️ ${err.message}`)
    } finally {
      waiting = false
      updateState()
      if (!input.disabled) input.focus()
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (!text || waiting) return
    input.value = ''
    send(text)
  })

  // Enter로 보내기, Shift+Enter로 줄바꿈
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      form.requestSubmit()
    }
  })

  endBtn.addEventListener('click', () => {
    if (userTurns < MIN_TURNS) return
    input.disabled = true
    sendBtn.disabled = true
    endBtn.disabled = true
    onEnd({
      conversation: messages.map((m, i) => ({ ...m, sentAt: sentAt[i] })),
      turnCount: userTurns,
      startedAt: firstMessageAt,
      endedAt: new Date(),
    })
  })

  addBubble('assistant', GREETING)
  updateState()
  input.focus()
}
