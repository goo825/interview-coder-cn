import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '@/lib/store/settings'
import { useAppStore } from '@/lib/store/app'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useSolutionStore } from '@/lib/store/solution'
import { startAudioCapture, stopAudioCapture } from '@/lib/audio-capture'

import { AppHeader } from './AppHeader'
import { AppContent } from './AppContent'
import { AppStatusBar } from './AppStatusBar'
import { PrerequisitesChecker } from './PrerequisitesChecker'
import { TranscriptionBar } from './TranscriptionBar'

export default function CoderPage() {
  const { opacity, dashscopeApiKey } = useSettingsStore()
  const { syncAppState } = useAppStore()
  const {
    isTranscribing,
    isVoiceAnswerListening,
    setIsTranscribing,
    setIsVoiceAnswerListening,
    setTranscriptionText,
    clearText
  } = useTranscriptionStore()
  const { setErrorMessage } = useSolutionStore()

  const stopCurrentTranscription = useCallback(async () => {
    stopAudioCapture()
    await window.api.stopTranscription().catch(() => undefined)
    setIsTranscribing(false)
  }, [setIsTranscribing])

  const startVoiceAnswerListening = useCallback(async () => {
    if (!dashscopeApiKey) {
      setErrorMessage('请先在设置中配置百炼平台 API Key')
      return
    }

    if (isTranscribing) {
      await stopCurrentTranscription()
    }

    try {
      clearText()
      await window.api.clearTranscriptionText()
      await startAudioCapture()
      await window.api.startTranscription(dashscopeApiKey)
      setIsTranscribing(true)
      setIsVoiceAnswerListening(true)
      setErrorMessage(null)
    } catch (err) {
      console.error('Failed to start voice answer listening:', err)
      stopAudioCapture()
      setIsTranscribing(false)
      setIsVoiceAnswerListening(false)
      const message = err instanceof Error ? err.message : '启动语音答题失败，请检查系统音频权限'
      const logFile = await window.api.getLogFilePath().catch(() => '')
      setErrorMessage(logFile ? `${message}\n日志位置：${logFile}` : message)
    }
  }, [
    clearText,
    dashscopeApiKey,
    isTranscribing,
    setErrorMessage,
    setIsTranscribing,
    setIsVoiceAnswerListening,
    stopCurrentTranscription
  ])

  const stopVoiceAnswerAndAnswer = useCallback(async () => {
    stopAudioCapture()
    const transcriptionText = await window.api.getTranscriptionText().catch(() => '')
    await window.api.stopTranscription().catch(() => undefined)
    setIsTranscribing(false)
    setIsVoiceAnswerListening(false)

    if (!transcriptionText.trim()) {
      setErrorMessage('没有识别到语音内容，请确认音频来源后重试。')
      return
    }

    await window.api.answerTranscription()
  }, [setErrorMessage, setIsTranscribing, setIsVoiceAnswerListening])

  useEffect(() => {
    document.body.style.opacity = opacity.toString()
    return () => {
      document.body.style.opacity = ''
    }
  }, [opacity])

  useEffect(() => {
    window.api.updateAppState({ inCoderPage: true })
    return () => {
      window.api.updateAppState({ inCoderPage: false })
    }
  }, [])

  useEffect(() => {
    window.api.onSyncAppState((state) => {
      syncAppState(state)
    })
    return () => {
      window.api.removeSyncAppStateListener()
    }
  }, [syncAppState])

  useEffect(() => {
    const handleToggle = async () => {
      if (isTranscribing) {
        await stopCurrentTranscription()
        setIsVoiceAnswerListening(false)
      } else {
        if (!dashscopeApiKey) {
          setErrorMessage('请先在设置中配置百炼平台 API Key')
          return
        }
        try {
          await startAudioCapture()
          await window.api.startTranscription(dashscopeApiKey)
          setIsTranscribing(true)
          setIsVoiceAnswerListening(false)
          setErrorMessage(null)
        } catch (err) {
          console.error('Failed to start transcription:', err)
          stopAudioCapture()
          setIsTranscribing(false)
          setIsVoiceAnswerListening(false)
          const message = err instanceof Error ? err.message : '启动语音转录失败，请检查系统音频权限'
          const logFile = await window.api.getLogFilePath().catch(() => '')
          setErrorMessage(logFile ? `${message}\n日志位置：${logFile}` : message)
        }
      }
    }

    window.api.onToggleTranscription(handleToggle)
    return () => {
      window.api.removeToggleTranscriptionListener()
    }
  }, [
    dashscopeApiKey,
    isTranscribing,
    setErrorMessage,
    setIsTranscribing,
    setIsVoiceAnswerListening,
    stopCurrentTranscription
  ])

  useEffect(() => {
    window.api.onTranscriptionText((data) => {
      setTranscriptionText(data.text)
    })
    window.api.onTranscriptionError((message) => {
      setErrorMessage(message)
      setIsTranscribing(false)
      setIsVoiceAnswerListening(false)
      stopAudioCapture()
    })
    window.api.onTranscriptionStopped(() => {
      setIsTranscribing(false)
      setIsVoiceAnswerListening(false)
    })
    window.api.onTranscriptionCleared(() => {
      clearText()
    })

    return () => {
      window.api.removeTranscriptionTextListener()
      window.api.removeTranscriptionErrorListener()
      window.api.removeTranscriptionStoppedListener()
      window.api.removeTranscriptionClearedListener()
    }
  }, [
    clearText,
    setErrorMessage,
    setIsTranscribing,
    setIsVoiceAnswerListening,
    setTranscriptionText
  ])

  useEffect(() => {
    return () => {
      if (useTranscriptionStore.getState().isTranscribing) {
        stopAudioCapture()
        window.api.stopTranscription()
      }
    }
  }, [])

  return (
    <div className="relative h-screen">
      <AppHeader />
      <AppContent />
      <TranscriptionBar
        onVoiceAnswerToggle={
          isVoiceAnswerListening ? stopVoiceAnswerAndAnswer : startVoiceAnswerListening
        }
      />
      <AppStatusBar />
      <PrerequisitesChecker />
    </div>
  )
}
