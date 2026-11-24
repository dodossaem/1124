// OpenAI API 호출 (브라우저에서 직접 호출)

const API_BASE = 'https://api.openai.com/v1'

async function readError(res) {
  try {
    const data = await res.json()
    return data?.error?.message || `요청 실패 (${res.status})`
  } catch {
    return `요청 실패 (${res.status})`
  }
}

// API Key가 유효하고 해당 모델을 쓸 수 있는지 확인
export async function verifyApiKey(apiKey, model) {
  const res = await fetch(`${API_BASE}/models/${model}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.ok) return
  if (res.status === 401) throw new Error('API Key가 올바르지 않아요. 다시 확인해 주세요.')
  if (res.status === 404) throw new Error(`이 API Key로는 ${model} 모델을 사용할 수 없어요.`)
  throw new Error(await readError(res))
}

// 대화 기록을 보내고 챗봇의 답변 텍스트를 받음 (Responses API)
// messages: [{ role: 'user' | 'assistant', content: string }]
export async function createChatReply({ apiKey, model, instructions, messages }) {
  const res = await fetch(`${API_BASE}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input: messages,
      reasoning: { effort: 'low' },
      store: false,
    }),
  })
  if (!res.ok) throw new Error(await readError(res))

  const data = await res.json()
  const text = (data.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
    .trim()

  if (!text) throw new Error('답변을 받지 못했어요. 다시 보내 주세요.')
  return text
}
