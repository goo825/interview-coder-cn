import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { streamText, type ModelMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { settings, AppSettings } from './settings'

export const PROMPT_SYSTEM = readFileSync(join(import.meta.dirname, 'prompts.md'), 'utf-8').trim()

function getModel(_settings: AppSettings) {
  const fallbackModel = settings.apiBaseURL.includes('siliconflow')
    ? 'Qwen/Qwen3-VL-32B-Instruct'
    : 'gpt-5-mini'
  return _settings.model || fallbackModel
}

// Inject system prompt into the first user message to avoid
// @ai-sdk/openai converting system -> developer for non-GPT models
function mergeSystemIntoMessages(
  systemPrompt: string,
  messages: ModelMessage[]
): ModelMessage[] {
  if (messages.length === 0) return messages

  const first = messages[0]
  if (first.role !== 'user') return messages

  const content = first.content
  if (typeof content === 'string') {
    return [
      { ...first, content: `${systemPrompt}\n\n---\n\n${content}` },
      ...messages.slice(1)
    ]
  }
  if (Array.isArray(content)) {
    return [
      {
        ...first,
        content: [{ type: 'text', text: `${systemPrompt}\n\n---\n\n` }, ...content]
      },
      ...messages.slice(1)
    ]
  }
  return messages
}

export function getSolutionStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const systemPrompt =
    settings.customPrompt ||
    PROMPT_SYSTEM + `\n使用编程语言：${settings.codeLanguage} 解答。`

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    messages: mergeSystemIntoMessages(systemPrompt, messages),
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getFollowUpStream(
  messages: ModelMessage[],
  userQuestion: string,
  abortSignal?: AbortSignal
) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const updatedMessages: ModelMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: userQuestion
        }
      ]
    }
  ]

  // Don't inject system into follow-up — it's already in the first message
  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    messages: updatedMessages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getGeneralStream(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const systemPrompt =
    settings.customPrompt ||
    PROMPT_SYSTEM +
      `\n使用编程语言：${settings.codeLanguage} 解答。\n\n注意：如果有多张截图，请结合所有截图内容进行完整分析，不要遗漏任何部分。`

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    messages: mergeSystemIntoMessages(systemPrompt, messages),
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}

export function getTranscriptionAnswerStream(
  transcriptionText: string,
  abortSignal?: AbortSignal
) {
  const openai = createOpenAI({
    baseURL: settings.apiBaseURL,
    apiKey: settings.apiKey
  })

  const systemPrompt =
    settings.customPrompt ||
    PROMPT_SYSTEM +
      `\n使用编程语言：${settings.codeLanguage} 解答。\n\n当前没有截图，请只根据语音转录内容判断面试官的问题，并给出适合口头回答或快速编码的建议。`

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: `${systemPrompt}\n\n---\n\n这是语音转录内容：\n${transcriptionText}`
    }
  ]

  const { textStream } = streamText({
    model: openai.chat(getModel(settings)),
    messages,
    abortSignal,
    onError: (err) => {
      throw err.error ?? err
    }
  })
  return textStream
}
