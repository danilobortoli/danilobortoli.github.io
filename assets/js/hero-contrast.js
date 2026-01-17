(function() {
  'use strict';

  function analyzeHeroImage() {
    var hero = document.querySelector('.post-hero');
    if (!hero) return;

    var heroImage = hero.querySelector('.post-hero-image');
    if (!heroImage) return;

    var style = window.getComputedStyle(heroImage);
    var bgImage = style.backgroundImage;

    // Extrair URL da imagem
    var match = bgImage.match(/url\(["']?(.+?)["']?\)/);
    if (!match) return;

    var imageUrl = match[1];

    var img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = function() {
      var brightness = getBottomBrightness(img);

      // Se a luminosidade for alta (imagem clara), usar texto escuro
      if (brightness > 140) {
        hero.classList.add('hero-light-bg');
      }
    };

    img.onerror = function() {
      // Se falhar ao carregar, manter o padrão (texto branco)
      console.log('Hero contrast: could not analyze image');
    };

    img.src = imageUrl;
  }

  function getBottomBrightness(img) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // Usar tamanho reduzido para performance
    var width = Math.min(img.width, 100);
    var height = Math.min(img.height, 100);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    // Analisar apenas a parte inferior (onde fica o texto)
    var bottomHeight = Math.floor(height * 0.4); // 40% inferior
    var startY = height - bottomHeight;

    var imageData = ctx.getImageData(0, startY, width, bottomHeight);
    var data = imageData.data;

    var totalBrightness = 0;
    var pixelCount = 0;

    // Calcular luminosidade média (fórmula de luminância percebida)
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];

      // Fórmula de luminância: 0.299*R + 0.587*G + 0.114*B
      var brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      pixelCount++;
    }

    return totalBrightness / pixelCount;
  }

  // Executar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', analyzeHeroImage);
  } else {
    analyzeHeroImage();
  }
})();
