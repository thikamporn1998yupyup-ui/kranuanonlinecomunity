
/* Kranuan Online — Public CMS */
(() => {
  'use strict';

  let config = null;
  let scheduled = false;

  const categories = [
    'อาหาร', 'เครื่องดื่ม', 'บริการ', 'ตลาด', 'เรียกไรเดอร์'
  ];

  
function safeImage(src) {
  if (typeof src !== 'string') return '';

  if (src.startsWith('https://')) return src;

  if (/^\/api\/site-cms\/image\/[a-f0-9-]{36}$/.test(src)) {
    return src;
  }

  return '';
}


  function apply() {
    if (!config) return;

    const name = document.querySelector(
      '.brandline .brand-left strong'
    );

    if (name && config.brand_name) {
      name.textContent = config.brand_name;
    }

    const logo = document.querySelector('.brandline img.logo');
    const logoUrl = safeImage(config.logo);

    if (logo && logoUrl && logo.getAttribute('src') !== logoUrl) {
      logo.onerror = null;
      logo.src = logoUrl;
    }

    const key =
      typeof currentHeroKey !== 'undefined' && currentHeroKey
        ? currentHeroKey
        : 'welcome';

    const hero = config.heroes?.[key] || {};

    const scene = document.querySelector(
      '#heroScenes .hero-scene:last-child img'
    );

    const heroImage = safeImage(hero.image);

    if (scene && heroImage &&
        scene.getAttribute('src') !== heroImage) {
      scene.src = heroImage;
    }

    const root = document.getElementById('topHeroSection');

    if (root) {
      const title = root.querySelector('h1');
      const description = root.querySelector('p');
      const kicker = root.querySelector('.hero-kicker');

      if (title && hero.title) title.textContent = hero.title;
      if (description && hero.desc) {
        description.textContent = hero.desc;
      }
      if (kicker && hero.kicker) {
        kicker.textContent = hero.kicker;
      }
    }

    const buttons = document.querySelectorAll(
    '.categories .category[data-cms-category]'
    );

    buttons.forEach(button => {
      const item = config.icons?.[button.dataset.cmsCategory];

      if (!item) return;

      const label = Array.from(button.childNodes).find(
        node => node.nodeType === 3 && node.textContent.trim()
      );

      if (label && item.label) {
        label.textContent = item.label;
      }

      const span = button.querySelector('span');
      const imageUrl = safeImage(item.image);

      if (!span || !imageUrl) return;

      let img = span.querySelector('img.cms-icon');

      if (!img) {
        span.replaceChildren();

        img = document.createElement('img');
        img.className = 'cms-icon';
        img.alt = '';
        img.style.cssText =
          'width:65%;height:65%;object-fit:contain';

        span.append(img);
      }

      if (img.getAttribute('src') !== imageUrl) {
        img.src = imageUrl;
      }
    });
  }

  function schedule() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

const isPreview = new URLSearchParams(
  window.location.search
).get('cms_preview') === '1';

let previewSettings = null;

if (isPreview) {
  try {
    previewSettings = JSON.parse(
      sessionStorage.getItem('kranuan.cms.preview') || 'null'
    );
  } catch (err) {
    console.warn('CMS Preview:', err);
  }

  sessionStorage.removeItem('kranuan.cms.preview');
}

const cmsSource = isPreview
  ? Promise.resolve({ settings: previewSettings })
  : fetch('/api/site-cms', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null);

cmsSource

    .then(data => {
      if (!data?.settings) return;

      config = data.settings;
      apply();

      const header = document.getElementById('mainHeader');
      const app = document.getElementById('app');

      if (header) {
        new MutationObserver(schedule).observe(header, {
          childList: true,
          subtree: true
        });
      }

      if (app) {
        new MutationObserver(schedule).observe(app, {
          childList: true,
          subtree: true
        });
      }
    })
    .catch(error => {
      console.warn('CMS defaults active:', error.message);
    });
})();
