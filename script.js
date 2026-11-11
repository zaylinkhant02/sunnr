// set up the hero carousel sizing based on how many slides are present
const track = document.getElementById('storyTrack');
const viewport = document.querySelector('.story-viewport');
const slides = [...document.querySelectorAll('.story-slide')];
const slideCount = slides.length;
if (track && slideCount > 0) {
  track.style.width = `${slideCount * 100}%`;
  slides.forEach((slide, index) => {
    slide.style.flexBasis = `${100 / slideCount}%`;
    slide.dataset.slide = String(index);
  });
}
const storyProgress = document.getElementById('storyProgress');
const storyProgressControl = document.getElementById('storyProgressControl');
const storyNav = document.querySelector('.story-navigation');
const solarResearchModal = document.getElementById('solarResearchModal');
const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const preparednessBackgroundVideo = document.querySelector('.preparedness-background-video');

const contactForm = document.getElementById('contactForm');
if (contactForm instanceof HTMLFormElement) {
  const fields = [
    { input: contactForm.elements.namedItem('name'), error: document.getElementById('contactNameError') },
    { input: contactForm.elements.namedItem('email'), error: document.getElementById('contactEmailError') },
    { input: contactForm.elements.namedItem('message'), error: document.getElementById('contactMessageError') },
  ].filter((field) => field.input instanceof HTMLInputElement || field.input instanceof HTMLTextAreaElement);
  const status = document.getElementById('contactFormStatus');
  const message = contactForm.elements.namedItem('message');
  const messageCount = document.getElementById('contactMessageCount');
  const submitButton = contactForm.querySelector('button[type="submit"]');

  if (message instanceof HTMLTextAreaElement && messageCount instanceof HTMLOutputElement) {
    message.addEventListener('input', () => {
      const atLimit = message.value.length >= message.maxLength;
      messageCount.textContent = atLimit ? `${message.value.length} / ${message.maxLength}` : '';
      messageCount.hidden = !atLimit;
    });
  }

  function validateContactField(input, error, showError) {
    const isBlank = !input.value.trim();
    input.setCustomValidity(isBlank ? 'Please fill out this field.' : '');
    const message = isBlank
      ? 'This field is required.'
      : input.validity.typeMismatch
        ? 'Enter a valid email address.'
        : input.validity.tooLong
          ? `This field must be ${input.maxLength} characters or fewer.`
          : '';

    input.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = showError ? message : '';
    error.classList.toggle('is-visible', showError && Boolean(message));
    return !message;
  }

  fields.forEach(({ input, error }) => {
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateContactField(input, error, true);
      if (status) {
        status.textContent = '';
        status.classList.remove('is-error', 'is-success');
      }
    });
  });

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalidField = fields.find(({ input, error }) => !validateContactField(input, error, true));

    if (invalidField) {
      invalidField.input.focus();
      if (status) {
        status.textContent = 'Please correct the highlighted fields.';
        status.classList.add('is-error');
        status.classList.remove('is-success');
      }
      return;
    }

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get('name')).trim(),
      email: String(formData.get('email')).trim(),
      message: String(formData.get('message')).trim(),
    };
    const originalButtonText = submitButton?.textContent;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }
    if (status) {
      status.textContent = 'Sending your message...';
      status.classList.remove('is-error', 'is-success');
    }

    try {
      const response = await fetch('https://defaultc7828ed774b74eac8daa4d2abb39a1.c3.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/15/workflows/abdbcf18524b43f987ea101cf6a854f7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=r930mh5Jqqylk8VVPf8fX7Q8GNg_mVRkjL9NpE0KVUw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Contact request failed (${response.status}).`);

      contactForm.reset();
      fields.forEach(({ input, error }) => {
        input.removeAttribute('aria-invalid');
        error.textContent = '';
        error.classList.remove('is-visible');
      });
      if (messageCount instanceof HTMLOutputElement) messageCount.hidden = true;
      if (status) {
        status.textContent = 'Thank you! Your message has been sent.';
        status.classList.add('is-success');
      }
    } catch (error) {
      console.error('Unable to send contact form:', error);
      if (status) {
        status.textContent = 'We could not send your message. Please try again later.';
        status.classList.add('is-error');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        if (originalButtonText !== null) submitButton.textContent = originalButtonText;
      }
    }
  });
}

if (preparednessBackgroundVideo) {
  preparednessBackgroundVideo.defaultPlaybackRate = 1;
  preparednessBackgroundVideo.playbackRate = 1;
}

// reveal sections when they enter the viewport
const revealTargets = document.querySelectorAll('[data-reveal]');

if (document.body.classList.contains('home-page')) {
  const updateHeaderVisibility = () => {
    document.body.classList.toggle('has-scrolled', window.scrollY > 0);
  };
  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
  updateHeaderVisibility();
}

if (revealTargets.length && !reducedMotionPreference.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('has-scroll-reveals');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -5% 0px',
  });

  revealTargets.forEach((element) => revealObserver.observe(element));
}

if (track && viewport && slides.length && storyProgress && storyProgressControl && storyNav) {
  // manage the slide state, progress bar and touch/keyboard controls
  let activeIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let autoAdvanceIntervalId;

  const AUTO_ADVANCE_INTERVAL = 8000;

  function updateTrackPosition() {
    track.style.transform = `translate3d(-${activeIndex * viewport.clientWidth}px, 0, 0)`;
  }

  function goToSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    updateTrackPosition();
    storyProgress.style.width = `${((activeIndex + 1) / slides.length) * 100}%`;
    storyProgressControl.setAttribute('aria-valuenow', String(activeIndex + 1));
    storyProgressControl.setAttribute('aria-valuemax', String(slides.length));
    storyProgressControl.setAttribute('aria-valuetext', `Slide ${activeIndex + 1} of ${slides.length}`);
    slides.forEach((slide, slideIndex) => {
      const inactive = slideIndex !== activeIndex;
      slide.setAttribute('aria-hidden', String(inactive));
      slide.toggleAttribute('inert', inactive);
    });
    storyNav.classList.add('is-transitioning');
    window.setTimeout(() => storyNav.classList.remove('is-transitioning'), 900);
  }

  function stopAutoAdvance() {
    window.clearInterval(autoAdvanceIntervalId);
    autoAdvanceIntervalId = undefined;
  }

  function startAutoAdvance() {
    stopAutoAdvance();
    if (reducedMotionPreference.matches || document.hidden || document.body.classList.contains('modal-open')) return;

    autoAdvanceIntervalId = window.setInterval(() => {
      if (document.hidden || document.body.classList.contains('modal-open')) {
        stopAutoAdvance();
        return;
      }
      goToSlide(activeIndex + 1);
    }, AUTO_ADVANCE_INTERVAL);
  }

  const previousBtn = document.getElementById('previousSlide');
  const nextBtn = document.getElementById('nextSlide');
  if (previousBtn && nextBtn) {
    previousBtn.addEventListener('click', () => {
      goToSlide(activeIndex - 1);
      startAutoAdvance();
    });
    nextBtn.addEventListener('click', () => {
      goToSlide(activeIndex + 1);
      startAutoAdvance();
    });
  }

  storyProgressControl.addEventListener('click', (event) => {
    const bounds = storyProgressControl.getBoundingClientRect();
    if (!bounds.width) return;

    const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    goToSlide(Math.min(slides.length - 1, Math.floor(position * slides.length)));
    startAutoAdvance();
  });

  storyProgressControl.addEventListener('keydown', (event) => {
    let targetIndex = activeIndex;
    if (event.key === 'ArrowRight') targetIndex += 1;
    else if (event.key === 'ArrowLeft') targetIndex -= 1;
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = slides.length - 1;
    else return;

    event.preventDefault();
    goToSlide(Math.max(0, Math.min(slides.length - 1, targetIndex)));
    startAutoAdvance();
  });

  viewport.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', (event) => {
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      goToSlide(activeIndex + (deltaX < 0 ? 1 : -1));
      startAutoAdvance();
    }
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (document.body.classList.contains('modal-open')) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))) return;
    if (event.key === 'ArrowRight') {
      goToSlide(activeIndex + 1);
      startAutoAdvance();
    }
    if (event.key === 'ArrowLeft') {
      goToSlide(activeIndex - 1);
      startAutoAdvance();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoAdvance();
    else startAutoAdvance();
  });

  if (solarResearchModal) {
    solarResearchModal.addEventListener('show.bs.modal', stopAutoAdvance);
    solarResearchModal.addEventListener('hidden.bs.modal', startAutoAdvance);
  }

  window.addEventListener('resize', () => {
    updateTrackPosition();
  });

  goToSlide(0);
  startAutoAdvance();
}

// toggle the map fullscreen state with a simple accessibility-friendly button
const heatMapPanel = document.querySelector('.heat-map-panel');
const heatMapFullscreen = document.getElementById('heatMapFullscreen');
const heatMapFullscreenStatus = document.getElementById('heatMapFullscreenStatus');

if (heatMapPanel && heatMapFullscreen && heatMapFullscreenStatus) {
  const fullscreenIcon = heatMapFullscreen.querySelector('i');

  function updateHeatMapFullscreenControl() {
    const isFullscreen = document.fullscreenElement === heatMapPanel;
    heatMapFullscreen.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen map' : 'View map fullscreen');
    fullscreenIcon?.classList.toggle('bi-arrows-fullscreen', !isFullscreen);
    fullscreenIcon?.classList.toggle('bi-fullscreen-exit', isFullscreen);
  }

  heatMapFullscreen.addEventListener('click', async () => {
    heatMapFullscreenStatus.textContent = '';

    try {
      if (document.fullscreenElement === heatMapPanel) {
        await document.exitFullscreen();
      } else if (typeof heatMapPanel.requestFullscreen === 'function') {
        await heatMapPanel.requestFullscreen();
      } else {
        heatMapFullscreenStatus.textContent = 'Fullscreen is not supported in this browser.';
      }
    } catch (error) {
      console.error('Unable to change the map fullscreen state.', error);
      heatMapFullscreenStatus.textContent = 'Fullscreen could not be opened.';
    }
  });

  document.addEventListener('fullscreenchange', updateHeatMapFullscreenControl);
}

const riskMapPanel = document.querySelector('.risk-map-frame-wrap');
const riskMapFullscreen = document.getElementById('riskMapFullscreen');
const riskMapFullscreenStatus = document.getElementById('riskMapFullscreenStatus');

if (riskMapPanel && riskMapFullscreen && riskMapFullscreenStatus) {
  const fullscreenIcon = riskMapFullscreen.querySelector('i');

  function updateRiskMapFullscreenControl() {
    const isFullscreen = document.fullscreenElement === riskMapPanel;
    riskMapFullscreen.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen map' : 'View map fullscreen');
    fullscreenIcon?.classList.toggle('bi-arrows-fullscreen', !isFullscreen);
    fullscreenIcon?.classList.toggle('bi-fullscreen-exit', isFullscreen);
  }

  riskMapFullscreen.addEventListener('click', async () => {
    riskMapFullscreenStatus.textContent = '';

    try {
      if (document.fullscreenElement === riskMapPanel) {
        await document.exitFullscreen();
      } else if (typeof riskMapPanel.requestFullscreen === 'function') {
        await riskMapPanel.requestFullscreen();
      } else {
        riskMapFullscreenStatus.textContent = 'Fullscreen is not supported in this browser.';
      }
    } catch (error) {
      console.error('Unable to change the risk map fullscreen state.', error);
      riskMapFullscreenStatus.textContent = 'Fullscreen could not be opened.';
    }
  });

  document.addEventListener('fullscreenchange', updateRiskMapFullscreenControl);
}

document.addEventListener("DOMContentLoaded", function() {
  const iconWrappers = document.querySelectorAll('.heatwave-action-section .icon-wrapper');

  iconWrappers.forEach(function(icon) {
    icon.addEventListener('mouseenter', function() {
      icon.classList.add('hovered');
    });

    icon.addEventListener('mouseleave', function() {
      icon.classList.remove('hovered');
    });
  });
});


// safety page quiz

(function () {

  // check whether the quiz exists on this page
  const nextButton = document.getElementById("quiz-next");

  if (!nextButton) {
    return;
  }

  const questions = [
    {
      category: "Heatwave Safety",
      question: "When is the hottest part of the day usually?",
      options: [
        "Early morning",
        "Around midday to afternoon",
        "Late at night",
        "Just before sunrise"
      ],
      answer: 1,
      explanation:
        "The hottest period is usually around midday and afternoon. Try to limit outdoor activity during these hours."
    },
    {
      category: "Heatwave Safety",
      question: "What is one of the best ways to prevent dehydration?",
      options: [
        "Drink water regularly",
        "Avoid drinking fluids",
        "Wear thick clothing",
        "Stay in direct sunlight"
      ],
      answer: 0,
      explanation:
        "Drinking water regularly helps replace fluids lost through sweating."
    },
    {
      category: "Heatwave Myths",
      question: "Are heatwaves simply normal weather events with no connection to climate change?",
      options: [
        "Yes, they are unrelated",
        "Yes, climate never affects them",
        "No, climate change can make heatwaves more intense",
        "No, heatwaves only happen in winter"
      ],
      answer: 2,
      explanation:
        "Climate change increases the likelihood and intensity of many heatwaves."
    },
    {
      category: "Solar Energy",
      question: "What happens to solar panel efficiency when temperatures become very high?",
      options: [
        "It always doubles",
        "It can decrease slightly",
        "It stops producing electricity permanently",
        "It becomes completely unaffected"
      ],
      answer: 1,
      explanation:
        "High temperatures can reduce solar panel efficiency, even when sunlight is strong."
    },
    {
      category: "Solar Energy",
      question: "Why is good airflow around solar panels important?",
      options: [
        "It makes panels heavier",
        "It blocks sunlight",
        "It helps panels stay cooler",
        "It stops electricity production"
      ],
      answer: 2,
      explanation:
        "Good ventilation allows heat to escape and helps prevent excessive panel temperatures."
    },
    {
      category: "Heatwave Safety",
      question: "Which is a warning sign of potentially life-threatening heatstroke?",
      options: [
        "A mild feeling of hunger",
        "Confusion or altered mental state",
        "Cold hands in a cool room",
        "Feeling thirsty after exercise"
      ],
      answer: 1,
      explanation:
        "Confusion or altered mental state can indicate heatstroke. Call emergency services and begin cooling the person immediately."
    }
  ];

  // get quiz elements
  const questionCount = document.getElementById("quiz-question-count");
  const scoreDisplay = document.getElementById("quiz-score");
  const progressBar = document.getElementById("quiz-progress");

  const categoryDisplay = document.getElementById("quiz-category");
  const questionDisplay = document.getElementById("quiz-question");
  const optionsContainer = document.getElementById("quiz-options");

  const feedbackDisplay = document.getElementById("quiz-feedback");

  const quizContent = document.getElementById("quiz-content");
  const resultScreen = document.getElementById("quiz-result");

  const resultTitle = document.getElementById("quiz-result-title");
  const resultText = document.getElementById("quiz-result-text");
  const restartButton = document.getElementById("quiz-restart");

  // check that the quiz html is complete
  const requiredElements = [
    questionCount,
    scoreDisplay,
    progressBar,
    categoryDisplay,
    questionDisplay,
    optionsContainer,
    feedbackDisplay,
    quizContent,
    resultScreen,
    resultTitle,
    resultText,
    restartButton
  ];

  if (requiredElements.some(element => !element)) {
    console.error("Some quiz HTML elements are missing.");
    return;
  }

  // quiz variables
  let currentQuestion = 0;
  let score = 0;
  let hasAnswered = false;

  const storageKey = "heatwaveQuizProgress";

  // save quiz progress
  function saveProgress() {

    const quizData = {
      currentQuestion: currentQuestion,
      score: score,
      hasAnswered: hasAnswered
    };

    localStorage.setItem(storageKey, JSON.stringify(quizData));
  }

  // load saved quiz progress
  function loadProgress() {

    const savedData = localStorage.getItem(storageKey);

    if (savedData !== null) {

      try {

        const quizData = JSON.parse(savedData);

        if (quizData.completed === true) {

          score = Number(quizData.score);

          if (
            Number.isInteger(score) &&
            score >= 0 &&
            score <= questions.length
          ) {
            currentQuestion = questions.length;
            return true;
          }
        }

        if (
          Number.isInteger(quizData.currentQuestion) &&
          quizData.currentQuestion >= 0 &&
          quizData.currentQuestion < questions.length &&
          Number.isInteger(quizData.score) &&
          quizData.score >= 0 &&
          quizData.score <= quizData.currentQuestion + 1 &&
          typeof quizData.hasAnswered === "boolean"
        ) {

          currentQuestion = quizData.currentQuestion;
          score = quizData.score;
          hasAnswered = quizData.hasAnswered;

          return false;
        }

      } catch (error) {
        console.error("Error loading quiz progress:", error);
      }
    }

    resetQuiz();
    return false;
  }

  // display the current question
  function showQuestion() {

    const question = questions[currentQuestion];

    questionCount.textContent =
      `Question ${currentQuestion + 1} of ${questions.length}`;

    scoreDisplay.textContent = `Score: ${score}`;

    categoryDisplay.textContent = question.category;
    questionDisplay.textContent = question.question;

    const progress = (currentQuestion / questions.length) * 100;

    progressBar.style.width = progress + "%";
    progressBar.setAttribute("aria-valuenow", progress);

    optionsContainer.innerHTML = "";

    feedbackDisplay.textContent = "";
    feedbackDisplay.className = "safety-final-quiz__feedback";

    nextButton.disabled = true;

    question.options.forEach(function(option, index) {

      const button = document.createElement("button");

      button.textContent = option;
      button.className = "safety-final-quiz__option";
      button.type = "button";

      button.addEventListener("click", function() {
        checkAnswer(index);
      });

      optionsContainer.appendChild(button);
    });

    if (hasAnswered) {
      restoreAnsweredQuestion();
    }
  }

  // check the selected answer
  function checkAnswer(selectedAnswer) {

    if (hasAnswered) {
      return;
    }

    hasAnswered = true;

    const question = questions[currentQuestion];
    const buttons = optionsContainer.children;

    if (selectedAnswer === question.answer) {

      score++;

      feedbackDisplay.textContent =
        "Correct! " + question.explanation;

      feedbackDisplay.classList.add("correct");

    } else {

      feedbackDisplay.textContent =
        "Not quite! " + question.explanation;

      feedbackDisplay.classList.add("wrong");
    }

    for (let i = 0; i < buttons.length; i++) {

      buttons[i].disabled = true;

      if (i === question.answer) {
        buttons[i].classList.add("correct");
      }

      if (i === selectedAnswer && selectedAnswer !== question.answer) {
        buttons[i].classList.add("wrong");
      }
    }

    scoreDisplay.textContent = `Score: ${score}`;

    nextButton.disabled = false;

    saveProgress();
  }

  // restore an already answered question
  function restoreAnsweredQuestion() {

    const question = questions[currentQuestion];
    const buttons = optionsContainer.children;

    for (let i = 0; i < buttons.length; i++) {

      buttons[i].disabled = true;

      if (i === question.answer) {
        buttons[i].classList.add("correct");
      }
    }

    feedbackDisplay.textContent =
      "You've already answered this question. " +
      question.explanation;

    feedbackDisplay.classList.add("correct");

    nextButton.disabled = false;
  }

  // move to the next question
  nextButton.addEventListener("click", function() {

    currentQuestion++;
    hasAnswered = false;

    if (currentQuestion < questions.length) {

      saveProgress();
      showQuestion();

    } else {

      showResults();

    }
  });

  // display quiz results
  function showResults() {

    quizContent.hidden = true;
    resultScreen.hidden = false;

    progressBar.style.width = "100%";
    progressBar.setAttribute("aria-valuenow", "100");

    questionCount.textContent = "Quiz completed!";
    scoreDisplay.textContent = `Score: ${score}`;

    resultTitle.textContent =
      "You Scored " + score + "/" + questions.length;

    if (score === questions.length) {

      resultText.textContent =
        "Perfect score! You've mastered the heatwave challenge.";

    } else if (score >= 4) {

      resultText.textContent =
        "Great job! You have a good understanding of heatwave safety and solar energy.";

    } else {

      resultText.textContent =
        "Good effort! Revisit the information and try the challenge again.";
    }

    localStorage.setItem(storageKey, JSON.stringify({
      completed: true,
      score: score
    }));
  }

  // reset the quiz
  function resetQuiz() {

    currentQuestion = 0;
    score = 0;
    hasAnswered = false;

    localStorage.removeItem(storageKey);
  }

  // restart the quiz
  restartButton.addEventListener("click", function() {

    resetQuiz();

    quizContent.hidden = false;
    resultScreen.hidden = true;

    saveProgress();
    showQuestion();
  });

  // initialize the quiz
  const quizCompleted = loadProgress();

  if (quizCompleted) {
    showResults();
  } else {
    showQuestion();
  }

})();

// weather dashboard for monitoring weather section

// find the html elements so javascript can update them

const countrySelect = document.getElementById("countrySelect");
const citySelect = document.getElementById("citySelect");

const celsiusBtn = document.getElementById("celsiusButton");
const fahrenheitBtn = document.getElementById("fahrenheitButton");

const locationDisplay = document.getElementById("weatherLocation");
const localTimeDisplay = document.getElementById("localTime");
const dateDisplay = document.getElementById("weatherDate");

const temperatureDisplay = document.getElementById("currentTemperature");
const temperatureUnitDisplay = document.getElementById("currentUnit");
const descriptionDisplay = document.getElementById("currentWeatherDescription");

const feelsLikeDisplay = document.getElementById("feelsLike");
const feelsLikeUnitDisplay = document.getElementById("feelsLikeUnit");

const humidityDisplay = document.getElementById("humidityValue");
const windDisplay = document.getElementById("windValue");
const rainDisplay = document.getElementById("rainValue");
const uvDisplay = document.getElementById("uvValue");
const todayHighDisplay = document.getElementById("todayHigh");

const updatedDisplay = document.getElementById("weatherUpdated");
const statusDisplay = document.getElementById("weatherStatus");

const alertList = document.getElementById("weatherAlerts");
const alertCount = document.getElementById("alertCount");
const alertCheckbox = document.getElementById("enableBrowserAlerts");
const testAlertButton = document.getElementById("testAlertButton");

const forecastLocation = document.getElementById("forecastLocation");
const forecastContainer = document.getElementById("weeklyForecast");

const temperatureCanvas = document.getElementById("temperatureChart");
const rainfallCanvas = document.getElementById("rainChart");

const weeklySummary = document.getElementById("weeklySummary");
const preparationAdvice = document.getElementById("preparationAdvice");


// each city has its own latitude and longitude
// the weather api uses these coordinates to find weather conditions

const locations = {
  Myanmar: {
    Yangon: {
      latitude: 16.8409,
      longitude: 96.1735
    },
    Mandalay: {
      latitude: 21.9588,
      longitude: 96.0891
    },
    Naypyidaw: {
      latitude: 19.7633,
      longitude: 96.0785
    },
    Bago: {
      latitude: 17.3360,
      longitude: 96.4797
    },
    Mawlamyine: {
      latitude: 16.4905,
      longitude: 97.6283
    },
    Pathein: {
      latitude: 16.7792,
      longitude: 94.7321
    },
    Taunggyi: {
      latitude: 20.7892,
      longitude: 97.0378
    },
    Myitkyina: {
      latitude: 25.3833,
      longitude: 97.4000
    },
    Sittwe: {
      latitude: 20.1500,
      longitude: 92.9000
    },
    Monywa: {
      latitude: 22.1086,
      longitude: 95.1358
    }
  }
};


// these values can change when the user selects
// a different city or temperature unit

let selectedCountry = "Myanmar";
let selectedCity = "Yangon";
let temperatureUnit = "celsius";

let weatherData = null;
let temperatureChart = null;
let rainfallChart = null;


// these are example thresholds for automatic weather alerts

const alertThresholds = {
  heatWarning: 35,
  extremeHeat: 40,
  highRainProbability: 70
};


// personal heat alert settings

// these are the default settings used when no saved settings exist

const default_personal_heat_settings = {
  enabled: true,
  threshold: 35,
  days: 3,
  notification: "browser"
};


// load previously saved personal heat settings

function load_personal_heat_settings() {
  try {
    const saved_settings = localStorage.getItem(
      "sunnrPersonalHeatSettings"
    );

    if (!saved_settings) {
      return { ...default_personal_heat_settings };
    }

    const parsed_settings = JSON.parse(saved_settings);

    const settings = {
      ...default_personal_heat_settings,
      ...parsed_settings
    };

    if (
      typeof settings.enabled !== "boolean" ||
      typeof settings.threshold !== "number" ||
      !Number.isFinite(settings.threshold) ||
      settings.threshold < 30 ||
      settings.threshold > 50 ||
      ![1, 3, 7].includes(settings.days) ||
      settings.notification !== "browser"
    ) {
      return { ...default_personal_heat_settings };
    }

    return settings;

  } catch (error) {
    console.error("could not load personal heat settings:", error);

    return { ...default_personal_heat_settings };
  }
}


// load the saved settings before checking the weather

let personal_heat_settings = load_personal_heat_settings();


// show the saved settings in the html inputs

function display_personal_heat_settings() {
  const enabled_input = document.getElementById(
    "personalHeatAlertsEnabled"
  );

  const threshold_input = document.getElementById(
    "personalHeatThreshold"
  );

  const days_input = document.getElementById(
    "personalHeatDays"
  );

  if (!enabled_input || !threshold_input || !days_input) return;

  enabled_input.checked = personal_heat_settings.enabled;
  threshold_input.value = personal_heat_settings.threshold;
  days_input.value = String(personal_heat_settings.days);
}


// ask the browser for permission to send notifications

async function request_heat_notification_permission() {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();

  return permission === "granted";
}


// save the personal heat alert settings

async function save_personal_heat_settings() {
  const enabled_input = document.getElementById(
    "personalHeatAlertsEnabled"
  );

  const threshold_input = document.getElementById(
    "personalHeatThreshold"
  );

  const days_input = document.getElementById(
    "personalHeatDays"
  );

  const status = document.getElementById(
    "personalHeatSettingsStatus"
  );

  if (!enabled_input || !threshold_input || !days_input) return;

  const threshold = Number(threshold_input.value);
  const days = Number(days_input.value);

  // check that the temperature is valid

  if (
    !Number.isFinite(threshold) ||
    threshold < 30 ||
    threshold > 50
  ) {
    if (status) {
      status.textContent =
        "please enter a temperature between 30°C and 50°C.";
    }

    return;
  }

  // check that the forecast period is valid

  if (![1, 3, 7].includes(days)) {
    if (status) {
      status.textContent =
        "please select a valid forecast period.";
    }

    return;
  }

  // update the settings with the user's choices

  personal_heat_settings = {
    enabled: enabled_input.checked,
    threshold: threshold,
    days: days,
    notification: "browser"
  };

  // save the settings in local storage

  localStorage.setItem(
    "sunnrPersonalHeatSettings",
    JSON.stringify(personal_heat_settings)
  );

  if (!personal_heat_settings.enabled) {
    if (status) {
      status.textContent = "personal heat alerts are disabled.";
    }

    return;
  }

  // ask for browser permission after the user clicks save

  const permission_granted =
    await request_heat_notification_permission();

  if (status) {
    if (permission_granted) {
      status.textContent =
        "your settings are saved. browser notifications are enabled.";
    } else {
      status.textContent =
        "your settings are saved, but browser notifications are not allowed. check your browser permissions.";
    }
  }

  // check the current forecast again after saving

  if (weatherData) {
    check_personal_heat_forecast(weatherData, selectedCity);
  }
}


// check the selected number of forecast days
// the api temperatures are in celsius, even if the dashboard uses fahrenheit

function check_personal_heat_forecast(data, city) {
  if (!personal_heat_settings.enabled) return;
  if (!data || !data.daily) return;

  const daily = data.daily;

  if (
    !Array.isArray(daily.time) ||
    !Array.isArray(daily.temperature_2m_max)
  ) {
    return;
  }

  const days_to_check = Math.min(
    personal_heat_settings.days,
    daily.time.length,
    daily.temperature_2m_max.length
  );

  for (let i = 0; i < days_to_check; i++) {
    const forecast_date = daily.time[i];
    const max_temperature = daily.temperature_2m_max[i];

    if (
      typeof max_temperature !== "number" ||
      !Number.isFinite(max_temperature)
    ) {
      continue;
    }

    if (max_temperature >= personal_heat_settings.threshold) {
      send_personal_heat_notification(
        city,
        forecast_date,
        max_temperature
      );
    }
  }
}


// send a browser notification when the personal temperature threshold is reached

function send_personal_heat_notification(city, date, temperature) {
  if (
    personal_heat_settings.notification !== "browser" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  // use a separate key for each city, date and threshold
  // this prevents the same forecast from sending repeated notifications

  const notification_key =
    `sunnrHeatNotification_${city}_${date}_${personal_heat_settings.threshold}`;

  if (localStorage.getItem(notification_key)) return;

  new Notification("Sunnr Personal Heat Alert", {
    body: `${city}: the forecast maximum is ${temperature}°C on ${date}. Your personal threshold is ${personal_heat_settings.threshold}°C.`,
    tag: notification_key
  });

  localStorage.setItem(notification_key, "true");
}


// connect the personal heat settings button

const save_personal_heat_button = document.getElementById(
  "savePersonalHeatSettings"
);

if (save_personal_heat_button) {
  save_personal_heat_button.addEventListener(
    "click",
    save_personal_heat_settings
  );
}


// show saved settings when the page loads

display_personal_heat_settings();


// load previously saved dashboard preferences

const savedCountry = localStorage.getItem("sunnrCountry");
const savedCity = localStorage.getItem("sunnrCity");
const savedUnit = localStorage.getItem("sunnrUnit");
const savedAlerts = localStorage.getItem("sunnrAlerts");

if (savedCountry && locations[savedCountry]) {
  selectedCountry = savedCountry;
}

if (
  savedCity &&
  locations[selectedCountry][savedCity]
) {
  selectedCity = savedCity;
}

if (savedUnit === "fahrenheit") {
  temperatureUnit = "fahrenheit";
}

if (alertCheckbox) {
  alertCheckbox.checked = savedAlerts !== "false";
}


// load the available countries and cities into the dropdowns

function loadLocationOptions() {
  if (!countrySelect || !citySelect) return;

  countrySelect.innerHTML = "";
  citySelect.innerHTML = "";

  for (const country in locations) {
    const option = document.createElement("option");

    option.value = country;
    option.textContent = country;

    countrySelect.appendChild(option);
  }

  countrySelect.value = selectedCountry;

  const cities = locations[selectedCountry];

  for (const city in cities) {
    const option = document.createElement("option");

    option.value = city;
    option.textContent = city;

    citySelect.appendChild(option);
  }

  citySelect.value = selectedCity;
}


// convert celsius into fahrenheit when needed

function convertTemperature(celsius) {
  if (temperatureUnit === "fahrenheit") {
    return (celsius * 9 / 5) + 32;
  }

  return celsius;
}


// round the temperature for display

function formatTemperature(celsius) {
  return Math.round(convertTemperature(celsius));
}


// return the correct temperature unit

function getTemperatureUnit() {
  return temperatureUnit === "celsius" ? "°C" : "°F";
}


// match weather codes with a description and icon

function getWeatherDescription(code) {
  if (code === 0) {
    return {
      description: "clear sky",
      icon: "bi-sun"
    };

  } else if (code === 1) {
    return {
      description: "mainly clear",
      icon: "bi-sun"
    };

  } else if (code === 2) {
    return {
      description: "partly cloudy",
      icon: "bi-cloud-sun"
    };

  } else if (code === 3) {
    return {
      description: "overcast",
      icon: "bi-clouds"
    };

  } else if (code >= 45 && code <= 48) {
    return {
      description: "foggy",
      icon: "bi-cloud-fog"
    };

  } else if (code >= 51 && code <= 67) {
    return {
      description: "rain",
      icon: "bi-cloud-rain"
    };

  } else if (code >= 71 && code <= 77) {
    return {
      description: "snow",
      icon: "bi-cloud-snow"
    };

  } else if (code >= 80 && code <= 82) {
    return {
      description: "rain showers",
      icon: "bi-cloud-rain-heavy"
    };

  } else if (code >= 95) {
    return {
      description: "thunderstorm",
      icon: "bi-cloud-lightning-rain"
    };

  } else {
    return {
      description: "changing conditions",
      icon: "bi-cloud"
    };
  }
}


// retrieve weather information from open-meteo
// async allows javascript to wait for the api without freezing the page
// await waits for the api response before continuing

async function getWeather() {
  const city = locations[selectedCountry][selectedCity];

  if (statusDisplay) {
    statusDisplay.textContent =
      "loading the latest weather information...";
  }

  try {
    const apiUrl = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    apiUrl.search = new URLSearchParams({
      latitude: city.latitude,
      longitude: city.longitude,

      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "wind_speed_10m"
      ].join(","),

      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "uv_index_max"
      ].join(","),

      timezone: "auto",
      forecast_days: "7"
    });

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        "weather information could not be retrieved."
      );
    }

    const data = await response.json();

    weatherData = data;

    // check personal heat alerts after the settings have loaded

    check_personal_heat_forecast(data, selectedCity);

    // update each section of the weather dashboard

    displayCurrentWeather(data);
    displayLocalTime(data.timezone);
    displayWeeklyForecast(data.daily);
    displayWeatherAlerts(data);
    displayWeeklyCharts(data.daily);
    displayWeeklySummary(data.daily);
    displayPreparationAdvice(data.daily);

    if (statusDisplay) {
      statusDisplay.textContent =
        `latest forecast for ${selectedCity}, ${selectedCountry}`;
    }

  } catch (error) {
    console.error("weather api error:", error);

    if (statusDisplay) {
      statusDisplay.textContent =
        "weather information is temporarily unavailable. please try again later.";
    }
  }
}


// display the current weather information

function displayCurrentWeather(data) {
  const current = data.current;
  const daily = data.daily;

  const weather = getWeatherDescription(current.weather_code);

  if (locationDisplay) {
    locationDisplay.textContent =
      `${selectedCity}, ${selectedCountry}`;
  }

  if (temperatureDisplay) {
    temperatureDisplay.textContent =
      formatTemperature(current.temperature_2m);
  }

  if (temperatureUnitDisplay) {
    temperatureUnitDisplay.textContent =
      getTemperatureUnit();
  }

  if (descriptionDisplay) {
    descriptionDisplay.textContent =
      weather.description;
  }

  if (feelsLikeDisplay) {
    feelsLikeDisplay.textContent =
      formatTemperature(current.apparent_temperature);
  }

  if (feelsLikeUnitDisplay) {
    feelsLikeUnitDisplay.textContent =
      getTemperatureUnit();
  }

  if (humidityDisplay) {
    humidityDisplay.textContent =
      `${current.relative_humidity_2m}%`;
  }

  if (windDisplay) {
    windDisplay.textContent =
      `${current.wind_speed_10m} km/h`;
  }

  if (rainDisplay) {
    const rainProbability =
      daily.precipitation_probability_max[0];

    rainDisplay.textContent =
      rainProbability == null
        ? "n/a"
        : `${rainProbability}%`;
  }

  if (todayHighDisplay) {
    todayHighDisplay.textContent =
      formatTemperature(daily.temperature_2m_max[0]) +
      getTemperatureUnit();
  }

  if (uvDisplay) {
    uvDisplay.textContent =
      daily.uv_index_max[0] ?? "n/a";
  }

  if (updatedDisplay) {
    const updateTime = new Date(current.time);

    updatedDisplay.textContent =
      `updated at ${updateTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
  }

  if (forecastLocation) {
    forecastLocation.textContent =
      `${selectedCity}, ${selectedCountry}`;
  }
}


// display the local time and date for the selected city

function displayLocalTime(timezone) {
  if (!localTimeDisplay || !dateDisplay) return;

  function updateClock() {
    const now = new Date();

    localTimeDisplay.textContent =
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(now);

    dateDisplay.textContent =
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now);
  }

  updateClock();

  if (window.weatherClock) {
    clearInterval(window.weatherClock);
  }

  window.weatherClock = setInterval(updateClock, 1000);
}


// display the seven-day weather forecast

function displayWeeklyForecast(daily) {
  if (!forecastContainer) return;

  forecastContainer.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const weather = getWeatherDescription(
      daily.weather_code[i]
    );

    const date = new Date(`${daily.time[i]}T12:00:00`);

    const dayName = date.toLocaleDateString("en-GB", {
      weekday: "long"
    });

    const dayDate = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });

    const rainProbability =
      daily.precipitation_probability_max[i];

    const forecastCard = document.createElement("article");

    forecastCard.className = "forecast-day";

    forecastCard.innerHTML = `
      <p class="forecast-day-name">${dayName}</p>

      <p class="forecast-day-date">${dayDate}</p>

      <i class="bi ${weather.icon} forecast-weather-icon"
         aria-hidden="true"></i>

      <p class="forecast-description">
        ${weather.description}
      </p>

      <div class="forecast-temperatures">
        <span>
          ${formatTemperature(daily.temperature_2m_max[i])}${getTemperatureUnit()}
        </span>

        <span>
          ${formatTemperature(daily.temperature_2m_min[i])}${getTemperatureUnit()}
        </span>
      </div>

      <p class="forecast-description">
        rain chance: ${rainProbability ?? "n/a"}%
      </p>
    `;

    forecastContainer.appendChild(forecastCard);
  }
}


// check current weather and forecast conditions for automatic alerts

function displayWeatherAlerts(data) {
  if (!alertList || !alertCount) return;

  alertList.innerHTML = "";

  const alerts = [];

  const currentTemperature =
    data.current.temperature_2m;

  if (currentTemperature >= alertThresholds.extremeHeat) {
    alerts.push({
      type: "danger",
      title: "extreme heat conditions",
      message:
        "the current temperature has reached the example extreme-heat threshold. check verified local safety guidance and take precautions."
    });

  } else if (
    currentTemperature >= alertThresholds.heatWarning
  ) {
    alerts.push({
      type: "warning",
      title: "high temperature warning",
      message:
        "the current temperature has reached the example heat-warning threshold. stay informed and plan outdoor activities carefully."
    });
  }

  for (let i = 0; i < data.daily.time.length; i++) {
    const maximumTemperature =
      data.daily.temperature_2m_max[i];

    const rainProbability =
      data.daily.precipitation_probability_max[i];

    const date = data.daily.time[i];

    if (maximumTemperature >= alertThresholds.heatWarning) {
      alerts.push({
        type: "warning",
        title: `heat expected on ${date}`,
        message:
          `the forecast maximum temperature is ${formatTemperature(maximumTemperature)}${getTemperatureUnit()}. prepare for potentially hot conditions.`
      });
    }

    if (
      rainProbability != null &&
      rainProbability >= alertThresholds.highRainProbability
    ) {
      alerts.push({
        type: "info",
        title: `high rainfall chance on ${date}`,
        message:
          `the forecast shows a ${rainProbability}% chance of precipitation. consider preparing for wet weather.`
      });
    }
  }

  alertCount.textContent = alerts.length;

  if (alerts.length === 0) {
    alertList.innerHTML = `
      <div class="weather-alert-empty">
        <i class="bi bi-check-circle" aria-hidden="true"></i>
        <p>no conditions have reached the example alert thresholds in this forecast.</p>
      </div>
    `;

    return;
  }

  for (const alert of alerts) {
    const alertCard = document.createElement("article");

    alertCard.className =
      `weather-alert-card ${alert.type}`;

    alertCard.innerHTML = `
      <div class="weather-alert-icon">
        <i class="bi bi-exclamation-triangle"
           aria-hidden="true"></i>
      </div>

      <div>
        <h3>${alert.title}</h3>
        <p>${alert.message}</p>
      </div>

      <span class="weather-alert-tag">
        ${alert.type}
      </span>
    `;

    alertList.appendChild(alertCard);
  }

  if (alertCheckbox && alertCheckbox.checked) {
    showBrowserAlert(alerts);
  }
}


// show an important automatic alert once per city per day

function showBrowserAlert(alerts) {
  const importantAlert = alerts.find(function(alert) {
    return alert.type === "danger";
  });

  if (!importantAlert) return;

  const alertKey =
    `sunnrLastPopup_${selectedCity}_${new Date().toDateString()}`;

  const alreadyShown = localStorage.getItem(alertKey);

  if (!alreadyShown) {
    window.alert(
      `sunnr weather warning\n\n${importantAlert.title}\n\n${importantAlert.message}`
    );

    localStorage.setItem(alertKey, "true");
  }
}


// test the existing automatic browser alert button

if (testAlertButton) {
  testAlertButton.addEventListener("click", function() {
    window.alert(
      "sunnr weather alert test\n\nbrowser alerts are working correctly."
    );
  });
}


// create the temperature and rainfall charts

function displayWeeklyCharts(daily) {
  if (!temperatureCanvas || !rainfallCanvas) return;

  if (typeof Chart === "undefined") {
    console.error("chart.js has not loaded.");
    return;
  }

  const labels = daily.time.map(function(date) {
    return new Date(`${date}T12:00:00`)
      .toLocaleDateString("en-GB", {
        weekday: "short"
      });
  });

  if (temperatureChart) {
    temperatureChart.destroy();
  }

  if (rainfallChart) {
    rainfallChart.destroy();
  }

  // create the temperature chart

  temperatureChart = new Chart(temperatureCanvas, {
    type: "line",

    data: {
      labels: labels,

      datasets: [
        {
          label: "maximum temperature",
          data: daily.temperature_2m_max.map(convertTemperature),
          borderColor: "#ffd700",
          backgroundColor: "rgba(255, 215, 0, 0.10)",
          fill: true,
          tension: 0.4
        },
        {
          label: "minimum temperature",
          data: daily.temperature_2m_min.map(convertTemperature),
          borderColor: "#83bfff",
          backgroundColor: "rgba(131, 191, 255, 0.08)",
          fill: true,
          tension: 0.4
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#f3eddd"
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#f3eddd"
          },
          grid: {
            color: "rgba(243, 237, 221, 0.08)"
          }
        },

        y: {
          ticks: {
            color: "#f3eddd",
            callback: function(value) {
              return value + getTemperatureUnit();
            }
          },
          grid: {
            color: "rgba(243, 237, 221, 0.08)"
          }
        }
      }
    }
  });


  // create the rainfall chart

  rainfallChart = new Chart(rainfallCanvas, {
    type: "bar",

    data: {
      labels: labels,

      datasets: [
        {
          label: "precipitation (mm)",
          data: daily.precipitation_sum,
          backgroundColor: "rgba(131, 191, 255, 0.65)",
          borderColor: "#83bfff",
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          labels: {
            color: "#f3eddd"
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#f3eddd"
          },
          grid: {
            display: false
          }
        },

        y: {
          beginAtZero: true,
          ticks: {
            color: "#f3eddd"
          },
          grid: {
            color: "rgba(243, 237, 221, 0.08)"
          }
        }
      }
    }
  });
}


// calculate and display the weekly weather summary

function displayWeeklySummary(daily) {
  if (!weeklySummary) return;

  let highestTemperature = daily.temperature_2m_max[0];
  let hottestDay = daily.time[0];

  let totalRainfall = 0;

  for (let i = 0; i < daily.time.length; i++) {
    if (
      daily.temperature_2m_max[i] > highestTemperature
    ) {
      highestTemperature = daily.temperature_2m_max[i];
      hottestDay = daily.time[i];
    }

    totalRainfall += daily.precipitation_sum[i] || 0;
  }

  const hottestDate =
    new Date(`${hottestDay}T12:00:00`)
      .toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short"
      });

  weeklySummary.innerHTML = `
    <div class="weekly-summary">
      <i class="bi bi-thermometer-sun" aria-hidden="true"></i>

      <p>
        the highest forecast temperature this week is
        <strong>${formatTemperature(highestTemperature)}${getTemperatureUnit()}</strong>,
        expected on <strong>${hottestDate}</strong>.
        the predicted total rainfall is
        <strong>${totalRainfall.toFixed(1)} mm</strong>.
      </p>
    </div>
  `;
}


// display preparation advice based on the weekly forecast

function displayPreparationAdvice(daily) {
  if (!preparationAdvice) return;

  preparationAdvice.innerHTML = "";

  const highestTemperature = Math.max(
    ...daily.temperature_2m_max
  );

  const highestRainProbability = Math.max(
    ...daily.precipitation_probability_max.map(
      value => value ?? 0
    )
  );

  const advice = [];

  if (highestTemperature >= alertThresholds.heatWarning) {
    advice.push({
      icon: "bi-droplet",
      title: "prepare for hot weather",
      message:
        "keep drinking water available, plan outdoor activities carefully and check local heat-safety guidance."
    });

  } else {
    advice.push({
      icon: "bi-sun",
      title: "stay weather aware",
      message:
        "check the daily forecast before planning outdoor activities and keep up with local weather updates."
    });
  }

  if (
    highestRainProbability >= alertThresholds.highRainProbability
  ) {
    advice.push({
      icon: "bi-cloud-rain",
      title: "prepare for rainfall",
      message:
        "consider keeping rain protection ready and checking local travel conditions."
    });
  }

  if (highestTemperature >= alertThresholds.extremeHeat) {
    advice.push({
      icon: "bi-heart-pulse",
      title: "check on vulnerable people",
      message:
        "pay particular attention to people who may be more affected by extreme heat and follow official local advice."
    });
  }

  for (const item of advice) {
    const card = document.createElement("article");

    card.className = "preparation-card";

    card.innerHTML = `
      <i class="bi ${item.icon}" aria-hidden="true"></i>
      <h3>${item.title}</h3>
      <p>${item.message}</p>
    `;

    preparationAdvice.appendChild(card);
  }
}


// save the selected dashboard preferences

function saveSettings() {
  localStorage.setItem("sunnrCountry", selectedCountry);
  localStorage.setItem("sunnrCity", selectedCity);
  localStorage.setItem("sunnrUnit", temperatureUnit);

  if (alertCheckbox) {
    localStorage.setItem(
      "sunnrAlerts",
      alertCheckbox.checked
    );
  }
}


// update the active temperature button

function updateUnitButtons() {
  if (celsiusBtn) {
    celsiusBtn.classList.toggle(
      "active",
      temperatureUnit === "celsius"
    );
  }

  if (fahrenheitBtn) {
    fahrenheitBtn.classList.toggle(
      "active",
      temperatureUnit === "fahrenheit"
    );
  }
}


// update the city list when the country changes

if (countrySelect) {
  countrySelect.addEventListener("change", function() {
    selectedCountry = countrySelect.value;

    selectedCity = Object.keys(
      locations[selectedCountry]
    )[0];

    loadLocationOptions();
    saveSettings();
    getWeather();
  });
}


// get new weather information when the city changes

if (citySelect) {
  citySelect.addEventListener("change", function() {
    selectedCity = citySelect.value;

    saveSettings();
    getWeather();
  });
}


// change the dashboard temperature to celsius

if (celsiusBtn) {
  celsiusBtn.addEventListener("click", function() {
    temperatureUnit = "celsius";

    saveSettings();
    updateUnitButtons();

    if (weatherData) {
      displayCurrentWeather(weatherData);
      displayWeeklyForecast(weatherData.daily);
      displayWeeklyCharts(weatherData.daily);
      displayWeeklySummary(weatherData.daily);
    }
  });
}


// change the dashboard temperature to fahrenheit

if (fahrenheitBtn) {
  fahrenheitBtn.addEventListener("click", function() {
    temperatureUnit = "fahrenheit";

    saveSettings();
    updateUnitButtons();

    if (weatherData) {
      displayCurrentWeather(weatherData);
      displayWeeklyForecast(weatherData.daily);
      displayWeeklyCharts(weatherData.daily);
      displayWeeklySummary(weatherData.daily);
    }
  });
}


// save changes when the automatic alert checkbox is used

if (alertCheckbox) {
  alertCheckbox.addEventListener("change", function() {
    saveSettings();

    if (alertCheckbox.checked) {
      window.alert(
        "sunnr weather alerts are now enabled."
      );
    }
  });
}


// initialize the weather dashboard

loadLocationOptions();
updateUnitButtons();

// get weather after all personal settings have initialized

getWeather();

// about us animations 

document.addEventListener("DOMContentLoaded", () => {
    const revealElements = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -35px 0px"
        });
        revealElements.forEach((element) => revealObserver.observe(element));
    } else {
        revealElements.forEach((element) => element.classList.add("is-visible"));
    }
    const navbar = document.getElementById("mainNavbar");
    const navLinks = document.querySelectorAll("#mainNavbar .nav-link");

    if (navbar && window.bootstrap) {
        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                if (navbar.classList.contains("show")) {
                    window.bootstrap.Collapse.getOrCreateInstance(navbar).hide();
                }
            });
        });
    }
});
// about us
document.addEventListener("DOMContentLoaded", () => {
    const revealElements = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: "0px 0px -35px 0px"
        });
        revealElements.forEach((element) => revealObserver.observe(element));
    } else {
        revealElements.forEach((element) => element.classList.add("is-visible"));
    }
    const navbar = document.getElementById("mainNavbar");
    const navLinks = document.querySelectorAll("#mainNavbar .nav-link");

    if (navbar && window.bootstrap) {
        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                if (navbar.classList.contains("show")) {
                    window.bootstrap.Collapse.getOrCreateInstance(navbar).hide();
                }
            });
        });
    }
});
// personal heat alert demo
const testPersonalHeatAlertButton = document.getElementById("testPersonalHeatAlert");

if (testPersonalHeatAlertButton) {
    testPersonalHeatAlertButton.addEventListener("click", async function () {
        const thresholdInput = document.getElementById("personalHeatThreshold");
        const status = document.getElementById("personalHeatSettingsStatus");

        const threshold = Number(thresholdInput?.value);

        if (!Number.isFinite(threshold) || threshold < 30 || threshold > 50) {
            if (status) {
                status.textContent = "Please enter a temperature between 30°C and 50°C.";
            }
            return;
        }

        const demoTemperature = Math.min(threshold + 2, 50);

        if (!("Notification" in window)) {
            alert(`SUNNR Heat Alert — Demo\n\nSimulated temperature: ${demoTemperature}°C`);
            return;
        }

        try {
            let permission = Notification.permission;

            if (permission === "default") {
                permission = await Notification.requestPermission();
            }

            if (permission === "granted") {
                new Notification("SUNNR Personal Heat Alert — Demo", {
                    body: `Demo forecast: ${demoTemperature}°C. This is above your ${threshold}°C alert threshold. Stay hydrated and avoid prolonged outdoor activity.`,
                    icon: "☀️"
                });

                if (status) {
                    status.textContent = "Demo heat alert notification sent successfully!";
                }
            } else {
                alert(`SUNNR Heat Alert — Demo\n\nSimulated temperature: ${demoTemperature}°C\n\nPlease allow browser notifications to receive alerts.`);
            }
        } catch (error) {
            console.error("Demo notification error:", error);
            alert("Unable to show the demo notification. Please check your browser settings.");
        }
    });
}