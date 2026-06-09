import { useEffect, useRef } from 'react'
import { Loader2, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSolutionStore } from '@/lib/store/solution'
import { useTranscriptionStore } from '@/lib/store/transcription'

type TranscriptionBarProps = {
  onVoiceAnswerToggle: () => void
}

export function TranscriptionBar({ onVoiceAnswerToggle }: TranscriptionBarProps) {
  const { isTranscribing, isVoiceAnswerListening, transcriptionText } = useTranscriptionStore()
  const { isLoading } = useSolutionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcriptionText])

  const showTextPanel = isTranscribing || transcriptionText
  const buttonLabel = isLoading
    ? '生成中'
    : isVoiceAnswerListening
      ? '停止并回答'
      : '开始听题'

  return (
    <div className="absolute top-10 left-0 right-0 px-6 pb-2 z-10 pointer-events-none">
      <div className="flex items-start gap-2">
        {showTextPanel && (
          <div className="flex min-w-0 flex-1 items-start gap-2 bg-gray-700/80 rounded-lg pl-2 pr-0 py-1 pointer-events-auto">
            {isTranscribing && (
              <Mic className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0 animate-pulse" />
            )}
            <div
              ref={scrollRef}
              className="transcription-scroll text-sm text-gray-300 max-h-[4.2em] overflow-y-auto leading-[1.4em] flex-1 whitespace-pre-wrap break-words"
            >
              {transcriptionText || (isTranscribing ? '等待语音输入...' : '')}
            </div>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant={isVoiceAnswerListening ? 'secondary' : 'default'}
          className="h-8 flex-shrink-0 shadow-lg pointer-events-auto"
          onClick={onVoiceAnswerToggle}
          disabled={isLoading}
          title="语音答题：开始听题，再次点击停止并自动回答"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isVoiceAnswerListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
