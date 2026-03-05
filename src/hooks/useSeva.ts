export function useSeva() {
  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.85;

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes("Google UK English Female") ||
          (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    }
  }

  function stop() {
    window.speechSynthesis.cancel();
  }

  return { speak, stop };
}
