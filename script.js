// ============================
// Atajos $
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// ============================
// DOMContentLoaded principal
document.addEventListener('DOMContentLoaded', () => {

  // ============================
  // Variables principales
  const mainBackground = $('.main-background');
  const header = $('header');
  // Se unifican todos los enlaces de la SPA en un solo selector
  const allSpaLinks = $$('a[data-section], header nav a[href^="#"], .btn-mail[href="#contacto"]');
  const sections = $$('.section');
  const sectionById = Object.fromEntries(sections.map(s => [s.id, s]));
  const sectionOrder = ['home', 'destinos', 'resenas', 'surf-trips', 'contacto'];
  let currentId = location.hash?.replace('#', '') || 'home';
  let isAnimating = false;

  let destinosData = {};
  let translations = {};
  let currentLang = localStorage.getItem('lang') || 'es';

  // Agrega el subtítulo del header y los textos
  const headerSubtitle = $('#header-subtitle');
  const subtitleTexts = {
    'destinos': 'Nuestros Destinos',
    'resenas': 'Reseñas de Viajeros',
    'surf-trips': 'Explora un Surf Trip',
    'contacto': 'Contactanos',
  };

  // ============================
  // Funciones auxiliares
  function animateHeight(element, targetHeight, duration = 0.3) {
    const startHeight = element.offsetHeight;
    
    if (startHeight === 0) {
      element.style.height = targetHeight + 'px';
    } else {
      element.style.transition = 'none';
      element.style.height = startHeight + 'px';
      element.offsetHeight; // Forzar reflow
      element.style.transition = `height ${duration}s cubic-bezier(0.25,0.8,0.25,1)`;
      element.style.height = targetHeight + 'px';
    }
  }

  // Función para actualizar el subtítulo del header
  function updateHeaderSubtitle(sectionId) {
    if (sectionId === 'home') {
      header.classList.remove('has-subtitle');
      if (headerSubtitle) headerSubtitle.innerText = '';
    } else {
      header.classList.add('has-subtitle');
      if (headerSubtitle) headerSubtitle.innerText = subtitleTexts[sectionId] || '';
    }
  }

  // ============================
  // SPA: switchSection
  function switchSection(nextId) {
    if (isAnimating || nextId === currentId) return;
    const nextSection = sectionById[nextId];
    if (!nextSection) return;
    isAnimating = true;

    sections.forEach(s => s.classList.remove('active', 'prev', 'next'));
    sectionOrder.forEach((id, i) => {
      if (id === nextId) sectionById[id].classList.add('active');
      else sectionById[id].classList.add(i < sectionOrder.indexOf(nextId) ? 'prev' : 'next');
    });

    allSpaLinks.forEach(link => {
      const linkTarget = link.dataset.section || link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', linkTarget === nextId);
    });

    updateHeaderSubtitle(nextId);

    currentId = nextId;
    isAnimating = false;
    nextSection.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Inicializar SPA
  sections.forEach(s => s.classList.remove('active', 'prev', 'next'));
  if (sectionById[currentId]) sectionById[currentId].classList.add('active');
  updateHeaderSubtitle(currentId);

  // Unifica el manejo de los eventos de click para todos los enlaces de la SPA
  allSpaLinks.forEach(link => {
    const linkTarget = link.dataset.section || link.getAttribute('href').replace('#', '');
    link.classList.toggle('active', linkTarget === currentId);
    link.addEventListener('click', e => {
      e.preventDefault();
      history.pushState({ section: linkTarget }, '', `#${linkTarget}`);
      switchSection(linkTarget);
    });
  });

  window.addEventListener('popstate', e => {
    const targetId = e.state?.section || 'home';
    switchSection(targetId);
  });

  // ============================
  // Lazy Load imágenes
  function observeImages() {
    const lazyImages = $$('img.lazy:not(.loaded)');
    if ('IntersectionObserver' in window) {
      const lazyObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const temp = new Image();
            temp.src = img.dataset.src;
            temp.onload = () => { img.src = temp.src; img.classList.add('loaded'); };
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '150px' });
      lazyImages.forEach(img => lazyObserver.observe(img));
    } else {
      lazyImages.forEach(img => { img.src = img.dataset.src; img.classList.add('loaded'); });
    }
  }
  observeImages();

  // ============================
  // Carrusel Reseñas
  const carouselWrapper = $('#resenasCarousel');
  if (carouselWrapper) {
    const cards = Array.from(carouselWrapper.children);
    const track = document.createElement('div');
    track.style.display = 'flex';
    track.style.gap = '20px';
    track.style.width = 'max-content';
    cards.forEach(c => track.appendChild(c.cloneNode(true)));
    cards.forEach(c => track.appendChild(c.cloneNode(true)));
    carouselWrapper.innerHTML = '';
    carouselWrapper.appendChild(track);

    let posX = 0, speed = 0.7, isDragging = false, startX = 0, scrollStart = 0;

    function animate() {
      if (!isDragging) {
        posX -= speed;
        if (-posX >= track.scrollWidth / 2) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      requestAnimationFrame(animate);
    }
    animate();

    track.addEventListener('pointerdown', e => {
      isDragging = true;
      startX = e.clientX;
      scrollStart = posX;
      track.setPointerCapture(e.pointerId);
      carouselWrapper.style.cursor = 'grabbing';
    });
    track.addEventListener('pointermove', e => {
      if (!isDragging) return;
      posX = scrollStart + (e.clientX - startX);
      if (-posX >= track.scrollWidth / 2) posX += track.scrollWidth / 2;
      if (posX > 0) posX -= track.scrollWidth / 2;
      track.style.transform = `translateX(${posX}px)`;
    });
    track.addEventListener('pointerup', e => { isDragging = false; track.releasePointerCapture(e.pointerId); carouselWrapper.style.cursor = 'grab'; });
    track.addEventListener('pointerleave', () => { isDragging = false; carouselWrapper.style.cursor = 'grab'; });
    carouselWrapper.style.cursor = 'grab';
  }

  // ============================
  // Traducciones
  fetch('i18n.json').then(res => res.json()).then(data => { translations = data; applyTranslations(); });

  function applyTranslations() {
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[currentLang]?.[key]) el.innerHTML = translations[currentLang][key];
    });
    $$('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (translations[currentLang]?.[key]) el.placeholder = translations[currentLang][key];
    });
  }

  $$('.flag-btn').forEach(btn => btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem('lang', currentLang);
    applyTranslations();
  }));

  // ============================
  // Botón Contanos tu experiencia (mailto)
  // Se mantiene separado porque no es navegación SPA
  $('.btn-mail[href^="mailto:"]')?.addEventListener('click', e => { 
    e.preventDefault(); 
    window.location.href = 'mailto:info@cecilia-kovacs.com'; 
  });

  // ============================
  // EmailJS
  if (window.emailjs) {
    emailjs.init('Cq9PacH-N_N_hZ344');
    const contactoForm = $('.formulario-contacto');
    contactoForm?.addEventListener('submit', function(e) {
      e.preventDefault();
      emailjs.sendForm('service_v95fe07', 'template_nrxcwun', this)
        .then(() => { alert('Mensaje enviado correctamente 😊'); this.reset(); })
        .catch(err => { alert('Error al enviar el mensaje ❌'); console.error(err); });
    });
  }

  // ============================
  // Fetch y lógica del modal + Destinos desplegables
  fetch('destinos.json')
    .then(res => {
      if (!res.ok) throw new Error('No se pudo cargar destinos.json');
      return res.json();
    })
    .then(data => {
      destinosData = data;

      const modal = $('#destino-detalle');
      const detalleInner = $('.detalle-inner');
      const detalleTitulo = $('#detalle-titulo');
      const tabButtons = $$('.tab-btn');
      const tabContents = $$('.tab-content');
      const volverBtn = $('#volver-btn');

      function generarHTML(contentData) {
        if (!contentData || !contentData[currentLang]) {
          return '<p>Información no disponible para este idioma.</p>';
        }
        return contentData[currentLang];
      }
      
      // Función que actualiza el contenido y ajusta la altura del modal
      function updateModalContentAndHeight(destinoInfo) {
        tabContents.forEach(tc => { tc.innerHTML = ''; tc.classList.remove('active'); });
        tabButtons.forEach(tab => tab.classList.remove('active'));

        let firstTabActivated = false;
        const tabsData = [{ id: 'hospedaje', data: destinoInfo.hospedaje }, { id: 'tours', data: destinoInfo.tours }, { id: 'transfers', data: destinoInfo.transfers }];

        tabsData.forEach((tab, index) => {
          const htmlContent = generarHTML(tab.data);
          document.getElementById(tab.id).innerHTML = htmlContent;

          if (htmlContent.indexOf('Información no disponible') === -1 && !firstTabActivated) {
            tabButtons[index].classList.add('active');
            document.getElementById(tab.id).classList.add('active');
            firstTabActivated = true;
          }
        });

        if (!firstTabActivated) {
          document.getElementById('hospedaje').innerHTML = '<p>Información no disponible.</p>';
          tabButtons[0].classList.add('active');
          document.getElementById('hospedaje').classList.add('active');
        }

        const activeContent = document.querySelector(".tab-content.active");
        if (activeContent) {
          const headerHeight = detalleInner.querySelector(".modal-header").offsetHeight;
          const paddingBottom = 40; // Mayor padding para un mejor espacio
          const newHeight = activeContent.scrollHeight + headerHeight + paddingBottom;
          
          detalleInner.style.height = `${newHeight}px`;
        }
      }

      $$('.tour-card button').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.tour-card');
          const destinoName = card.dataset.destino;
          const destinoInfo = destinosData[destinoName];

          if (!destinoInfo) return alert('Sin información 😢');

          detalleTitulo.innerText = destinoName;
          updateModalContentAndHeight(destinoInfo);

          mainBackground.classList.add('blur-background');
          header.classList.add('blur-background');
          modal.classList.add('visible');
        });
      });

      volverBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
        mainBackground.classList.remove('blur-background');
        header.classList.remove('blur-background');
      });

      tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          const targetId = btn.dataset.tab;
          const newContent = document.getElementById(targetId);

          if (newContent.classList.contains("active")) return;

          tabButtons.forEach(b => b.classList.remove("active"));
          tabContents.forEach(c => c.classList.remove("active"));
          btn.classList.add("active");
          newContent.classList.add("active");

          const headerHeight = detalleInner.querySelector(".modal-header").offsetHeight;
          const paddingBottom = 40; // Mayor padding para un mejor espacio
          const newHeight = newContent.scrollHeight + headerHeight + paddingBottom;
          animateHeight(detalleInner, newHeight);
        });
      });

      // El ResizeObserver ahora se encargará de cualquier cambio posterior
      const resizeObserver = new ResizeObserver(() => {
        const activeContent = document.querySelector(".tab-content.active");
        if (!activeContent) return;
        const headerHeight = detalleInner.querySelector(".modal-header").offsetHeight;
        const paddingBottom = 40; // Mayor padding para un mejor espacio
        const newHeight = activeContent.scrollHeight + headerHeight + paddingBottom;
        animateHeight(detalleInner, newHeight);
      });
      resizeObserver.observe(detalleInner);

      $$('.flag-btn').forEach(btn => btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        localStorage.setItem('lang', currentLang);
        applyTranslations();
        if (modal.classList.contains('visible')) {
          const destinoName = detalleTitulo.innerText;
          const destinoInfo = destinosData[destinoName];
          if (destinoInfo) {
            updateModalContentAndHeight(destinoInfo);
          }
        }
      }));
    })
    .catch(err => {
      console.error('Error cargando destinos:', err);
      alert('No se pudo cargar la información de los destinos.');
    });

  // ============================
  // Destinos desplegables (Accordion)
  const destinos = document.querySelectorAll('.destino');
  destinos.forEach(destino => {
    const contenido = destino.querySelector('.contenido');

    // Inicializar cerrados
    contenido.style.height = '0px';
    contenido.style.overflow = 'hidden';
    contenido.style.opacity = '0';
    contenido.style.transition = 'height 0.25s ease, opacity 0.25s ease';

    destino.addEventListener('click', () => {
      const isOpen = contenido.offsetHeight > 0;

      destinos.forEach(otherDestino => {
        const otherContenido = otherDestino.querySelector('.contenido');
        if (otherContenido !== contenido && otherContenido.offsetHeight > 0) {
          otherContenido.style.height = '0px';
          otherContenido.style.opacity = '0';
        }
      });

      if (!isOpen) {
        const paddingBottom = 20; // Espacio extra para que el texto respire
        const fullHeight = contenido.scrollHeight + paddingBottom;
        contenido.style.height = fullHeight + 'px';
        contenido.style.opacity = '1';
      } else {
        contenido.style.height = '0px';
        contenido.style.opacity = '0';
      }
    });
  });
});
