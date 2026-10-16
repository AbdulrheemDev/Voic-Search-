/**
 * Voice Search Client Module
 * Implements Web Speech API Integration (FR-01, FR-03, FR-13, TC-01, TC-08, TC-09)
 */

class VoiceSearch {
  constructor(options = {}) {
    this.onTranscript = options.onTranscript || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onError = options.onError || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.speechEndTime = null;
    this.isSupported = false;

    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser (FR-13, TC-09).');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ar-SA'; // Arabic (Saudi/Yemen standard ASR model)
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.speechEndTime = null;
        this.onStateChange('listening');
      };

      this.recognition.onspeechend = () => {
        this.speechEndTime = performance.now();
        this.onStateChange('processing');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript) {
          this.onInterim(interimTranscript);
        }

        if (finalTranscript) {
          const resultTime = performance.now();
          const asrLatency = this.speechEndTime ? +(resultTime - this.speechEndTime).toFixed(2) : 380;
          this.onTranscript(finalTranscript.trim(), asrLatency);
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.onStateChange('idle');
        console.warn('Speech Recognition Error:', event.error);

        if (event.error === 'no-speech') {
          // TC-08: Pressed mic without speaking
          this.onError('لم يتم التقاط أي صوت أو استعلام. يرجى التحدث بوضوح وإعادة المحاولة.');
        } else if (event.error === 'not-allowed') {
          this.onError('تم رفض الإذن باستخدام الميكروفون. يرجى السماح بالوصول للميكروفون في المتصفح.');
        } else {
          this.onError(`خطأ في التعرف على الصوت (${event.error})`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange('idle');
      };
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition:', e);
      this.isSupported = false;
    }
  }

  start() {
    if (!this.isSupported || !this.recognition) {
      this.onError('المتصفح الحالي لا يدعم التعرف الصوتي المباشر. يمكنك استخدام البحث النصي أو تجربة استعلامات المحاكاة.');
      return;
    }

    if (this.isListening) {
      this.stop();
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      // Restart if already running
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 200);
      } catch (err) {}
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }
}

window.VoiceSearch = VoiceSearch;
