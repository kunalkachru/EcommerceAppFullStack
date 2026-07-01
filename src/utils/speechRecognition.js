import { NativeModules } from "react-native";
import Voice from "@react-native-voice/voice";

/** Native speech module may be missing on emulator or before linking. */
export function isSpeechRecognitionAvailable() {
  return Boolean(NativeModules.Voice);
}

const noop = () => {};

function clearSpeechHandlers() {
  if (!isSpeechRecognitionAvailable()) {
    return;
  }
  try {
    Voice.onSpeechStart = noop;
    Voice.onSpeechEnd = noop;
    Voice.onSpeechError = noop;
    Voice.onSpeechResults = noop;
    Voice.onSpeechPartialResults = noop;
  } catch {
    /* native module unavailable */
  }
}

/**
 * Register speech callbacks once. Uses RCTVoice setters only — never calls
 * removeAllListeners (that touches null NativeModules.Voice on some builds).
 */
export function bindSpeechHandlers(handlers) {
  if (!isSpeechRecognitionAvailable()) {
    return () => {};
  }

  try {
    if (handlers.onSpeechStart) Voice.onSpeechStart = handlers.onSpeechStart;
    if (handlers.onSpeechEnd) Voice.onSpeechEnd = handlers.onSpeechEnd;
    if (handlers.onSpeechError) Voice.onSpeechError = handlers.onSpeechError;
    if (handlers.onSpeechResults) Voice.onSpeechResults = handlers.onSpeechResults;
    if (handlers.onSpeechPartialResults) {
      Voice.onSpeechPartialResults = handlers.onSpeechPartialResults;
    }
  } catch {
    return () => {};
  }

  return clearSpeechHandlers;
}

export async function startSpeechRecognition(locale) {
  if (!isSpeechRecognitionAvailable()) {
    throw new Error("Speech recognition is not available on this device.");
  }
  await Voice.start(locale);
}

export async function stopSpeechRecognition() {
  if (!isSpeechRecognitionAvailable()) {
    return;
  }
  try {
    await Voice.stop();
  } catch {
    /* ignore */
  }
}

export async function destroySpeechRecognition() {
  if (!isSpeechRecognitionAvailable()) {
    return;
  }
  try {
    await Voice.destroy();
  } catch {
    /* ignore */
  }
  clearSpeechHandlers();
}
