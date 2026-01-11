/* eslint-env browser */

document.addEventListener('DOMContentLoaded', () => {
  const testo1El = document.getElementById('storiaTesto1');
  const testo2El = document.getElementById('storiaTesto2');
  const documentiLabelEl = document.getElementById('documentiLabel');
  const linksLabelEl = document.getElementById('linksLabel');
  const autoreLineEl = document.getElementById('autoreLine');
  const genereLineEl = document.getElementById('genereLine');
  const piattaformaLineEl = document.getElementById('piattaformaLine');
  const continueHintEl = document.getElementById('continueHint');
  const continueImageLinkEl = document.getElementById('continueImageLink');
  const heroImageEl = continueImageLinkEl?.querySelector('img') || null;

  if (!testo1El || !testo2El) return;

  function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  const idLingua = getQueryParam('idLingua') || localStorage.getItem('linguaSelezionata') || '1';

  function applyContinueLinkHref() {
    if (!continueImageLinkEl) return;

    const params = new URLSearchParams(window.location.search);
    params.set('idLingua', idLingua);

    const basePath = typeof window.basePath === 'string' ? window.basePath : '';
    const qs = params.toString();
    const href = basePath + 'web/odessa_intro.html' + (qs ? '?' + qs : '');
    continueImageLinkEl.setAttribute('href', href);
  }

  applyContinueLinkHref();

  const continueHintFallbackByLingua = {
    '1': "Clicca sull'immagine per continuare",
    '2': 'Click the image to continue',
  };

  function applyContinueHintText(messageText) {
    if (!continueHintEl) return;
    const fallback = continueHintFallbackByLingua[idLingua] || continueHintFallbackByLingua['1'];
    continueHintEl.textContent = String(messageText || fallback);

    const hintText = String(messageText || fallback);
    if (continueImageLinkEl) {
      continueImageLinkEl.setAttribute('aria-label', hintText);
      continueImageLinkEl.title = hintText;
    }
    if (heroImageEl) {
      heroImageEl.title = hintText;
    }
  }

  const fallbackByLingua = {
    '1': {
      testo1:
        "Missione Odessa è un classico gioco di avventura testuale (text adventure), pubblicato da Jackson Editore nel 1986, nella collana Jackson Soft Adventure, che ti catapulta in una missione di spionaggio nella città di Berlino, in una tipica ambientazione di guerra fredda. Devono essere risolti enigmi e trovare oggetti per completare l'obiettivo, restando attenti e all'erta. L'esperienza di gioco è basata interamente sulla lettura e digitazione di comandi, molto popolare per l'epoca. È un pezzo di storia dei videogiochi retrò, scaricabile e giocabile oggi tramite emulatori.",
      testo2:
        "State per giocare ad una delle più belle avventure testuali per Commodore 64.\n\nHo deciso di rigiocarlo esattamente trent'anni dopo la sua uscita; sì è così, quest'anno Missione Odessa compie trent'anni!\n\nPer facilitare la soluzione di Missione Odessa stiliamo una lista di tutti i verbi utilizzati:\n\naccendi, apri, attacca, carica, chiudi, colpisci, dai, dormi, esamina, gira, guarda, infila, introduci, lascia, leggi, muovi, osserva, picchia, pigia, porgi, posa, premi, prendi, rispondi, ruota, sali, scappa, scarica, scava, scendi, schiaccia, siediti, sorridi, spegni, sposta, uccidi.\n\nCi sono anche: carica o load e salva o save per salvare o caricare lo stato del gioco.\n\nInfatti, una delle difficoltà maggiori in questo tipo di avventure è capire quali sono le parole e i verbi 'compresi' dal nostro amico computer.\n\nE ora che li conoscete potete provare a giocare senza leggere le prossime pagine.",
      labelLinks: '**Links:**',
      labelDocumenti: '**Documenti (PDF):**',
      autoreLine: '**Autore:** Paolo Giorgi (con il contributo di Mauro Giorgi e Enrico Colombini)',
      genereLine: '**Genere:** Avventura testuale, spionaggio, Guerra Fredda.',
      piattaformaLine: '**Piattaforma:** Commodore 64/128, ZX Spectrum.',
    },
    '2': {
      testo1:
        'Missione Odessa is a classic text-adventure game, published by Jackson Editore in 1986 as part of the Jackson Soft Adventure series. It throws you into a spy mission in Berlin, in a typical Cold War setting. You must solve puzzles and find items to complete your objective, staying alert and careful. The gameplay experience is based entirely on reading and typing commands, a very popular format at the time. It is a piece of retro videogame history that can still be downloaded and played today through emulators.',
      testo2:
        "You are about to play one of the finest text adventures for the Commodore 64.\n\nI decided to play it again exactly thirty years after its release; yes, that's right: this year Missione Odessa turns thirty!\n\nTo make solving Missione Odessa easier, let's compile a list of all the verbs used:\n\naccendi, apri, attacca, carica, chiudi, colpisci, dai, dormi, esamina, gira, guarda, infila, introduci, lascia, leggi, muovi, osserva, picchia, pigia, porgi, posa, premi, prendi, rispondi, ruota, sali, scappa, scarica, scava, scendi, schiaccia, siediti, sorridi, spegni, sposta, uccidi.\n\nThere are also: carica or load and salva or save to save or load the game state.\n\nIn fact, one of the biggest difficulties in this kind of adventure is figuring out which words and verbs our friendly computer actually understands.\n\nAnd now that you know them, you can try playing without reading the next pages.",
      labelLinks: '**Links:**',
      labelDocumenti: '**Documents (PDF):**',
      autoreLine: '**Author:** Paolo Giorgi (with contributions by Mauro Giorgi and Enrico Colombini)',
      genereLine: '**Genre:** Text adventure, espionage, Cold War.',
      piattaformaLine: '**Platform:** Commodore 64/128, ZX Spectrum.',
    },
  };

  function renderText(el, markdownText) {
    const text = String(markdownText || '').replace(/\\n/g, '\n');
    if (window.marked && typeof window.marked.parse === 'function') {
      el.innerHTML = window.marked.parse(text);
      return;
    }
    el.textContent = text;
  }

  function renderInlineMarkdown(el, markdownText) {
    const text = String(markdownText || '').replace(/\\n/g, '\n');
    if (window.marked) {
      if (typeof window.marked.parseInline === 'function') {
        el.innerHTML = window.marked.parseInline(text);
        return;
      }
      if (typeof window.marked.parse === 'function') {
        const html = String(window.marked.parse(text) || '');
        el.innerHTML = html.replace(/^<p>/i, '').replace(/<\/p>\s*$/i, '');
        return;
      }
    }
    el.textContent = text;
  }

  function applyStoriaPayload(payload) {
    const fallback = fallbackByLingua[idLingua] || fallbackByLingua['1'];
    const testo1 = payload?.testo1 || fallback.testo1;
    const testo2 = payload?.testo2 || fallback.testo2;
    const labelLinks = payload?.labelLinks || fallback.labelLinks;
    const labelDocumenti = payload?.labelDocumenti || fallback.labelDocumenti;
    const autoreLine = payload?.autoreLine || fallback.autoreLine;
    const genereLine = payload?.genereLine || fallback.genereLine;
    const piattaformaLine = payload?.piattaformaLine || fallback.piattaformaLine;

    renderText(testo1El, testo1);
    renderText(testo2El, testo2);

    if (linksLabelEl) renderInlineMarkdown(linksLabelEl, labelLinks);
    if (documentiLabelEl) renderInlineMarkdown(documentiLabelEl, labelDocumenti);
    if (autoreLineEl) renderInlineMarkdown(autoreLineEl, autoreLine);
    if (genereLineEl) renderInlineMarkdown(genereLineEl, genereLine);
    if (piattaformaLineEl) renderInlineMarkdown(piattaformaLineEl, piattaformaLine);
  }

  // UI message i18n (non bloccante): se le API non sono accessibili (es. 401/403), resta il fallback.
  applyContinueHintText(null);
  fetch(window.basePath + 'api/frontend-messages/' + idLingua)
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((data) => {
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const row = messages.find((m) => m?.Chiave === 'ui.hint.clickImageToContinue');
      if (row?.Messaggio) applyContinueHintText(row.Messaggio);
    })
    .catch(() => {
      // ignore
    });

  fetch(window.basePath + 'api/storia?id=1&lingua=' + idLingua)
    .then((res) => {
      if (!res.ok) {
        // Es. 401/403 se auth API è attiva: usa fallback statico.
        console.warn('Storia API non disponibile:', res.status, res.statusText);
        applyStoriaPayload(null);
        return null;
      }
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      const hasAnyContent =
        Boolean(data?.testo1 && String(data.testo1).trim()) ||
        Boolean(data?.testo2 && String(data.testo2).trim()) ||
        Boolean(data?.labelLinks && String(data.labelLinks).trim()) ||
        Boolean(data?.labelDocumenti && String(data.labelDocumenti).trim()) ||
        Boolean(data?.autoreLine && String(data.autoreLine).trim()) ||
        Boolean(data?.genereLine && String(data.genereLine).trim()) ||
        Boolean(data?.piattaformaLine && String(data.piattaformaLine).trim());

      if (!hasAnyContent) {
        applyStoriaPayload(null);
        return;
      }

      applyStoriaPayload(data);
    })
    .catch((err) => {
      console.error('Errore nel caricamento della storia:', err);
      applyStoriaPayload(null);
    });
});
