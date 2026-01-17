(function() {
  'use strict';

  function analyzeHeroImage() {
    var hero = document.querySelector('.post-hero');
    if (!hero) return;

    var heroImage = hero.querySelector('.post-hero-image');
    if (!heroImage) return;

    var style = window.getComputedStyle(heroImage);
    var bgImage = style.backgroundImage;

    var match = bgImage.match(/url\(["']?(.+?)["']?\)/);
    if (!match) return;

    var imageUrl = match[1];

    // Tentar carregar a imagem e analisar
    loadAndAnalyze(imageUrl, hero);
  }

  function loadAndAnalyze(imageUrl, hero) {
    var img = new Image();

    img.onload = function() {
      try {
        var brightness = getBottomBrightness(img);
        console.log('Hero contrast: brightness =', brightness);

        if (brightness > 130) {
          hero.classList.add('hero-light-bg');
          console.log('Hero contrast: imagem clara detectada');
        } else {
          console.log('Hero contrast: imagem escura detectada');
        }
      } catch (e) {
        console.log('Hero contrast: erro ao analisar -', e.message);
      }
    };

    img.onerror = function() {
      console.log('Hero contrast: erro ao carregar imagem');
    };

    // Para imagens do mesmo domínio, não precisa de crossOrigin
    // Isso evita problemas de CORS em alguns servidores
    if (imageUrl.startsWith('/') || imageUrl.startsWith(window.location.origin)) {
      img.src = imageUrl;
    } else {
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    }
  }

  function getBottomBrightness(img) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    var width = Math.min(img.width, 150);
    var height = Math.min(img.height, 150);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    // Analisar 50% inferior (onde fica o texto)
    var bottomHeight = Math.floor(height * 0.5);
    var startY = height - bottomHeight;

    var imageData = ctx.getImageData(0, startY, width, bottomHeight);
    var data = imageData.data;

    var totalBrightness = 0;
    var pixelCount = 0;

    for (var i = 0; i < data.length; i += 4) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];

      var brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      pixelCount++;
    }

    return totalBrightness / pixelCount;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', analyzeHeroImage);
  } else {
    analyzeHeroImage();
  }
})();
