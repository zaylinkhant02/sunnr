// set up the hero carousel sizing based on how many slides are present
const track = document.getElementById('storyTrack');
const viewport = document.querySelector('.story-viewport');
const slides = [...document.querySelectorAll('.story-slide')];
const slideCount = slides.length;
if (track && slideCount > 0) {
  track.style.width = `${slideCount * 100}%`;
  slides.forEach((slide) => { slide.style.flexBasis = `${100 / slideCount}%`; });
}
const storyProgress = document.getElementById('storyProgress');
const storyProgressControl = document.getElementById('storyProgressControl');
const storyNav = document.querySelector('.story-navigation');
const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const preparednessBackgroundVideo = document.querySelector('.preparedness-background-video');

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