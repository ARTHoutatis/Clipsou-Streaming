document.addEventListener('DOMContentLoaded', function () {
  // Ensure lazy/async attrs on all images
  document.querySelectorAll('img').forEach(function (img) {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', 'Image – Clipsou Streaming');
  });

  // Carousel indicators: click/keyboard to navigate to a specific slide
  const carousel = document.querySelector('.carousel-container');
  if (carousel) {
    const slidesTrack = carousel.querySelector('.carousel-slides');
    const indicatorsWrap = carousel.querySelector('.carousel-indicators');
    const indicators = carousel.querySelectorAll('.carousel-indicator');

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    let currentIndex = 0;
    const slideCount = indicators.length || 5;
    let resumeTimeout = null;
    let autoInterval = null;

    function clearResumeTimer() {
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }
    }

    function stopAuto() {
      if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    }

    function startAuto() {
      stopAuto();
      autoInterval = setInterval(() => {
        nextSlide();
      }, 5000); // 5s per slide
    }

    function scheduleResume() {
      clearResumeTimer();
      resumeTimeout = setTimeout(() => {
        startAuto();
      }, 10000); // 10s
    }

    function goToSlide(index) {
      if (!slidesTrack) return;
      // Always run in manual mode (CSS keyframes disabled)
      slidesTrack.classList.add('manual');
      if (indicatorsWrap) indicatorsWrap.classList.add('manual');

      currentIndex = clamp(index, 0, indicators.length - 1);
      const offsetPercent = currentIndex * 20; // 5 slides => 20% per slide
      slidesTrack.style.transform = `translateX(-${offsetPercent}%)`;

      // Update active indicator and aria-current
      indicators.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
        dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });

      // Schedule auto-resume after inactivity
      scheduleResume();
    }

    function nextSlide() {
      const next = (currentIndex + 1) % slideCount;
      goToSlide(next);
    }

    function prevSlide() {
      const prev = (currentIndex - 1 + slideCount) % slideCount;
      goToSlide(prev);
    }

    indicators.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
        stopAuto();
        goToSlide(idx);
      });
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
          stopAuto();
          goToSlide(idx);
        }
      });
    });

    // Mobile arrows
    const prevBtn = carousel.querySelector('.carousel-arrow.prev');
    const nextBtn = carousel.querySelector('.carousel-arrow.next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stopAuto();
        prevSlide();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        stopAuto();
        nextSlide();
      });
    }

    // Initialize: disable CSS keyframes and start JS autoplay from slide 0
    slidesTrack.classList.add('manual');
    if (indicatorsWrap) indicatorsWrap.classList.add('manual');
    goToSlide(0);
    startAuto();
  }

  // removed scroll buttons logic
});
