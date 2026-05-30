/**
 * Koral Wave Animation Module
 * 
 * Two modes:
 *   - "surface"    → pre-login: waves at the bottom ~15% of screen (above water feel)
 *   - "submerged"  → post-login: waves fill ~85% of screen (underwater feel)
 * 
 * Surface mode:  coral-red waves on dark/white background
 * Submerged mode: dark-toned waves on coral background (inverted to avoid eye strain)
 */

// ─── Theme Detection ────────────────────────────────────────
function getEffectiveTheme() {
  const body = document.body;
  if (body.classList.contains('theme-light') || body.getAttribute('data-theme') === 'light') return 'light';
  if (body.classList.contains('theme-dark') || body.getAttribute('data-theme') === 'dark') return 'dark';
  // system theme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

// ─── Color Helpers ──────────────────────────────────────────
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

// ─── Wave Configurations ────────────────────────────────────
// Brand colors: --brand-a: #ef4444  --brand-b: #f43f5e  --brand-c: #f97316

// SURFACE MODE: Brand coral-red tone variations
// Dark theme — vivid on dark bg
const SURFACE_WAVES_DARK = [
  { hex: '#f87171', alphaTop: 0.40, alphaBot: 0.60 },  // lightest coral
  { hex: '#ef4444', alphaTop: 0.45, alphaBot: 0.68 },  // brand-a
  { hex: '#f43f5e', alphaTop: 0.50, alphaBot: 0.72 },  // brand-b
  { hex: '#dc2626', alphaTop: 0.55, alphaBot: 0.78 },  // deeper red
  { hex: '#b91c1c', alphaTop: 0.60, alphaBot: 0.88 },  // darkest
];

// Light theme — softer tints
const SURFACE_WAVES_LIGHT = [
  { hex: '#fca5a5', alphaTop: 0.28, alphaBot: 0.45 },  // pastel coral
  { hex: '#f87171', alphaTop: 0.32, alphaBot: 0.50 },  // light coral
  { hex: '#ef4444', alphaTop: 0.36, alphaBot: 0.55 },  // brand-a
  { hex: '#f43f5e', alphaTop: 0.40, alphaBot: 0.60 },  // brand-b
  { hex: '#dc2626', alphaTop: 0.45, alphaBot: 0.68 },  // deeper
];

// SUBMERGED MODE: Theme-colored waves on Coral Main Background
// Dark theme — mysterious translucent black waves
const SUBMERGED_WAVES_DARK = [
  { hex: '#09090b', alphaTop: 0.15, alphaBot: 0.35 },
  { hex: '#000000', alphaTop: 0.20, alphaBot: 0.45 },
  { hex: '#000000', alphaTop: 0.25, alphaBot: 0.55 },
  { hex: '#000000', alphaTop: 0.30, alphaBot: 0.65 },
  { hex: '#09090b', alphaTop: 0.35, alphaBot: 0.75 },
];

// Light theme — shimming translucent white waves
const SUBMERGED_WAVES_LIGHT = [
  { hex: '#ffffff', alphaTop: 0.18, alphaBot: 0.38 },
  { hex: '#ffffff', alphaTop: 0.22, alphaBot: 0.48 },
  { hex: '#ffffff', alphaTop: 0.26, alphaBot: 0.58 },
  { hex: '#ffffff', alphaTop: 0.30, alphaBot: 0.68 },
  { hex: '#ffffff', alphaTop: 0.35, alphaBot: 0.78 },
];

// ─── Background Stop Color Configurations (RGB) ─────────────
const BG_SURFACE_DARK = [
  { r: 9, g: 9, b: 11 },   // #09090b
  { r: 13, g: 10, b: 11 }, // #0d0a0b
  { r: 21, g: 14, b: 12 }  // #150e0c
];
const BG_SURFACE_LIGHT = [
  { r: 250, g: 250, b: 250 }, // #fafafa
  { r: 250, g: 245, b: 243 }, // #faf5f3
  { r: 248, g: 237, b: 232 }  // #f8ede8
];
const BG_SUBMERGED_DARK = [
  { r: 190, g: 18, b: 60 },  // #be123c
  { r: 153, g: 27, b: 27 },  // #991b1b
  { r: 69, g: 10, b: 10 }    // #450a0a
];
const BG_SUBMERGED_LIGHT = [
  { r: 244, g: 63, b: 94 },  // #f43f5e
  { r: 239, g: 68, b: 68 },  // #ef4444
  { r: 252, g: 165, b: 165 } // #fca5a5
];

// ─── Math & Color Interpolation Helpers ───────────────────────
function lerp(start, end, amt) {
  return start + (end - start) * amt;
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function parseWaveConfig(wc) {
  const rgb = hexToRgb(wc.hex);
  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    aTop: wc.alphaTop,
    aBot: wc.alphaBot
  };
}

// Wave motion parameters (shared between modes)
// Layers 1 and 3 move in REVERSE direction (negative wSpeed)
const WAVE_PARAMS = [
  { yOffset: 0,    wAmp: 0.022, wFreq: 0.008, wFreq2: 0.005, wSpeed:  0.0018, wSpeed2:  0.0011, wPhase: 0.0, wPhase2: 1.1, fAmp: 0.065, fSpeed: 0.0022, fPhase: 0.0 },
  { yOffset: 0.09, wAmp: 0.019, wFreq: 0.006, wFreq2: 0.011, wSpeed: -0.0014, wSpeed2: -0.0012, wPhase: 1.2, wPhase2: 2.8, fAmp: 0.050, fSpeed: 0.0016, fPhase: 1.5 },
  { yOffset: 0.18, wAmp: 0.025, wFreq: 0.010, wFreq2: 0.004, wSpeed:  0.0012, wSpeed2:  0.0009, wPhase: 2.5, wPhase2: 0.4, fAmp: 0.075, fSpeed: 0.0028, fPhase: 3.1 },
  { yOffset: 0.27, wAmp: 0.018, wFreq: 0.007, wFreq2: 0.013, wSpeed: -0.0016, wSpeed2:  0.0010, wPhase: 0.7, wPhase2: 3.5, fAmp: 0.055, fSpeed: 0.0018, fPhase: 2.0 },
  { yOffset: 0.35, wAmp: 0.021, wFreq: 0.009, wFreq2: 0.006, wSpeed:  0.0010, wSpeed2: -0.0008, wPhase: 3.8, wPhase2: 1.9, fAmp: 0.070, fSpeed: 0.0025, fPhase: 4.2 },
];

// ─── Wave Renderer Class ────────────────────────────────────
class KoralWaves {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.time = 0;
    this.lastTs = null;
    this.mode = 'surface'; // 'surface' | 'submerged'
    this.resizeObserver = null;
    this._boundDraw = this._draw.bind(this);
    this._boundResize = this._onResize.bind(this);

    // Transition State Tracking
    this.transitionStartTime = 0;
    this.staggerDelay = 150; // 150ms delay per layer
    this.layerDuration = 1500; // 1.5s smooth duration per layer
    this.transitionDuration = 4 * this.staggerDelay + this.layerDuration; // 2100ms total
    this.currentWaveStartY = null;
    this.currentMidStopPos = null;
    this.currentBgStops = null;
    this.currentWaveColors = null;

    this.startWaveStartY = null;
    this.startMidStopPos = null;
    this.startBgStops = null;
    this.startWaveColors = null;

    this.lastTheme = null;
  }

  /**
   * Initialize or reinitialize the wave canvas.
   * @param {'surface'|'submerged'} mode
   */
  init(mode = 'surface') {
    const isNew = !this.canvas;
    const oldMode = this.mode;
    this.mode = mode;

    if (isNew) {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'koral-wave-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.ctx = this.canvas.getContext('2d');

      // Insert canvas into body (before #app) so it persists across page navigations
      const app = document.getElementById('app');
      if (app) {
        document.body.insertBefore(this.canvas, app);
      } else {
        document.body.insertBefore(this.canvas, document.body.firstChild);
      }

      // Size canvas
      this._onResize();

      // Listen for resize
      window.addEventListener('resize', this._boundResize);

      // Setup initial state immediately on first load
      const theme = getEffectiveTheme();
      this.lastTheme = theme;

      const waveColors = mode === 'surface' 
        ? (theme === 'dark' ? SURFACE_WAVES_DARK : SURFACE_WAVES_LIGHT)
        : (theme === 'dark' ? SUBMERGED_WAVES_DARK : SUBMERGED_WAVES_LIGHT);
      
      const bgStops = mode === 'surface'
        ? (theme === 'dark' ? BG_SURFACE_DARK : BG_SURFACE_LIGHT)
        : (theme === 'dark' ? BG_SUBMERGED_DARK : BG_SUBMERGED_LIGHT);

      this.currentWaveStartY = mode === 'surface' ? this.H * 0.85 : this.H * 0.15;
      this.currentMidStopPos = mode === 'surface' ? 0.7 : 0.5;

      this.currentBgStops = bgStops.map(stop => ({ ...stop }));
      this.currentWaveColors = waveColors.map(wc => parseWaveConfig(wc));

      // Synchronize start state with initial values
      this.startWaveStartY = this.currentWaveStartY;
      this.startMidStopPos = this.currentMidStopPos;
      this.startBgStops = this.currentBgStops.map(stop => ({ ...stop }));
      this.startWaveColors = this.currentWaveColors.map(wc => ({ ...wc }));

      this.transitionStartTime = 0;

      // Start animation
      this.lastTs = null;
      this.animId = requestAnimationFrame(this._boundDraw);
    } else if (oldMode !== mode) {
      // Trigger smooth transition from current intermediate positions
      this.startWaveStartY = this.currentWaveStartY;
      this.startMidStopPos = this.currentMidStopPos;
      this.startBgStops = this.currentBgStops.map(stop => ({ ...stop }));
      this.startWaveColors = this.currentWaveColors.map(wc => ({ ...wc }));
      this.transitionStartTime = this.time;
    }

    // Toggle body classes for CSS transparency overrides
    document.body.classList.remove('koral-waves-surface', 'koral-waves-submerged');
    document.body.classList.add(`koral-waves-${mode}`);
  }

  destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    window.removeEventListener('resize', this._boundResize);
    document.body.classList.remove('koral-waves-surface', 'koral-waves-submerged');
    this.canvas = null;
    this.ctx = null;
    this.lastTs = null;
  }

  _onResize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
  }

  _draw(ts) {
    if (!this.canvas || !this.ctx) return;

    if (!this.lastTs) this.lastTs = ts;
    const dt = Math.min(ts - this.lastTs, 32);
    this.lastTs = ts;
    this.time += dt;

    const { ctx, W, H, mode, time } = this;
    const theme = getEffectiveTheme();

    ctx.clearRect(0, 0, W, H);

    // 1. Theme Change Interruption Checker
    if (this.lastTheme !== theme) {
      this.startWaveStartY = this.currentWaveStartY;
      this.startMidStopPos = this.currentMidStopPos;
      this.startBgStops = this.currentBgStops.map(stop => ({ ...stop }));
      this.startWaveColors = this.currentWaveColors.map(wc => ({ ...wc }));
      this.transitionStartTime = this.time;
      this.lastTheme = theme;
    }

    // 2. Determine target values
    const targetWaveStartY = mode === 'surface' ? H * 0.85 : H * 0.15;
    const targetMidStopPos = mode === 'surface' ? 0.7 : 0.5;

    const targetWaveColors = mode === 'surface'
      ? (theme === 'dark' ? SURFACE_WAVES_DARK : SURFACE_WAVES_LIGHT)
      : (theme === 'dark' ? SUBMERGED_WAVES_DARK : SUBMERGED_WAVES_LIGHT);

    const targetBgStops = mode === 'surface'
      ? (theme === 'dark' ? BG_SURFACE_DARK : BG_SURFACE_LIGHT)
      : (theme === 'dark' ? BG_SUBMERGED_DARK : BG_SUBMERGED_LIGHT);

    // 3. Interpolate overall background properties using ease-in-out cubic
    const elapsed = this.time - this.transitionStartTime;
    const progress = Math.max(0, Math.min(1, elapsed / this.transitionDuration));
    const easedOverall = easeInOutCubic(progress);

    this.currentWaveStartY = lerp(this.startWaveStartY, targetWaveStartY, easedOverall);
    this.currentMidStopPos = lerp(this.startMidStopPos, targetMidStopPos, easedOverall);

    // Lerp background stops
    for (let j = 0; j < 3; j++) {
      this.currentBgStops[j].r = lerp(this.startBgStops[j].r, targetBgStops[j].r, easedOverall);
      this.currentBgStops[j].g = lerp(this.startBgStops[j].g, targetBgStops[j].g, easedOverall);
      this.currentBgStops[j].b = lerp(this.startBgStops[j].b, targetBgStops[j].b, easedOverall);
    }

    // 4. Paint Background Gradient using current morphed colors
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    const bg0 = this.currentBgStops[0];
    const bg1 = this.currentBgStops[1];
    const bg2 = this.currentBgStops[2];
    bgGradient.addColorStop(0, `rgb(${Math.round(bg0.r)},${Math.round(bg0.g)},${Math.round(bg0.b)})`);
    bgGradient.addColorStop(this.currentMidStopPos, `rgb(${Math.round(bg1.r)},${Math.round(bg1.g)},${Math.round(bg1.b)})`);
    bgGradient.addColorStop(1, `rgb(${Math.round(bg2.r)},${Math.round(bg2.g)},${Math.round(bg2.b)})`);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Keep wave size, spacing, and floating amplitude EXACTLY identical between both modes
    const waveScaleHeight = H * 0.15;

    // 5. Draw wave layers with sequential STAGGERED easing
    WAVE_PARAMS.forEach((wp, i) => {
      // Staggered delay per layer (150ms delay)
      const delay = i * this.staggerDelay;
      const layerElapsed = Math.max(0, elapsed - delay);
      const lp = Math.min(1, layerElapsed / this.layerDuration);
      const easedLp = easeInOutCubic(lp);

      // Staggered Y-position interpolation
      const layerStart = this.startWaveStartY + wp.yOffset * waveScaleHeight;
      const layerTarget = targetWaveStartY + wp.yOffset * waveScaleHeight;
      const baseY = lerp(layerStart, layerTarget, easedLp);

      // Staggered color & alpha interpolation
      const startWc = this.startWaveColors[i];
      const targetWc = parseWaveConfig(targetWaveColors[i]);

      const wc = {
        r: lerp(startWc.r, targetWc.r, easedLp),
        g: lerp(startWc.g, targetWc.g, easedLp),
        b: lerp(startWc.b, targetWc.b, easedLp),
        aTop: lerp(startWc.aTop, targetWc.aTop, easedLp),
        aBot: lerp(startWc.aBot, targetWc.aBot, easedLp)
      };

      // Save current state back so next transitions start from correct intermediates
      this.currentWaveColors[i] = wc;

      // Float vertical offset using waveScaleHeight
      const floatOffset = Math.sin(time * wp.fSpeed + wp.fPhase) * wp.fAmp * waveScaleHeight;

      // Draw wave path
      const points = [];
      const step = 4;
      for (let x = 0; x <= W; x += step) {
        const y = baseY + floatOffset
          + Math.sin(x * wp.wFreq + time * wp.wSpeed + wp.wPhase) * wp.wAmp * H
          + Math.sin(x * wp.wFreq2 + time * wp.wSpeed2 + wp.wPhase2) * wp.wAmp * 0.4 * H;
        points.push({ x, y });
      }

      // Gradient for this layer using current morphed colors
      const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
      const grad = ctx.createLinearGradient(0, avgY - 20, 0, H);
      grad.addColorStop(0, `rgba(${Math.round(wc.r)},${Math.round(wc.g)},${Math.round(wc.b)},${wc.aTop})`);
      grad.addColorStop(1, `rgba(${Math.round(wc.r)},${Math.round(wc.g)},${Math.round(wc.b)},${wc.aBot})`);

      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    });

    this.animId = requestAnimationFrame(this._boundDraw);
  }
}

// ─── Singleton Export ───────────────────────────────────────
export const koralWaves = new KoralWaves();
