jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.NativeModules.Voice = {
    startSpeech: jest.fn(),
    stopSpeech: jest.fn(),
    destroySpeech: jest.fn(),
    isSpeechAvailable: jest.fn((cb) => cb(true, null)),
  };
  return RN;
});

import {
  isSpeechRecognitionAvailable,
  bindSpeechHandlers,
} from "../src/utils/speechRecognition";

describe("speechRecognition", () => {
  it("detects native voice module", () => {
    expect(isSpeechRecognitionAvailable()).toBe(true);
  });

  it("binds handlers without throwing", () => {
    const cleanup = bindSpeechHandlers({
      onSpeechStart: jest.fn(),
      onSpeechResults: jest.fn(),
    });
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});
