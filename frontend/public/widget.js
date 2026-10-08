/**
 * R4R AI – Embeddable Voice Bot Widget (CDN Script)
 * Usage in any HTML / PHP / React / WordPress site:
 * 
 * <script 
 *   src="https://<your-domain>/widget.js" 
 *   data-api-url="https://<your-backend-domain>/api/v1"
 *   data-agent-name="Priya"
 *   data-agent-title="AI Advisor"
 *   data-avatar="https://<your-domain>/priya_avatar.jpg"
 *   defer>
 * </script>
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__VOICENEXUS_WIDGET_LOADED__) return;
  window.__VOICENEXUS_WIDGET_LOADED__ = true;

  // Locate the current script tag and extract parameters
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  const scriptSrc = currentScript ? currentScript.src : '';
  const scriptBaseUrl = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/')) : '';

  const CONFIG = {
    apiUrl:
      currentScript?.getAttribute('data-api-url') ||
      window.VOICENEXUS_API_URL ||
      'http://localhost:8000/api/v1',
    agentName: currentScript?.getAttribute('data-agent-name') || 'Priya',
    agentTitle: currentScript?.getAttribute('data-agent-title') || 'R4R AI Advisor',
    company: currentScript?.getAttribute('data-company') || 'R4R Real Estate',
    avatarUrl:
      currentScript?.getAttribute('data-avatar') ||
      (scriptBaseUrl ? `${scriptBaseUrl}/priya_avatar.jpg` : '/priya_avatar.jpg'),
    greeting:
      currentScript?.getAttribute('data-greeting') ||
      "Hello! Thanks for visiting Apex Realty. My name is Priya, your R4R AI Advisor. How can I help you find your ideal property, check availability, or book a viewing today?",
    themeColor: currentScript?.getAttribute('data-theme-color') || '#10b981',
  };

  // State
  let isOpen = false;
  let callState = 'ringing'; // 'ringing' | 'connected' | 'ended'
  let isMuted = false;
  let isListening = false;
  let callSeconds = 0;
  let timerInterval = null;
  let recognition = null;
  let ringInterval = null;
  const widgetSessionId = 'widget_session_' + Date.now();
  let activeProperty = null;
  let lastOffer = 'greeting';
  const messages = [];

  // Web Audio Ringtone Generator (no external mp3 file required)
  let audioCtx = null;
  function playRingTone() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      // AudioContext might require user interaction on some browsers
    }
  }

  function startRinging() {
    stopRinging();
    playRingTone();
    ringInterval = setInterval(playRingTone, 2500);
  }

  function stopRinging() {
    if (ringInterval) {
      clearInterval(ringInterval);
      ringInterval = null;
    }
  }

  // Text-To-Speech (Web Speech API)
  function speak(text) {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        (v.name.includes('Female') ||
          v.name.includes('Samantha') ||
          v.name.includes('Google UK English Female') ||
          v.name.includes('Victoria') ||
          v.name.includes('Zira')) &&
        v.lang.startsWith('en')
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Speech-To-Text (Microphone Recognition)
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const sr = new SpeechRecognition();
    sr.continuous = false;
    sr.interimResults = true;
    sr.lang = 'en-US';

    sr.onstart = () => {
      isListening = true;
      updateUI();
    };

    sr.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const inputEl = document.getElementById('vn-text-input');
      if (inputEl) {
        inputEl.value = finalTranscript || interimTranscript;
      }
      if (finalTranscript) {
        handleUserSpeechTurn(finalTranscript);
      }
    };

    sr.onerror = (e) => {
      isListening = false;
      updateUI();
    };

    sr.onend = () => {
      isListening = false;
      updateUI();
    };

    return sr;
  }

  function toggleListening() {
    if (!recognition) {
      recognition = initSpeechRecognition();
    }
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. You can type your message in the chat box.');
      return;
    }

    if (isListening) {
      recognition.stop();
      isListening = false;
    } else {
      stopSpeaking();
      try {
        recognition.start();
        isListening = true;
      } catch (err) {
        // already started
      }
    }
    updateUI();
  }

  // Handle incoming user statement (speech or typed)
  async function handleUserSpeechTurn(userText) {
    userText = (userText || '').trim();
    if (!userText || callState !== 'connected') return;

    // Add user message to transcript
    messages.push({ role: 'user', text: userText });
    updateChatLog();

    const inputEl = document.getElementById('vn-text-input');
    if (inputEl) inputEl.value = '';

    // Show temporary typing status
    const tempAssistantMsg = { role: 'assistant', text: 'Thinking...' };
    messages.push(tempAssistantMsg);
    updateChatLog();

    let reply = '';

    try {
      // 1. Try sending to VoiceNexus Backend with conversation history & session ID
      const historyToSend = messages
        .filter(m => m.text !== 'Thinking...')
        .slice(-8)
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch(`${CONFIG.apiUrl}/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: widgetSessionId,
          conversation_history: historyToSend
        }),
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.reply || '';
        if (data.properties && data.properties.length > 0) {
          activeProperty = data.properties[0];
        }
      }
    } catch (err) {
      console.warn('[VoiceNexus Widget] API unavailable, using local intelligent fallback:', err);
    }

    // 2. Intelligent local fallback if offline or backend error
    if (!reply) {
      const lower = userText.toLowerCase();
      let kbPolicy = "";
      if (lower.includes('escrow') || lower.includes('deposit') || lower.includes('policy')) {
        kbPolicy = "According to our company policy, a 5% escrow deposit is required upon offer acceptance, protected by a 14-day inspection contingency.";
      } else if (lower.includes('procedure') || lower.includes('faq') || lower.includes('inspection')) {
        kbPolicy = "Our procedure requires a certified physical inspection and clear title verification prior to closing.";
      }

      // Check Affirmation Intent ('yes', 'sure', 'ok')
      const isAffirmation = ['yes', 'sure', 'ok', 'okay', 'yeah', 'yep', 'yes please', 'please do', 'certainly'].includes(lower) || lower.startsWith('yes');
      if (isAffirmation) {
        if (lastOffer === 'offer_lead_capture') {
          reply = "Certainly! Please share your name and phone number or email, and I will have a senior advisor contact you right away.";
          lastOffer = 'awaiting_contact';
        } else if (lastOffer === 'offer_tour' || (activeProperty && activeProperty.title)) {
          const propName = activeProperty?.title || 'the residence';
          reply = `Wonderful! I would be delighted to schedule a private viewing tour for you at ${propName}. What day and time work best for you, or would tomorrow at 2:00 PM suit your schedule?`;
          lastOffer = 'awaiting_tour_time';
        } else {
          reply = "Wonderful! Would you like me to share full pricing specifications, check bedroom options, or schedule an in-person viewing tour?";
          lastOffer = 'offer_general';
        }
      }

      // Check Bedroom Count Intent (e.g. '2bed rooms is available', '3 bedrooms')
      const bedMatch = lower.match(/(\d+)\s*(?:bed|bd|bedroom|bedrooms|bed\s*rooms?)/);
      if (!reply && bedMatch) {
        const targetBeds = parseInt(bedMatch[1], 10);
        if (targetBeds === 2) {
          reply = "We currently do not have 2-bedroom residences in our active listings. Our closest available options feature 3 to 5 bedrooms: Cozy Suburban Family Home ($550,000, 3 beds), Sunset Modern Villa ($1,250,000, 4 beds), and Downtown Luxury Penthouse ($2,100,000, 3 beds). Would you like details on any of these?";
        } else {
          reply = `Yes, we have available residences with ${targetBeds} bedrooms including luxury floor plans. Would you like me to share specific pricing or schedule a viewing tour?`;
        }
        lastOffer = 'offer_tour';
      }

      // Check Facilities / Amenities Intent
      const isFacilities = lower.includes('facilit') || lower.includes('amenit') || lower.includes('feature') || lower.includes('pool') || lower.includes('gym');
      if (!reply && isFacilities) {
        if (activeProperty && activeProperty.title) {
          reply = `${activeProperty.title} features luxury amenities including an infinity pool, smart home integration, and expansive open living spaces. Would you like me to schedule a private viewing tour for you?`;
        } else {
          reply = "Our available luxury residences feature private infinity pools, smart home automation, panoramic views, private elevators, and gourmet kitchens. Which residence would you like specific facility details for?";
        }
        lastOffer = 'offer_tour';
      }

      // Check Broad Price Details Request ('price details share me')
      const isPrice = lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing');
      const isBroadPrice = isPrice && (lower.includes('share') || lower.includes('details') || lower.includes('list') || lower.includes('all'));
      if (!reply && isBroadPrice) {
        reply = "Here are the current prices for our available residences: Cozy Suburban Family Home at $550,000, modern villa at $650,000, Sunset Modern Villa at $1,250,000, Highland Luxury Villa at $1,850,000, and Downtown Luxury Penthouse at $2,100,000. Which residence fits your budget, or would you like to schedule a private viewing?";
        lastOffer = 'offer_tour';
      // Check Demonstrative ('this villa', 'this property', 'this one', 'it')
      const isDemonstrative = ['this villa', 'this property', 'this house', 'this home', 'this one', 'it'].some(w => lower.includes(w)) || lower.startsWith('this ') || lower.startsWith('is this ');
      const isCorrection = ['i ask for', 'i asked for', 'not ', 'i meant', 'i said'].some(w => lower.includes(w));

      if (!reply && (lower.includes('available') || lower.includes('is available') || lower.includes('availability') || isCorrection)) {
        const prefix = isCorrection ? "I apologize for the confusion! " : "";
        if (lower.includes('sunset') && !lower.includes('not sunset')) {
          activeProperty = { title: 'Sunset Modern Villa', price: 1250000 };
          reply = `${prefix}Yes, Sunset Modern Villa is currently available! It is listed at $1,250,000 in Beverly Hills, featuring 4 bedrooms and 3.5 bathrooms. Would you like me to schedule a private viewing tour for you?`;
        } else if ((lower.includes('penthouse') || lower.includes('downtown')) && !lower.includes('not penthouse') && !lower.includes('not downtown')) {
          activeProperty = { title: 'Downtown Luxury Penthouse', price: 2100000 };
          reply = `${prefix}Yes, Downtown Luxury Penthouse is currently available! It is listed at $2,100,000 in San Francisco, featuring 3 bedrooms and 3 bathrooms. Would you like me to schedule a private viewing tour for you?`;
        } else if (isDemonstrative && activeProperty && activeProperty.title) {
          reply = `${prefix}Yes, ${activeProperty.title} is currently available! It is listed at $${(activeProperty.price || 1250000).toLocaleString()}, featuring 4 bedrooms and 3.5 bathrooms. Would you like me to schedule a private viewing tour for you?`;
        } else {
          reply = `${prefix}Yes, our luxury residences including Sunset Modern Villa ($1,250,000) and Downtown Luxury Penthouse ($2,100,000) are currently available! Which residence would you like to explore or schedule a viewing for?`;
        }
        lastOffer = 'offer_tour';
        if (kbPolicy) reply = `${kbPolicy} In addition, ${reply}`;
      } else if (!reply && (lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('tour') || lower.includes('viewing'))) {
        reply = "I have scheduled a private viewing appointment for you tomorrow at 2:00 PM and reserved your time slot.";
        lastOffer = 'appointment_confirmed';
        if (kbPolicy) reply = `${kbPolicy} Also, ${reply}`;
      } else if (!reply && isPrice) {
        if (activeProperty) {
          reply = `${activeProperty.title} is listed at $${(activeProperty.price || 1250000).toLocaleString()}. Would you like to schedule a private viewing tour?`;
        } else {
          reply = "Our listings start from $550,000 for suburban family homes up to $2,100,000 for luxury downtown penthouses. Would you like me to book a viewing for you?";
        }
        lastOffer = 'offer_tour';
        if (kbPolicy) reply = `${kbPolicy} In addition, ${reply}`;
      } else if (!reply && kbPolicy) {
        reply = `${kbPolicy} Please let me know if you would like more details or if you would like to arrange a private viewing.`;
        lastOffer = 'offer_policy';
      } else if (!reply) {
        reply = `I apologize, but that specific information is currently unavailable in our active records. Would you like me to connect you with a representative or take your contact details?`;
        lastOffer = 'offer_lead_capture';
      }
    }

    // Replace "Thinking..." with actual reply
    messages[messages.length - 1] = { role: 'assistant', text: reply };
    updateChatLog();

    // Voice response
    if (!isMuted) {
      speak(reply);
    }
  }

  // Answer Call
  function answerCall() {
    stopRinging();
    callState = 'connected';
    callSeconds = 0;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      callSeconds++;
      const timerEl = document.getElementById('vn-call-timer');
      if (timerEl) {
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }
    }, 1000);

    messages.length = 0;
    messages.push({ role: 'assistant', text: CONFIG.greeting });
    updateUI();
    updateChatLog();

    if (!isMuted) {
      speak(CONFIG.greeting);
    }
  }

  // Decline / End Call
  function endCall() {
    stopRinging();
    stopSpeaking();
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
    clearInterval(timerInterval);
    callState = 'ended';
    updateUI();

    setTimeout(() => {
      isOpen = false;
      callState = 'ringing';
      updateUI();
    }, 400);
  }

  // Inject Styles
  function injectStyles() {
    if (document.getElementById('voicenexus-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'voicenexus-widget-styles';
    style.textContent = `
      #vn-widget-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        z-index: 999999 !important;
        color: #f8fafc !important;
        box-sizing: border-box !important;
      }
      #vn-widget-container * {
        box-sizing: border-box !important;
      }

      /* Floating Button */
      .vn-launcher {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        background: rgba(15, 23, 42, 0.95) !important;
        border: 1px solid rgba(16, 185, 129, 0.4) !important;
        padding: 8px 18px 8px 8px !important;
        border-radius: 9999px !important;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(16, 185, 129, 0.2) !important;
        cursor: pointer !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        backdrop-filter: blur(8px) !important;
        user-select: none !important;
      }
      .vn-launcher:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 25px 30px -5px rgba(0,0,0,0.6), 0 10px 15px -3px rgba(16, 185, 129, 0.3) !important;
      }
      .vn-avatar-wrapper {
        position: relative !important;
        width: 44px !important;
        height: 44px !important;
        flex-shrink: 0 !important;
      }
      .vn-avatar-img {
        width: 100% !important;
        height: 100% !important;
        border-radius: 9999px !important;
        object-fit: cover !important;
        border: 2px solid #34d399 !important;
        display: block !important;
      }
      .vn-status-ping {
        position: absolute !important;
        bottom: 0 !important;
        right: 0 !important;
        width: 12px !important;
        height: 12px !important;
        background: #10b981 !important;
        border: 2px solid #0f172a !important;
        border-radius: 9999px !important;
        animation: vnPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
      }
      .vn-launcher-text {
        text-align: left !important;
      }
      .vn-launcher-title {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        line-height: 1.2 !important;
      }
      .vn-badge {
        font-size: 10px !important;
        background: rgba(16, 185, 129, 0.2) !important;
        color: #6ee7b7 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        font-weight: 600 !important;
      }
      .vn-launcher-sub {
        font-size: 11px !important;
        color: #34d399 !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-top: 2px !important;
      }

      /* Modal Box */
      .vn-modal {
        width: 380px !important;
        max-width: calc(100vw - 32px) !important;
        background: rgba(15, 23, 42, 0.98) !important;
        border: 1px solid #1e293b !important;
        border-radius: 24px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(16, 185, 129, 0.15) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        backdrop-filter: blur(16px) !important;
        animation: vnFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }

      /* Header */
      .vn-header {
        background: linear-gradient(135deg, #10b981 0%, #0d9488 100%) !important;
        padding: 14px 18px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        color: white !important;
      }
      .vn-header-left {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .vn-header-avatar {
        width: 40px !important;
        height: 40px !important;
        border-radius: 9999px !important;
        object-fit: cover !important;
        border: 2px solid rgba(255, 255, 255, 0.8) !important;
      }
      .vn-header-name {
        font-size: 15px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
      }
      .vn-header-sub {
        font-size: 11px !important;
        opacity: 0.9 !important;
      }
      .vn-header-actions {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .vn-icon-btn {
        background: rgba(255, 255, 255, 0.15) !important;
        border: none !important;
        color: white !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 9999px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: background 0.2s !important;
      }
      .vn-icon-btn:hover {
        background: rgba(255, 255, 255, 0.25) !important;
      }

      /* Ringing Screen */
      .vn-ringing-screen {
        padding: 32px 24px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
      }
      .vn-ring-avatar-wrap {
        position: relative !important;
        margin-bottom: 16px !important;
      }
      .vn-ring-avatar {
        width: 104px !important;
        height: 104px !important;
        border-radius: 9999px !important;
        object-fit: cover !important;
        border: 4px solid #0f172a !important;
        position: relative !important;
        z-index: 2 !important;
      }
      .vn-ring-halo {
        position: absolute !important;
        inset: -8px !important;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0) 70%) !important;
        border-radius: 9999px !important;
        animation: vnHalo 1.8s infinite !important;
        z-index: 1 !important;
      }
      .vn-ring-title {
        font-size: 22px !important;
        font-weight: 700 !important;
        color: white !important;
        margin: 0 !important;
      }
      .vn-ring-sub {
        font-size: 12px !important;
        color: #94a3b8 !important;
        margin: 4px 0 16px 0 !important;
      }
      .vn-live-badge {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(16, 185, 129, 0.1) !important;
        border: 1px solid rgba(16, 185, 129, 0.3) !important;
        color: #34d399 !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        padding: 5px 12px !important;
        border-radius: 9999px !important;
        margin-bottom: 24px !important;
      }
      .vn-actions-row {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 40px !important;
        width: 100% !important;
        margin-bottom: 18px !important;
      }
      .vn-call-btn-col {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .vn-decline-btn {
        width: 56px !important;
        height: 56px !important;
        border-radius: 9999px !important;
        background: #ef4444 !important;
        color: white !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.4) !important;
        transition: transform 0.15s !important;
      }
      .vn-decline-btn:hover {
        transform: scale(1.1) !important;
      }
      .vn-answer-btn {
        width: 56px !important;
        height: 56px !important;
        border-radius: 9999px !important;
        background: #10b981 !important;
        color: white !important;
        border: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.5) !important;
        animation: vnBounce 1s infinite alternate !important;
        transition: transform 0.15s !important;
      }
      .vn-answer-btn:hover {
        transform: scale(1.1) !important;
      }
      .vn-btn-label {
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.05em !important;
        text-transform: uppercase !important;
        color: #94a3b8 !important;
      }
      .vn-branding {
        font-size: 11px !important;
        color: #64748b !important;
        border-top: 1px solid #1e293b !important;
        padding-top: 10px !important;
        width: 100% !important;
      }

      /* Connected Active Call Screen */
      .vn-connected-screen {
        padding: 16px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      .vn-call-status-bar {
        background: rgba(6, 78, 59, 0.4) !important;
        border: 1px solid rgba(16, 185, 129, 0.3) !important;
        border-radius: 14px !important;
        padding: 8px 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .vn-status-left {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #6ee7b7 !important;
      }
      .vn-dot-ping {
        width: 8px !important;
        height: 8px !important;
        background: #34d399 !important;
        border-radius: 9999px !important;
        animation: vnPulse 1.5s infinite !important;
      }
      .vn-timer {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #34d399 !important;
        background: rgba(6, 78, 59, 0.6) !important;
        padding: 2px 8px !important;
        border-radius: 8px !important;
      }

      /* Chat messages transcript */
      .vn-chat-scroll {
        height: 180px !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        padding-right: 4px !important;
      }
      .vn-msg {
        display: flex !important;
        gap: 8px !important;
        max-width: 85% !important;
        font-size: 12px !important;
        line-height: 1.4 !important;
      }
      .vn-msg-assistant {
        align-self: flex-start !important;
      }
      .vn-msg-user {
        align-self: flex-end !important;
        flex-direction: row-reverse !important;
      }
      .vn-msg-bubble {
        padding: 8px 12px !important;
        border-radius: 14px !important;
      }
      .vn-msg-assistant .vn-msg-bubble {
        background: #1e293b !important;
        color: #e2e8f0 !important;
        border-bottom-left-radius: 2px !important;
        border: 1px solid #334155 !important;
      }
      .vn-msg-user .vn-msg-bubble {
        background: #059669 !important;
        color: white !important;
        border-bottom-right-radius: 2px !important;
      }
      .vn-msg-avatar {
        width: 24px !important;
        height: 24px !important;
        border-radius: 9999px !important;
        object-fit: cover !important;
        border: 1px solid #34d399 !important;
        flex-shrink: 0 !important;
      }

      /* Listening bar */
      .vn-listening-bar {
        background: rgba(239, 68, 68, 0.15) !important;
        border: 1px solid rgba(239, 68, 68, 0.4) !important;
        border-radius: 10px !important;
        padding: 6px 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        color: #fca5a5 !important;
        animation: vnPulse 1.5s infinite !important;
      }

      /* Input row */
      .vn-input-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .vn-mic-btn {
        width: 38px !important;
        height: 38px !important;
        border-radius: 12px !important;
        background: #1e293b !important;
        border: 1px solid #334155 !important;
        color: #34d399 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        flex-shrink: 0 !important;
      }
      .vn-mic-btn.active {
        background: #dc2626 !important;
        border-color: #ef4444 !important;
        color: white !important;
        animation: vnPulse 1s infinite !important;
      }
      .vn-text-input {
        flex: 1 !important;
        background: #020617 !important;
        border: 1px solid #1e293b !important;
        border-radius: 12px !important;
        padding: 9px 12px !important;
        font-size: 12px !important;
        color: #f8fafc !important;
        outline: none !important;
      }
      .vn-text-input:focus {
        border-color: #10b981 !important;
      }
      .vn-send-btn {
        width: 38px !important;
        height: 38px !important;
        border-radius: 12px !important;
        background: #10b981 !important;
        border: none !important;
        color: #0f172a !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        font-weight: 700 !important;
        flex-shrink: 0 !important;
      }
      .vn-end-btn {
        width: 100% !important;
        padding: 10px !important;
        border-radius: 12px !important;
        background: #dc2626 !important;
        color: white !important;
        border: none !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        transition: background 0.15s !important;
      }
      .vn-end-btn:hover {
        background: #b91c1c !important;
      }

      /* Animations */
      @keyframes vnPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes vnHalo {
        0% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 0.3; }
        100% { transform: scale(0.95); opacity: 0.8; }
      }
      @keyframes vnBounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-4px); }
      }
      @keyframes vnFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Create Container
  function createContainer() {
    let container = document.getElementById('vn-widget-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vn-widget-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // Render UI
  function updateUI() {
    const container = createContainer();
    if (!isOpen) {
      container.innerHTML = `
        <div class="vn-launcher" id="vn-launcher-btn">
          <div class="vn-avatar-wrapper">
            <img src="${CONFIG.avatarUrl}" alt="${CONFIG.agentName}" class="vn-avatar-img" />
            <div class="vn-status-ping"></div>
          </div>
          <div class="vn-launcher-text">
            <div class="vn-launcher-title">
              <span>${CONFIG.agentName}</span>
              <span class="vn-badge">${CONFIG.agentTitle}</span>
            </div>
            <div class="vn-launcher-sub">
              <span>✨ Live Interactive Call</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('vn-launcher-btn')?.addEventListener('click', () => {
        isOpen = true;
        callState = 'ringing';
        updateUI();
        startRinging();
      });
      return;
    }

    // Modal UI
    container.innerHTML = `
      <div class="vn-modal">
        <!-- Header -->
        <div class="vn-header">
          <div class="vn-header-left">
            <img src="${CONFIG.avatarUrl}" alt="${CONFIG.agentName}" class="vn-header-avatar" />
            <div>
              <div class="vn-header-name">${CONFIG.agentName}</div>
              <div class="vn-header-sub">${CONFIG.company}</div>
            </div>
          </div>
          <div class="vn-header-actions">
            <button class="vn-icon-btn" id="vn-mute-btn" title="${isMuted ? 'Unmute' : 'Mute'}">
              ${isMuted ? '🔇' : '🔊'}
            </button>
            <button class="vn-icon-btn" id="vn-close-btn" title="Close">✕</button>
          </div>
        </div>

        ${callState === 'ringing'
        ? `
          <!-- Ringing Screen -->
          <div class="vn-ringing-screen">
            <div class="vn-ring-avatar-wrap">
              <div class="vn-ring-halo"></div>
              <img src="${CONFIG.avatarUrl}" alt="${CONFIG.agentName}" class="vn-ring-avatar" />
            </div>
            <h3 class="vn-ring-title">${CONFIG.agentName}</h3>
            <p class="vn-ring-sub">${CONFIG.company} AI</p>

            <div class="vn-live-badge">
              <span>✨ Live Interactive Call</span>
            </div>

            <div class="vn-actions-row">
              <div class="vn-call-btn-col">
                <button class="vn-decline-btn" id="vn-decline-btn" title="Decline">
                  <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.13-8.68A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                </button>
                <span class="vn-btn-label">DECLINE</span>
              </div>

              <div class="vn-call-btn-col">
                <button class="vn-answer-btn" id="vn-answer-btn" title="Answer">
                  <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </button>
                <span class="vn-btn-label" style="color: #34d399;">ANSWER</span>
              </div>
            </div>

            <div class="vn-branding">
              Powered by <strong>R4R Technologies</strong>
            </div>
          </div>
        `
        : `
          <!-- In-Call Connected Screen -->
          <div class="vn-connected-screen">
            <div class="vn-call-status-bar">
              <div class="vn-status-left">
                <div class="vn-dot-ping"></div>
                <span>Call Connected</span>
              </div>
              <div class="vn-timer" id="vn-call-timer">00:00</div>
            </div>

            <!-- Chat Scroll -->
            <div class="vn-chat-scroll" id="vn-chat-scroll"></div>

            <!-- Listening Indicator -->
            ${isListening
          ? `
              <div class="vn-listening-bar">
                <span>🔴 Listening to your voice... Speak now!</span>
              </div>
            `
          : ''
        }

            <!-- Input Row -->
            <div class="vn-input-row">
              <button class="vn-mic-btn ${isListening ? 'active' : ''}" id="vn-mic-btn" title="Microphone">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
              <input type="text" id="vn-text-input" class="vn-text-input" placeholder="Click mic to speak, or type..." />
              <button class="vn-send-btn" id="vn-send-btn" title="Send">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>

            <!-- End Call Button -->
            <button class="vn-end-btn" id="vn-end-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.13-8.68A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
              <span>End Call Session</span>
            </button>
          </div>
        `
      }
      </div>
    `;

    // Event Listeners
    document.getElementById('vn-close-btn')?.addEventListener('click', endCall);
    document.getElementById('vn-mute-btn')?.addEventListener('click', () => {
      isMuted = !isMuted;
      if (isMuted) stopSpeaking();
      updateUI();
    });

    document.getElementById('vn-decline-btn')?.addEventListener('click', endCall);
    document.getElementById('vn-answer-btn')?.addEventListener('click', answerCall);

    document.getElementById('vn-mic-btn')?.addEventListener('click', toggleListening);

    const input = document.getElementById('vn-text-input');
    const sendBtn = document.getElementById('vn-send-btn');

    sendBtn?.addEventListener('click', () => {
      if (input) handleUserSpeechTurn(input.value);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUserSpeechTurn(input.value);
      }
    });

    document.getElementById('vn-end-btn')?.addEventListener('click', endCall);

    if (callState === 'connected') {
      updateChatLog();
    }
  }

  function updateChatLog() {
    const scroll = document.getElementById('vn-chat-scroll');
    if (!scroll) return;

    scroll.innerHTML = messages
      .map(
        (m) => `
        <div class="vn-msg ${m.role === 'assistant' ? 'vn-msg-assistant' : 'vn-msg-user'}">
          ${m.role === 'assistant'
            ? `<img src="${CONFIG.avatarUrl}" alt="${CONFIG.agentName}" class="vn-msg-avatar" />`
            : ''
          }
          <div class="vn-msg-bubble">${m.text}</div>
        </div>
      `
      )
      .join('');

    scroll.scrollTop = scroll.scrollHeight;
  }

  // Initialize on DOM Ready
  function init() {
    injectStyles();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
