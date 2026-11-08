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