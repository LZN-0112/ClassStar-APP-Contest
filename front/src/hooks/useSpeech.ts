import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiResponse } from '@/lib/api';

interface UseSpeechOptions {
  /** 识别完成后的文本；空字符串代表没听清 */
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
}

/** 单次录音上限：超过自动结束，避免上传文件过大 */
const MAX_RECORD_MS = 60_000;
/** 过短录音按“没听到”处理，避免把误触上传去计费 */
const MIN_RECORD_MS = 400;
/** 小于该字节数基本是空白音频 */
const MIN_AUDIO_BYTES = 1200;

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/** MediaRecorder 的 MIME 映射到服务端支持的格式枚举 */
function toFormat(mimeType: string) {
  const type = mimeType.toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('mp4') || type.includes('aac')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('音频读取失败'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('音频读取失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 语音输入封装：录音 → 上传到后端 → 由阿里云 qwen3-asr-flash 转成文字。
 * 比手机系统识别器准确得多，代价是松手后有 1–2 秒的识别等待。
 */
export function useSpeech({ onFinal, onError }: UseSpeechOptions = {}) {
  const [listening, setListening] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined');
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<'idle' | 'starting' | 'recording' | 'stopping' | 'uploading'>('idle');
  /** 启动尚未完成时用户就已松手，启动完成后立即停止 */
  const stopPendingRef = useRef(false);
  const cancelledRef = useRef(false);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  /** start 的自动结束定时器需要调用 stop，避免 useCallback 的声明顺序问题 */
  const stopRef = useRef<() => Promise<void>>();
  const callbacksRef = useRef({ onFinal, onError });

  useEffect(() => {
    callbacksRef.current = { onFinal, onError };
  }, [onFinal, onError]);

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const upload = useCallback(async (blob: Blob) => {
    setRecognizing(true);
    try {
      const base64 = await blobToBase64(blob);
      const res = await api.post<ApiResponse<{ text: string }>>(
        '/ai/assistant/asr',
        { audio: base64, format: toFormat(blob.type) },
        { timeout: 30000 },
      );
      const text = res.data?.data?.text?.trim() || '';
      if (!cancelledRef.current) callbacksRef.current.onFinal?.(text);
    } catch (error) {
      if (!cancelledRef.current) {
        callbacksRef.current.onError?.(error instanceof Error ? error.message : '语音识别失败，请重试');
      }
    } finally {
      phaseRef.current = 'idle';
      setRecognizing(false);
      setListening(false);
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      callbacksRef.current.onError?.('当前设备无法录音，请使用文字输入');
      return;
    }
    if (phaseRef.current !== 'idle') return;
    phaseRef.current = 'starting';
    cancelledRef.current = false;
    stopPendingRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        phaseRef.current = 'idle';
        return;
      }
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearMaxTimer();
        releaseStream();
        recorderRef.current = null;
        phaseRef.current = 'idle';
        setListening(false);
        callbacksRef.current.onError?.('录音出错，请重试或使用文字输入');
      };
      recorder.onstop = () => {
        clearMaxTimer();
        const duration = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        releaseStream();
        recorderRef.current = null;
        if (cancelledRef.current) {
          phaseRef.current = 'idle';
          setListening(false);
          return;
        }
        if (duration < MIN_RECORD_MS || blob.size < MIN_AUDIO_BYTES) {
          phaseRef.current = 'idle';
          setListening(false);
          callbacksRef.current.onFinal?.('');
          return;
        }
        phaseRef.current = 'uploading';
        void upload(blob);
      };

      recorder.start(250);
      phaseRef.current = 'recording';
      setListening(true);
      maxTimerRef.current = window.setTimeout(() => {
        void stopRef.current?.();
      }, MAX_RECORD_MS);

      if (stopPendingRef.current) void stopRef.current?.();
    } catch (error) {
      phaseRef.current = 'idle';
      releaseStream();
      const name = (error as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        callbacksRef.current.onError?.('麦克风权限未开启，请在系统设置中允许后重试');
      } else if (name === 'NotFoundError') {
        callbacksRef.current.onError?.('没有检测到麦克风，请检查设备');
      } else {
        callbacksRef.current.onError?.('录音启动失败，请重试或使用文字输入');
      }
    }
  }, [clearMaxTimer, releaseStream, supported, upload]);

  const stop = useCallback(async () => {
    // 启动还没完成就松手：由 start() 完成后立即停止
    if (phaseRef.current === 'starting') {
      stopPendingRef.current = true;
      return;
    }
    if (phaseRef.current !== 'recording') return;
    phaseRef.current = 'stopping';
    setListening(false);
    clearMaxTimer();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      phaseRef.current = 'idle';
      releaseStream();
      callbacksRef.current.onFinal?.('');
      return;
    }
    try {
      recorder.stop();
    } catch {
      phaseRef.current = 'idle';
      releaseStream();
      callbacksRef.current.onFinal?.('');
    }
  }, [clearMaxTimer, releaseStream]);

  /** 让 start 的定时器始终调用到最新的 stop */
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    clearMaxTimer();
    stopPendingRef.current = false;
    setListening(false);
    setRecognizing(false);
    const recorder = recorderRef.current;
    phaseRef.current = 'idle';
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        releaseStream();
      }
    } else {
      releaseStream();
    }
    recorderRef.current = null;
  }, [clearMaxTimer, releaseStream]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      stopPendingRef.current = false;
      if (maxTimerRef.current !== null) {
        window.clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
    },
    [],
  );

  return { listening, recognizing, supported, start, stop, cancel };
}