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
  const navLinks = $$('a[data-section], header nav a[href^="#"]');
  const sections = $$('.section');
  const sectionById = Object.fromEntries(sections.map(s => [s.id, s]));
  const sectionOrder = ['home', 'destinos', 'resenas', 'surf-trips', 'contacto'];
  let currentId = location.hash?.replace('#', '') || 'home';
  let isAnimating = false;

  let destinosData = {};
  let translations = {};
  let currentLang = localStorage.getItem('lang') || 'es';

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

    navLinks.forEach(link => {
      const linkTarget = link.dataset.section || link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', linkTarget === nextId);
    });

    currentId = nextId;
    isAnimating = false;
    nextSection.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Inicializar SPA
  sections.forEach(s => s.classList.remove('active', 'prev', 'next'));
  if (sectionById[currentId]) sectionById[currentId].classList.add('active');

  navLinks.forEach(link => {
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
  // Botón Contanos tu experiencia
  $('.btn-mail')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'mailto:info@cecilia-kovacs.com'; });

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
// Fetch y lógica del modal
fetch('destinos.json')
  .then(res => {
    if (!res.ok) throw new Error('No se pudo cargar destinos.json');
    return res.json();
  })
  .then(data => {
    destinosData = data; 
    
    const modal = $('#destino-detalle');
    const detalleTitulo = $('#detalle-titulo');
    const tabs = $$('.tab-btn');
    const tabContents = $$('.tab-content');
    const volverBtn = $('#volver-btn');

    // Función para generar el HTML correcto
    function generarHTML(contentData) {
      if (!contentData || !contentData[currentLang]) {
        return '<p>Información no disponible para este idioma.</p>';
      }
      return contentData[currentLang];
    }

    $$('.tour-card button').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.tour-card');
        const destinoName = card.dataset.destino;
        const destinoInfo = destinosData[destinoName];

        if (!destinoInfo) return alert('Sin información 😢');

        detalleTitulo.innerText = destinoName;

        tabContents.forEach(tc => { tc.innerHTML = ''; tc.classList.remove('active'); });
        tabs.forEach(tab => tab.classList.remove('active'));

        let firstTabActivated = false;
        const tabsContent = [
          { id: 'hospedaje', data: destinoInfo.hospedaje },
          { id: 'tours', data: destinoInfo.tours },
          { id: 'transfers', data: destinoInfo.transfers }
        ];

        tabsContent.forEach((tab, index) => {
          const htmlContent = generarHTML(tab.data);
          document.getElementById(tab.id).innerHTML = htmlContent;

          if (htmlContent.indexOf('Información no disponible') === -1) {
            if (!firstTabActivated) { 
              tabs[index].classList.add('active'); 
              document.getElementById(tab.id).classList.add('active');
              firstTabActivated = true;
            }
          }
        });

        if (!firstTabActivated) {
          document.getElementById('hospedaje').innerHTML = '<p>Información no disponible.</p>';
          tabs[0].classList.add('active');
          document.getElementById('hospedaje').classList.add('active');
        }

        // Aquí es donde aplicas el efecto de desenfoque y muestras el modal
        mainBackground.classList.add('blur-background');
        header.classList.add('blur-background');
        modal.classList.add('visible');
      });
    });

    volverBtn.addEventListener('click', () => {
      // Al cerrar el modal, se quita el efecto y la visibilidad
      modal.classList.remove('visible');
      mainBackground.classList.remove('blur-background');
      header.classList.remove('blur-background');
    });

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
    
    // La función para el cambio de idioma también debe actualizar el modal si está abierto
    $$('.flag-btn').forEach(btn => btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      localStorage.setItem('lang', currentLang);
      applyTranslations();
      
      // Si el modal está abierto, actualiza su contenido
      if(modal.classList.contains('visible')) {
        const destinoName = detalleTitulo.innerText;
        const destinoInfo = destinosData[destinoName];
        if(destinoInfo) {
          tabsContent.forEach(tab => {
            const htmlContent = generarHTML(tab.data);
            document.getElementById(tab.id).innerHTML = htmlContent;
          });
        }
      }
    }));
  })
  .catch(err => {
    console.error('Error cargando destinos:', err);
    alert('No se pudo cargar la información de los destinos.');
  });


});
