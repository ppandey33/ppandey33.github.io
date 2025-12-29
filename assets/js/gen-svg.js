import { HideComponent } from "./hide-component.js";
class GenSvg extends HideComponent {
  constructor(superOptions = {}) {
    super(superOptions);
    this.options = {
      fontSize: 25,
      fontFamily: "Arial, sans-serif",
      fontWeight: "normal",
      textColor: "random",
      width: 360,
      height: 200,
      textAlign: "middle",
      randomRotation: true,
      randomSize: true,
      randomWeight: true,
      randomFont: true,
      minFontSize: 20,
      maxFontSize: 40,
      minRotation: -45,
      maxRotation: 45,
      rotationProbability: 0.3,
      backgroundColor: "var(--cardHeader, #0a0a0a)",
      backgroundGradient: null,
      autoTextColor: true,
      textDepth: true,
      depthStyle: "shadow",
      shadowIntensity: "medium",
      responsive: true,
      fontFamilies: [
        "Fira Code",
        "Arial, sans-serif",
        "Georgia, serif",
        "Courier New, monospace",
        "Times New Roman, serif",
        "Verdana, sans-serif",
        "Impact, fantasy",
        "Comic Sans MS, cursive",
        "Trebuchet MS, sans-serif",
      ],
      fontWeights: ["normal", "bold", "lighter", "300", "400", "500", "600", "700", "800", "900"],
      ...superOptions
    };
  }
  getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  getRandomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  getRandomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  isColorDark(color) {
    if (color.startsWith("var")) {
      color =
        getComputedStyle(document.querySelector("[data-theme]") || document.documentElement)
          .getPropertyValue(color.match(/--[^,\)]+/)[0])
          .trim() || "transparent";
    }
    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }
    if (color.startsWith("rgb")) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
      }
    }
    if (color.startsWith("hsl")) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const lightness = parseInt(matches[2]);
        return lightness < 50;
      }
    }
    return true;
  }
  getDepthColor(textColor, isDarkBg) {
    if (!isDarkBg) {
      return "rgba(0, 0, 0, 0.5)";
    }
    return "rgba(255, 255, 255, 0.8)";
  }
  createDepthFilter(depthStyle, shadowIntensity, filterId, isDarkBg) {
    if (!depthStyle || depthStyle === "none") return "";
    let blur = 2;
    let offset = 2;
    switch (shadowIntensity) {
      case "light":
        blur = 1;
        offset = 1;
        break;
      case "strong":
        blur = 4;
        offset = 3;
        break;
      case "medium":
      default:
        blur = 2;
        offset = 2;
    }
    const shadowColor = isDarkBg ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.9)";
    if (depthStyle === "shadow" || depthStyle === "both") {
      return `  <defs>
    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/>
      <feOffset dx="${offset}" dy="${offset}" result="offsetblur"/>
      <feFlood flood-color="${shadowColor}"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>\n`;
    }
    if (depthStyle === "glow") {
      return `  <defs>
    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${blur * 2}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>\n`;
    }
    return "";
  }
  getContrastingColor(backgroundColor, isDark = null) {
    if (isDark === null) {
      isDark = this.isColorDark(backgroundColor);
    }
    if (isDark) {
      const lightColors = ["#FFFFFF", "#F0F0F0", "#E8E8E8", "#FAFAFA", "#FFF8DC", "#FFE4E1", "#F0FFF0", "#E0FFFF", "#FFF0F5", "#FFFACD"];
      return this.getRandomFromArray(lightColors);
    } else {
      const darkColors = ["#000000", "#1A1A1A", "#2C2C2C", "#333333", "#404040", "#1C1C1C", "#0D0D0D", "#262626", "#1F1F1F", "#2E2E2E"];
      return this.getRandomFromArray(darkColors);
    }
  }
  createGradientDef(gradient, id) {
    if (!gradient || !gradient.colors || gradient.colors.length < 2) {
      return "";
    }
    const { type = "linear", colors, angle = 0 } = gradient;
    if (type === "linear") {
      const angleRad = (angle - 90) * (Math.PI / 180);
      const x1 = Math.round(50 + 50 * Math.cos(angleRad));
      const y1 = Math.round(50 + 50 * Math.sin(angleRad));
      const x2 = Math.round(50 - 50 * Math.cos(angleRad));
      const y2 = Math.round(50 - 50 * Math.sin(angleRad));
      let stops = "";
      colors.forEach((color, index) => {
        const offset = (index / (colors.length - 1)) * 100;
        stops += `    <stop offset="${offset}%" stop-color="${color}" />\n`;
      });
      return `  <defs>
    <linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stops}    </linearGradient>
  </defs>\n`;
    } else if (type === "radial") {
      let stops = "";
      colors.forEach((color, index) => {
        const offset = (index / (colors.length - 1)) * 100;
        stops += `    <stop offset="${offset}%" stop-color="${color}" />\n`;
      });
      return `  <defs>
    <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
${stops}    </radialGradient>
  </defs>\n`;
    }
    return "";
  }
  getRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  getRandomBrightColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 45 + Math.floor(Math.random() * 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 20);
    const lightness = 70 + Math.floor(Math.random() * 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  getRandomDarkColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 50 + Math.floor(Math.random() * 50);
    const lightness = 20 + Math.floor(Math.random() * 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  getRandomColors(count, type = "hex") {
    const colors = [];
    for (let i = 0; i < count; i++) {
      switch (type) {
        case "bright":
          colors.push(this.getRandomBrightColor());
          break;
        case "pastel":
          colors.push(this.getRandomPastelColor());
          break;
        case "dark":
          colors.push(this.getRandomDarkColor());
          break;
        case "hex":
        default:
          colors.push(this.getRandomColor());
      }
    }
    return colors;
  }
  getTextWidth(text, fontSize) {
    return text.length * fontSize * 0.55;
  }
  checkOverlap(rect1, rect2, padding = 3) {
    const expandedRect1 = {
      x: rect1.x - padding,
      y: rect1.y - padding,
      width: rect1.width + 2 * padding,
      height: rect1.height + 2 * padding,
    };
    const expandedRect2 = {
      x: rect2.x - padding,
      y: rect2.y - padding,
      width: rect2.width + 2 * padding,
      height: rect2.height + 2 * padding,
    };
    return !(
      expandedRect1.x + expandedRect1.width < expandedRect2.x ||
      expandedRect2.x + expandedRect2.width < expandedRect1.x ||
      expandedRect1.y + expandedRect1.height < expandedRect2.y ||
      expandedRect2.y + expandedRect2.height < expandedRect1.y
    );
  }
  findNonOverlappingPosition(textWidth, textHeight, width, height, placedRects, maxAttempts = 300) {
    const minX = -textWidth * 0.2;
    const maxX = width - textWidth * 0.8;
    const minY = textHeight * 0.8;
    const maxY = height + textHeight * 0.2;
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * (maxX - minX) + minX;
      const y = Math.random() * (maxY - minY) + minY;
      const newRect = {
        x,
        y: y - textHeight,
        width: textWidth,
        height: textHeight,
      };
      let overlaps = false;
      for (const rect of placedRects) {
        if (this.checkOverlap(newRect, rect)) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        return { x, y };
      }
    }
    return {
      x: Math.random() * (maxX - minX) + minX,
      y: Math.random() * (maxY - minY) + minY,
    };
  }
  async multiTextSvg(textArray, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    Object.keys(options).forEach((key) => {
      if (this.options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    });
    const {
      fontSize,
      fontFamily,
      fontWeight,
      textColor,
      width,
      height,
      randomRotation,
      randomSize,
      randomWeight,
      randomFont,
      minFontSize,
      maxFontSize,
      minRotation,
      maxRotation,
      rotationProbability,
      backgroundColor,
      backgroundGradient,
      autoTextColor,
      textDepth,
      depthStyle,
      shadowIntensity,
      fontFamilies,
      fontWeights,
    } = mergedOptions;
    const placedRects = [];
    let textElements = "";
    let isDarkBackground = true;
    if (autoTextColor && backgroundColor !== "transparent") {
      isDarkBackground = this.isColorDark(backgroundColor);
    } else if (autoTextColor && backgroundGradient && backgroundGradient.colors) {
      isDarkBackground = this.isColorDark(backgroundGradient.colors[0]);
    }
    let depthFilterDef = "";
    const filterId = "depth_" + Math.random().toString(36).substr(2, 9);
    if (textDepth) {
      depthFilterDef = this.createDepthFilter(depthStyle, shadowIntensity, filterId, isDarkBackground);
    }
    for (let idx = 0; idx < textArray.length; idx++) {
      const item = textArray[idx];
      const text = typeof item === "string" ? item : item.text;
      let itemFontSize = item.fontSize || fontSize;
      if (randomSize && !item.fontSize) {
        itemFontSize = this.getRandomIntInRange(minFontSize, maxFontSize);
      }
      let rotation = 0;
      if (randomRotation && Math.random() < rotationProbability) {
        rotation = item.rotation !== undefined ? item.rotation : this.getRandomInRange(minRotation, maxRotation);
      }
      let itemFontWeight = item.fontWeight || fontWeight;
      if (randomWeight && !item.fontWeight) {
        itemFontWeight = this.getRandomFromArray(fontWeights);
      }
      let itemFontFamily = item.fontFamily || fontFamily;
      if (randomFont && !item.fontFamily) {
        itemFontFamily = this.getRandomFromArray(fontFamilies);
      }
      let itemColor;
      if (item.textColor) {
        itemColor = item.textColor === "random" ? this.getRandomColor() : item.textColor;
      } else if (autoTextColor && backgroundColor !== "transparent") {
        itemColor = this.getContrastingColor(backgroundColor, isDarkBackground);
      } else if (autoTextColor && backgroundGradient) {
        itemColor = this.getContrastingColor(backgroundGradient.colors[0], isDarkBackground);
      } else if (textColor === "random") {
        itemColor = this.getRandomColor();
      } else {
        itemColor = textColor;
      }
      const textWidth = this.getTextWidth(text, itemFontSize);
      const textHeight = itemFontSize * 1.2;
      const position = this.findNonOverlappingPosition(textWidth, textHeight, width, height, placedRects);
      const rectMultiplier = Math.abs(rotation) > 30 ? 1.5 : 1.2;
      placedRects.push({
        x: position.x - textWidth * 0.1,
        y: position.y - textHeight * rectMultiplier,
        width: textWidth * 1.2,
        height: textHeight * rectMultiplier,
      });
      const transform = rotation !== 0 ? ` transform="rotate(${rotation.toFixed(1)} ${position.x + textWidth / 2} ${position.y - itemFontSize / 2})"` : "";
      let strokeAttr = "";
      let filterAttr = "";
      if (textDepth) {
        if (depthStyle === "stroke" || depthStyle === "both") {
          const strokeColor = this.getDepthColor(itemColor, isDarkBackground);
          const strokeWidth = Math.max(itemFontSize * 0.03, 1);
          strokeAttr = ` stroke="${strokeColor}" stroke-width="${strokeWidth.toFixed(1)}"`;
        }
        if (depthStyle === "shadow" || depthStyle === "both" || depthStyle === "glow") {
          filterAttr = ` filter="url(#${filterId})"`;
        }
      }
      textElements += `  <text x="${position.x}" y="${position.y}"${transform}${filterAttr}
        font-family="${itemFontFamily}" 
        font-size="${itemFontSize}" 
        font-weight="${itemFontWeight}"
        fill="${itemColor}"${strokeAttr}>${text}</text>\n`;
    }
    let backgroundElement = "";
    let gradientDef = "";
    if (backgroundGradient) {
      const gradientId = "grad_" + Math.random().toString(36).substr(2, 9);
      gradientDef = this.createGradientDef(backgroundGradient, gradientId);
      backgroundElement = `  <rect width="100%" height="100%" fill="url(#${gradientId})" />\n`;
    } else if (backgroundColor !== "transparent") {
      backgroundElement = `  <rect width="100%" height="100%" fill="${backgroundColor}" />\n`;
    }
    const svgString = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
${gradientDef}${depthFilterDef}${backgroundElement}${textElements}</svg>`;
    return svgString;
  }
  async textSvg(text, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    Object.keys(options).forEach((key) => {
      if (this.options.hasOwnProperty(key)) {
        this.options[key] = options[key];
      }
    });
    const { fontSize, fontFamily, fontWeight, textColor, width, height, textAlign } = mergedOptions;
    const finalColor = textColor === "random" ? this.getRandomColor() : textColor;
    let xPosition;
    let anchor;
    switch (textAlign) {
      case "start":
        xPosition = 10;
        anchor = "start";
        break;
      case "end":
        xPosition = width - 10;
        anchor = "end";
        break;
      case "middle":
      default:
        xPosition = width / 2;
        anchor = "middle";
    }
    const yPosition = height / 2 + fontSize / 3;
    const svgString = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${xPosition}" y="${yPosition}" 
        font-family="${fontFamily}" 
        font-size="${fontSize}" 
        font-weight="${fontWeight}"
        fill="${finalColor}" 
        text-anchor="${anchor}">${text}</text>
</svg>`;
    return svgString;
  }
  async displaySVG(text, element, options = {}) {
    if (!element) return;
    const svgString = await this.textSvg(text, options);
    element.innerHTML = svgString;
    return element;
  }
  async displayMultiTextSVG(textArray, element, options = {}) {
    if (!element) return;
    if (!options.width || !options.height) {
      const rect = element.getBoundingClientRect();
      if (!options.width) options.width = rect.width || 360;
      if (!options.height) options.height = rect.height || 200;
    }
    const svgString = await this.multiTextSvg(textArray, options);
    element.innerHTML = svgString;
    if (options.responsive !== false) {
      const svg = element.querySelector("svg");
      if (svg) {
        const width = svg.getAttribute("width");
        const height = svg.getAttribute("height");
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.display = "block";
      }
    }
    return element;
  }
  cleanup() {
    this.options = {
      fontSize: 25,
      fontFamily: "Arial, sans-serif",
      fontWeight: "normal",
      textColor: "random",
      width: 360,
      height: 200,
      textAlign: "middle",
      randomRotation: true,
      randomSize: true,
      randomWeight: true,
      randomFont: true,
      minFontSize: 20,
      maxFontSize: 40,
      minRotation: -45,
      maxRotation: 45,
      rotationProbability: 0.3,
      backgroundColor: "var(--cardHeader, #0a0a0a)",
      backgroundGradient: null,
      autoTextColor: true,
      textDepth: true,
      depthStyle: "shadow",
      shadowIntensity: "medium",
      responsive: true,
      fontFamilies: [
        "Fira Code",
        "Arial, sans-serif",
        "Georgia, serif",
        "Courier New, monospace",
        "Times New Roman, serif",
        "Verdana, sans-serif",
        "Impact, fantasy",
        "Comic Sans MS, cursive",
        "Trebuchet MS, sans-serif",
      ],
      fontWeights: ["normal", "bold", "lighter", "300", "400", "500", "600", "700", "800", "900"],
    };
  }
}
function initGenSvg() {
  if (window.App?.modules?.genSvg) {
    window.App.modules.genSvg.cleanup?.();
  }
  const svgModule = new GenSvg();
  window.App.register("genSvg", svgModule, 'initGenSvg');
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGenSvg);
} else {
  initGenSvg();
}
export { GenSvg, initGenSvg };
