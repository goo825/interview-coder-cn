let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let processor: ScriptProcessorNode | null = null

function getAudioCaptureErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return '语音捕获失败：系统拒绝了屏幕/音频捕获权限，请允许共享屏幕音频后重试。'
    }
    if (error.name === 'NotFoundError') {
      return '语音捕获失败：没有找到可用的系统音频设备，请检查声卡驱动或改用麦克风/手动输入。'
    }
    if (error.name === 'AbortError') {
      return '语音捕获取消：没有选择可共享的屏幕或音频来源。'
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return `语音捕获失败：${message || '当前电脑的音频设备不可用，请检查声卡驱动或系统权限。'}`
}

export async function startAudioCapture(): Promise<void> {
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('当前系统不支持屏幕音频捕获 API')
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true
    })
    stream.getVideoTracks().forEach((t) => t.stop())

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop())
      throw new Error('未捕获到系统音频轨道，请确认选择窗口时勾选了共享音频')
    }

    mediaStream = stream

    audioContext = new AudioContext({ sampleRate: 16000 })
    const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks))

    processor = audioContext.createScriptProcessor(2048, 1, 1)
    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0)
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      window.api.sendTranscriptionAudioChunk(int16.buffer)
    }
    source.connect(processor)
    processor.connect(audioContext.destination)
  } catch (error) {
    stopAudioCapture()
    const message = getAudioCaptureErrorMessage(error)
    window.api.logClientError('audio.capture', `${message}\n${error instanceof Error ? error.stack : ''}`)
    throw new Error(message)
  }
}

export function stopAudioCapture(): void {
  if (processor) {
    processor.disconnect()
    processor = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
}
