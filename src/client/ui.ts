import { Canvas } from './canvas';

function hide(el: HTMLElement | null) {
  el?.classList.add('hidden');
}

function show(el: HTMLElement | null) {
  el?.classList.remove('hidden');
}

function isHidden(el: HTMLElement | null) {
  return el?.classList.contains('hidden');
}

function toggleVisibilty(el: HTMLElement | null, force?: boolean) {
  el?.classList.toggle('hidden', !force);
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function UI(canvas: Canvas) {
  const el = {
    touchMessage: document.getElementById('touch'),
    processButton: document.getElementById('processBtn'),
    creditsButton: document.getElementById('creditsBtn'),
    loading: document.getElementById('loading'),
    credits: document.getElementById('credits'),
    textContainer: document.getElementById('text-container'),
    pixelsDrawn: document.getElementById('pixelsDrawn'),
    pixelsRemaining: document.getElementById('pixelsRemaining'),
    r: document.getElementById('red'),
    g: document.getElementById('green'),
    b: document.getElementById('blue'),
  };

  let animating = false;
  let hasShownTouchMessage = false;
  let returnCount = 0;

  const isLoading = () => {
    return !isHidden(el.loading);
  };

  const setLoading = (loading: boolean) => {
    toggleVisibilty(el.loading, loading);
    toggleVisibilty(el.textContainer, !loading);
    if (!hasShownTouchMessage && !loading && isTouchDevice()) {
      hasShownTouchMessage = true;
      show(el.touchMessage);
    }
  };

  const toggleCredits = () => {
    el.creditsButton?.classList.toggle('active', isHidden(el.credits));
    toggleVisibilty(el.credits, isHidden(el.credits));
  };

  el.creditsButton?.addEventListener('click', toggleCredits);
  el.processButton?.addEventListener('click', toggleAnimation);

  function checkTouchMessage() {
    if (hasShownTouchMessage) {
      hide(el.touchMessage);
      hasShownTouchMessage = false;
    }
  }

  // UPDATE INFO TEXT
  function updateText(pixelsDrawnCount: number, force?: boolean) {
    if (animating && !force) {
      returnCount = pixelsDrawnCount;
      return;
    }
    if (el.pixelsDrawn) el.pixelsDrawn.textContent = `${pixelsDrawnCount}`;
    if (el.pixelsRemaining)
      el.pixelsRemaining.textContent = `${canvas.totalPixels - pixelsDrawnCount}`;
    const color = canvas.getColor(pixelsDrawnCount);
    if (el.r) el.r.textContent = `${color.r}`;
    if (el.g) el.g.textContent = `${color.g}`;
    if (el.b) el.b.textContent = `${color.b}`;
  }

  function onStartAnimation() {
    animating = true;
    el.processButton?.classList.add('active');
  }

  function onStopAnimation() {
    animating = false;
    el.processButton?.classList.remove('active');
    updateText(returnCount);
  }

  function forceUpdateText(count: number) {
    updateText(count, true);
  }

  function stopAnimation() {
    canvas.stopAnimation();
    onStopAnimation();
  }

  function toggleAnimation() {
    if (!animating) {
      if (isLoading()) return;
      canvas.startAnimation(onStopAnimation, forceUpdateText);
      onStartAnimation();
    } else {
      stopAnimation();
    }
  }

  function loopProcess() {
    if (isLoading()) return;
    canvas.startAnimation(loopProcess, forceUpdateText);
    onStartAnimation();
  }

  return {
    checkTouchMessage,
    updateText,
    setLoading,
    toggleAnimation,
    loopProcess,
    stopAnimation,
    isAnimating() {
      return animating;
    },
  };
}
