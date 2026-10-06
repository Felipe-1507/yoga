(function () {
  'use strict';
  var config = window.YOGA_CONFIG || {};
  var carousel = document.getElementById('amostras');
  var dots = document.getElementById('dots');
  var slides = Array.from(carousel.children);
  var previous = document.getElementById('amostraAnterior');
  var next = document.getElementById('amostraProxima');
  var pauseButton = document.getElementById('amostraPausa');
  var active = 0;
  var targetIndex = null;
  var scrollTimer;
  var drag = null;
  var autoplayTimer;
  var userPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hovered = false;
  var focused = false;
  var visible = false;
  function slidePosition(index) {
    var viewport = carousel.getBoundingClientRect();
    var slide = slides[index].getBoundingClientRect();
    var inset = parseFloat(window.getComputedStyle(carousel).paddingLeft) || 0;
    var desired = carousel.scrollLeft + slide.left - viewport.left - inset;
    return Math.max(0, Math.min(carousel.scrollWidth - carousel.clientWidth, desired));
  }
  function updateDots() {
    var nearest = 0, distance = Infinity;
    slides.forEach(function (slide, i) {
      var delta = Math.abs(carousel.scrollLeft - slidePosition(i));
      if (delta < distance) { distance = delta; nearest = i; }
    });
    active = nearest;
    Array.from(dots.children).forEach(function (dot, i) {
      dot.classList.toggle('on', i === active);
      if (i === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
  }
  function goTo(index) {
    targetIndex = Math.max(0, Math.min(slides.length - 1, index));
    // Muda a posição imediatamente para evitar conflitos entre animação e scroll-snap.
    carousel.scrollTo({ left: slidePosition(targetIndex), behavior: 'auto' });
    updateDots();
    restartAutoplay();
  }
  slides.forEach(function (slide, i) {
    slide.draggable = false;
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Ver amostra ' + (i + 1));
    dot.setAttribute('aria-controls', 'amostras');
    dot.addEventListener('click', function () { goTo(i); });
    dots.appendChild(dot);
  });
  previous.addEventListener('click', function () { goTo((targetIndex === null ? active : targetIndex) - 1); });
  next.addEventListener('click', function () { goTo((targetIndex === null ? active : targetIndex) + 1); });
  carousel.addEventListener('scroll', function () {
    updateDots();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { targetIndex = null; }, 150);
  }, { passive: true });
  carousel.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo((targetIndex === null ? active : targetIndex) + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // Em dispositivos táteis mantém-se o scroll nativo; no computador é possível arrastar horizontalmente.
  carousel.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    event.preventDefault();
    targetIndex = null;
    drag = { id: event.pointerId, x: event.clientX, left: carousel.scrollLeft, index: active };
    clearInterval(autoplayTimer);
    carousel.classList.add('dragging');
    carousel.setPointerCapture(event.pointerId);
  });
  carousel.addEventListener('pointermove', function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    carousel.scrollLeft = drag.left - (event.clientX - drag.x);
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    var displacement = carousel.scrollLeft - drag.left;
    var destination = drag.index;
    if (Math.abs(displacement) >= 40) destination += displacement > 0 ? 1 : -1;
    drag = null;
    carousel.classList.remove('dragging');
    goTo(destination);
  }
  carousel.addEventListener('pointerup', finishDrag);
  carousel.addEventListener('pointercancel', finishDrag);
  carousel.addEventListener('lostpointercapture', finishDrag);
  window.addEventListener('resize', function () { targetIndex = null; updateDots(); });
  updateDots();
  function restartAutoplay() {
    clearInterval(autoplayTimer);
    if (userPaused || hovered || focused || drag || document.hidden || !visible) return;
    autoplayTimer = setInterval(function () {
      goTo(active === slides.length - 1 ? 0 : active + 1);
    }, 4500);
  }
  function updatePauseButton() {
    pauseButton.textContent = userPaused ? 'Retomar passagem automática' : 'Pausar passagem automática';
    pauseButton.setAttribute('aria-pressed', String(userPaused));
  }
  pauseButton.addEventListener('click', function () {
    userPaused = !userPaused;
    updatePauseButton();
    restartAutoplay();
  });
  var carouselArea = document.getElementById('amostrasArea');
  carouselArea.addEventListener('mouseenter', function () { hovered = true; restartAutoplay(); });
  carouselArea.addEventListener('mouseleave', function () { hovered = false; restartAutoplay(); });
  carouselArea.addEventListener('focusin', function () { focused = true; restartAutoplay(); });
  carouselArea.addEventListener('focusout', function (event) {
    focused = carouselArea.contains(event.relatedTarget);
    restartAutoplay();
  });
  document.addEventListener('visibilitychange', restartAutoplay);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      restartAutoplay();
    }, { threshold: 0.15 }).observe(carousel);
  } else {
    visible = true;
    restartAutoplay();
  }
  updatePauseButton();
  document.getElementById('ano').textContent = new Date().getFullYear();
  var offers = {
    principal: { price: config.precoPrincipal, link: config.checkoutPrincipal, element: 'precoPrincipal' },
    completo: { price: config.precoCompleto, link: config.checkoutCompleto, element: 'precoCompleto' },
    popup: { price: config.precoPopup, link: config.checkoutPopup }
  };
  var popup = document.getElementById('pop');
  var trigger = document.getElementById('btnBasico');
  var closeButton = document.getElementById('popX');
  var previousOverflow;
  function closePopup() {
    if (popup.hidden) return;
    popup.classList.remove('on');
    popup.hidden = true;
    document.body.style.overflow = previousOverflow;
    trigger.focus();
  }
  Object.keys(offers).forEach(function (key) {
    var offer = offers[key];
    if (offer.price) {
      if (offer.element) document.getElementById(offer.element).textContent = offer.price;
      document.querySelectorAll('[data-price="' + key + '"]').forEach(function (element) { element.textContent = offer.price; });
    }
    var checkout;
    try {
      var url = new URL(offer.link);
      if (url.protocol === 'https:' && (url.hostname === 'hotmart.com' || url.hostname.endsWith('.hotmart.com'))) checkout = url.href;
    } catch (error) { /* A oferta aguarda um link de pagamento válido. */ }
    document.querySelectorAll('[data-checkout="' + key + '"]').forEach(function (button) {
      if (checkout) button.href = checkout;
      // O botão do produto principal abre a oferta especial antes de seguir para o checkout.
      if (button === trigger) return;
      button.addEventListener('click', function () {
        closePopup();
        if (!checkout) document.getElementById('checkout-status').textContent = 'As vendas desta opção estarão disponíveis em breve. Volte mais tarde para verificar a disponibilidade.';
      });
    });
  });
  trigger.addEventListener('click', function (event) {
    event.preventDefault();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    popup.hidden = false;
    popup.classList.add('on');
    closeButton.focus();
  });
  closeButton.addEventListener('click', closePopup);
  popup.addEventListener('click', function (event) { if (event.target === popup) closePopup(); });
  document.addEventListener('keydown', function (event) {
    if (popup.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closePopup(); }
    if (event.key === 'Tab') {
      var controls = Array.from(popup.querySelectorAll('button, a[href]'));
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}());
