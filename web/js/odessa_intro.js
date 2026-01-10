document.addEventListener('DOMContentLoaded', () => {
  const introduzioneDiv = document.getElementById('introduzione');
  const mainImg = document.getElementById('mainImage');
  let currentIntro = 1;

  // Progressione step tramite click sulle immagini (niente bottone Continua)
  if (mainImg) {
    mainImg.tabIndex = 0;
    mainImg.setAttribute('role', 'button');
    mainImg.setAttribute('aria-label', 'Continua');
    mainImg.title = "Clicca sull'immagine per continuare";
  }

  const continueHint = document.createElement('div');
  continueHint.className = 'continue-hint no-select';
  continueHint.textContent = "Clicca sull'immagine per continuare";

  // Funzione per leggere parametri URL
  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  // Legge idLingua da URL, localStorage o default a 1
  const idLingua = getQueryParam('idLingua') || localStorage.getItem('linguaSelezionata') || '1';

  const introHtmlCache = new Map(); // id -> parsedHTML
  const introFetchCache = new Map(); // id -> Promise<parsedHTML>

  const dualImages = document.createElement('div');
  dualImages.id = 'dualImages';
  dualImages.className = 'dual-images is-hidden';
  dualImages.innerHTML = `
        <img class="dual-images__img" src="../images/Simon Wiesenthal.png" alt="Simon Wiesenthal" fetchpriority="low" tabindex="0" role="button" aria-label="Continua" title="Clicca sull'immagine per continuare" />
        <img class="dual-images__img" src="../images/1948 - Berlin map.png" alt="1948 - Berlin map" fetchpriority="low" tabindex="0" role="button" aria-label="Continua" title="Clicca sull'immagine per continuare" />
      `;
  if (mainImg && mainImg.parentNode) {
    mainImg.insertAdjacentElement('afterend', dualImages);
  }

  // Fetch e mostra il testo di introduzione ID=1 con leggero delay per uniformità
  setTimeout(() => {
    renderIntroStep(1);
    prefetchIntroduzioni([2, 3]);
  }, 100);

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

  function applyVisualStep(step) {
    if (!mainImg) return;

    if (step === 1) {
      mainImg.src = '../images/MissioneOdessa_intro.png';
      mainImg.alt = 'Missione Odessa';
      mainImg.fetchPriority = 'low';
      mainImg.classList.remove('is-hidden');
      dualImages.classList.add('is-hidden');
    } else if (step === 2) {
      mainImg.classList.add('is-hidden');
      dualImages.classList.remove('is-hidden');
    } else if (step === 3) {
      dualImages.classList.add('is-hidden');
      mainImg.src = '../images/Ferenc.png';
      mainImg.alt = 'Ferenc';
      mainImg.fetchPriority = 'low';
      mainImg.classList.remove('is-hidden');
    }
  }

  function renderIntroStep(step) {
    currentIntro = step;
    applyVisualStep(step);

    introduzioneDiv.classList.add('is-loading');
    fetchIntroduzioneParsedHtml(step)
      .then((parsedHTML) => {
        // Nessun fading: nascondo via visibility per ridurre flicker
        setTimeout(() => {
          introduzioneDiv.innerHTML = parsedHTML;
          introduzioneDiv.appendChild(continueHint);
          introduzioneDiv.classList.remove('is-loading');
          window.scrollTo(0, 0);
        }, 10);
      })
      .catch((err) => {
        introduzioneDiv.classList.remove('is-loading');
        console.error("Errore nel caricamento dell'introduzione:", err);
      });
  }

  function nextStage() {
    if (currentIntro === 1) {
      renderIntroStep(2);
      prefetchIntroduzioni([3]);
    } else if (currentIntro === 2) {
      renderIntroStep(3);
    } else if (currentIntro === 3) {
      // Vai alla pagina principale
      window.location.href = window.basePath + 'web/odessa_main.html' + window.location.search;
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
