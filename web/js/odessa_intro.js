document.addEventListener('DOMContentLoaded', () => {
  const introduzioneDiv = document.getElementById('introduzione');
  const mainImg = document.getElementById('mainImage');
  let currentIntro = 1;
  let isTransitioning = false;
  let lastRenderToken = 0;
  let hasRenderedOnce = false;

  // 'together': testo + immagini dissolvono insieme
  // 'images-first': prima dissolvenza immagini, poi testo (più "cinematografico" ma può avere micro-disallineamento per pochi ms)
  const INTRO_TRANSITION_MODE = 'together';

  // Lingua persistita in localStorage (bootstrap.js scrive subito il default=1)
  const idLingua = localStorage.getItem('linguaSelezionata') || '1';

  const continueHintFallbackByLingua = {
    '1': "Clicca sull'immagine per continuare",
    '2': 'Click the image to continue',
  };

  const continueAriaLabelFallbackByLingua = {
    '1': 'Continua',
    '2': 'Continue',
  };

  // Progressione step tramite click sulle immagini (niente bottone Continua)
  if (mainImg) {
    mainImg.tabIndex = 0;
    mainImg.setAttribute('role', 'button');
    mainImg.setAttribute('aria-label', continueAriaLabelFallbackByLingua[idLingua] || continueAriaLabelFallbackByLingua['1']);
    mainImg.title = '';
  }

  const continueHint = document.createElement('div');
  continueHint.id = 'continueHint';
  continueHint.className = 'continue-hint no-select';
  continueHint.textContent = continueHintFallbackByLingua['1'];

  function applyContinueHintText(messageText, ariaLabelText) {
    const hintFallback = continueHintFallbackByLingua[idLingua] || continueHintFallbackByLingua['1'];
    const hintText = String(messageText || hintFallback);

    const ariaFallback = continueAriaLabelFallbackByLingua[idLingua] || continueAriaLabelFallbackByLingua['1'];
    const ariaText = String(ariaLabelText || ariaFallback);

    continueHint.textContent = hintText;
    if (mainImg) {
      mainImg.title = hintText;
      mainImg.setAttribute('aria-label', ariaText);
    }
    dualImages.querySelectorAll('img').forEach((img) => {
      img.title = hintText;
      img.setAttribute('aria-label', ariaText);
    });
  }

  const introHtmlCache = new Map(); // id -> parsedHTML
  const introFetchCache = new Map(); // id -> Promise<parsedHTML>

  const dualImages = document.createElement('div');
  dualImages.id = 'dualImages';
  dualImages.className = 'dual-images is-hidden';
  dualImages.innerHTML = `
      <img class="dual-images__img" src="../images/Simon Wiesenthal.png" alt="Simon Wiesenthal" fetchpriority="low" tabindex="0" role="button" aria-label="" />
      <img class="dual-images__img" src="../images/1948 - Berlin map.png" alt="1948 - Berlin map" fetchpriority="low" tabindex="0" role="button" aria-label="" />
      `;
  if (mainImg && mainImg.parentNode) {
    mainImg.insertAdjacentElement('afterend', dualImages);
  }

  // UI hint i18n (non bloccante): se le API non sono accessibili (es. 401/403), resta il fallback.
  applyContinueHintText(null);
  fetch(window.basePath + 'api/frontend-messages/' + idLingua)
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((data) => {
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const hintRow = messages.find((m) => m?.Chiave === 'ui.hint.clickImageToContinue');
      const ariaRow = messages.find((m) => m?.Chiave === 'ui.aria.continue');
      applyContinueHintText(hintRow?.Messaggio, ariaRow?.Messaggio);
    })
    .catch(() => {
      // ignore
    });

  // Fetch e mostra il testo di introduzione ID=1 con leggero delay per uniformità
  setTimeout(() => {
    void renderIntroStep(1);
    prefetchIntroduzioni([2, 3]);
  }, 100);

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function waitForOpacityTransition(el, timeoutMs) {
    if (!el || prefersReducedMotion()) return Promise.resolve();

    const ms = Number(timeoutMs) || 260;
    return new Promise((resolve) => {
      let done = false;
      const onEnd = (e) => {
        if (done) return;
        if (e && e.target !== el) return;
        if (e && e.propertyName && e.propertyName !== 'opacity') return;
        done = true;
        cleanup();
        resolve();
      };

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      }, ms + 80);

      function cleanup() {
        clearTimeout(timer);
        el.removeEventListener('transitionend', onEnd);
      }

      el.addEventListener('transitionend', onEnd);
    });
  }

  function fetchIntroduzioneParsedHtml(id) {
    if (introHtmlCache.has(id)) {
      return Promise.resolve(introHtmlCache.get(id));
    }
    if (introFetchCache.has(id)) {
      return introFetchCache.get(id);
    }

    const p = fetch(window.basePath + 'api/introduzione?id=' + id + '&lingua=' + idLingua)
      .then((res) => res.json())
      .then((data) => {
        const testo = (data.testo || '').replace(/\\n/g, '\n');
        const parsedHTML = window.marked.parse(testo);
        introHtmlCache.set(id, parsedHTML);
        return parsedHTML;
      })
      .finally(() => {
        introFetchCache.delete(id);
      });

    introFetchCache.set(id, p);
    return p;
  }

  function prefetchIntroduzioni(ids) {
    ids.forEach((id) => {
      void fetchIntroduzioneParsedHtml(id).catch(() => {});
    });
  }

  function configureMainImageForStep(step) {
    if (!mainImg) return;
    if (step === 1) {
      mainImg.src = '../images/MissioneOdessa_intro.png';
      mainImg.alt = 'Missione Odessa';
      mainImg.fetchPriority = 'low';
    } else if (step === 3) {
      mainImg.src = '../images/Ferenc.png';
      mainImg.alt = 'Ferenc';
      mainImg.fetchPriority = 'low';
    }
  }

  function getVisualElementForStep(step) {
    return step === 2 ? dualImages : mainImg;
  }

  function applyVisualStepInstant(step) {
    if (!mainImg) return;

    if (step === 2) {
      ensureVisualConfiguredForStep(step);
      mainImg.classList.add('is-hidden');
      mainImg.classList.remove('is-fading');
      dualImages.classList.remove('is-hidden');
      dualImages.classList.remove('is-fading');
      return;
    }

    // step 1 o 3
    ensureVisualConfiguredForStep(step);
    dualImages.classList.add('is-hidden');
    dualImages.classList.remove('is-fading');
    mainImg.classList.remove('is-hidden');
    mainImg.classList.remove('is-fading');
  }

  function ensureVisualConfiguredForStep(step) {
    if (step === 1 || step === 3) {
      configureMainImageForStep(step);
    }
  }

  async function fadeOutElement(el) {
    if (!el || el.classList.contains('is-hidden')) return;
    el.classList.add('is-fading');
    await waitForOpacityTransition(el, 260);
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.add('is-hidden');
    el.classList.remove('is-fading');
  }

  function showElementWithFadeIn(el) {
    if (!el) return;
    // Importante: aggiungere is-fading prima di rimuovere is-hidden,
    // così l'elemento appare già a opacity:0 (niente flash).
    el.classList.add('is-fading');
    el.classList.remove('is-hidden');
    requestAnimationFrame(() => {
      el.classList.remove('is-fading');
    });
  }

  async function transitionVisualStep(fromStep, toStep) {
    if (!mainImg) return;

    // Nessuna animazione se rimane sullo stesso step
    if (fromStep === toStep) {
      applyVisualStepInstant(toStep);
      return;
    }

    const fromEl = getVisualElementForStep(fromStep);
    const toEl = getVisualElementForStep(toStep);

    if (fromEl === toEl) {
      await fadeOutElement(fromEl);
      ensureVisualConfiguredForStep(toStep);
      requestAnimationFrame(() => {
        fromEl.classList.remove('is-fading');
      });
      return;
    }

    await fadeOutElement(fromEl);
    hideElement(fromEl);

    // Configura e mostra il target
    ensureVisualConfiguredForStep(toStep);
    if (toEl === mainImg) {
      hideElement(dualImages);
    } else {
      hideElement(mainImg);
    }
    showElementWithFadeIn(toEl);
  }

  async function renderIntroStep(step) {
    if (!introduzioneDiv) return;
    if (isTransitioning) return;

    isTransitioning = true;
    const renderToken = ++lastRenderToken;
    const previousStep = currentIntro;
    const isStepChange = previousStep !== step;

    const hasExistingContent = Boolean(introduzioneDiv.textContent && introduzioneDiv.textContent.trim().length > 0);
    const htmlPromise = fetchIntroduzioneParsedHtml(step);

    try {
      // Primo caricamento: nessun fade. Il fade parte solo dal primo cambio step.
      if (!hasRenderedOnce || !isStepChange) {
        applyVisualStepInstant(step);
        currentIntro = step;
      } else {
        // Dissolvenza: puoi scegliere "images-first" oppure tutto insieme.
        if (INTRO_TRANSITION_MODE === 'images-first') {
          await transitionVisualStep(previousStep, step);
          if (hasExistingContent) {
            introduzioneDiv.classList.add('is-fading');
            await waitForOpacityTransition(introduzioneDiv, 260);
          }
        } else {
          // together (default): fade-out simultaneo
          const visualEl = getVisualElementForStep(previousStep);
          if (hasExistingContent) introduzioneDiv.classList.add('is-fading');
          if (visualEl && !visualEl.classList.contains('is-hidden')) visualEl.classList.add('is-fading');

          await Promise.all([
            hasExistingContent ? waitForOpacityTransition(introduzioneDiv, 260) : Promise.resolve(),
            visualEl && !visualEl.classList.contains('is-hidden') ? waitForOpacityTransition(visualEl, 260) : Promise.resolve(),
          ]);

          await transitionVisualStep(previousStep, step);
        }

        currentIntro = step;
      }

      const parsedHTML = await htmlPromise;
      if (renderToken !== lastRenderToken) return;

      introduzioneDiv.innerHTML = parsedHTML;
      introduzioneDiv.appendChild(continueHint);
      window.scrollTo(0, 0);

      // Fade-in
      if (hasRenderedOnce && isStepChange) {
        requestAnimationFrame(() => {
          introduzioneDiv.classList.remove('is-fading');
        });
      } else {
        introduzioneDiv.classList.remove('is-fading');
      }

      hasRenderedOnce = true;
    } catch (err) {
      console.error("Errore nel caricamento dell'introduzione:", err);
      // In caso di errore, evita di lasciare lo schermo vuoto
      introduzioneDiv.classList.remove('is-fading');
    } finally {
      if (renderToken === lastRenderToken) {
        isTransitioning = false;
      }
    }
  }

  function nextStage() {
    if (isTransitioning) return;
    if (currentIntro === 1) {
      void renderIntroStep(2);
      prefetchIntroduzioni([3]);
    } else if (currentIntro === 2) {
      void renderIntroStep(3);
    } else if (currentIntro === 3) {
      // Vai alla pagina principale
      window.location.href = window.basePath + 'web/odessa_main.html';
    }
  }

  if (mainImg) {
    mainImg.addEventListener('click', nextStage);
    mainImg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nextStage();
      }
    });
  }

  dualImages.addEventListener('click', nextStage);
  dualImages.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      nextStage();
    }
  });

  window.nextStage = nextStage;
});
