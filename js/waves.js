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

// SURFACE MODE: Coral-red waves at the bottom of screen
// Warm coral tones from light to deep
const SURFACE_WAVES_DARK = [
  { hex: '#E8755A', alphaTop: 0.45, alphaBot: 0.65 },
  { hex: '#D45A3F', alphaTop: 0.50, alphaBot: 0.70 },
  { hex: '#C44530', alphaTop: 0.55, alphaBot: 0.75 },
  { hex: '#B03320', alphaTop: 0.60, alphaBot: 0.80 },
  { hex: '#9C2515', alphaTop: 0.65, alphaBot: 0.90 },
];

const SURFACE_WAVES_LIGHT = [
  { hex: '#F4A393', alphaTop: 0.30, alphaBot: 0.50 },
  { hex: '#EF8A78', alphaTop: 0.35, alphaBot: 0.55 },
  { hex: '#E8755A', alphaTop: 0.40, alphaBot: 0.60 },
  { hex: '#D45A3F', alphaTop: 0.45, alphaBot: 0.65 },
  { hex: '#C44530', alphaTop: 0.50, alphaBot: 0.75 },
];

// SUBMERGED MODE: Dark-toned waves on coral background
// Using the dark bg tones with slight reddish tint
const SUBMERGED_WAVES_DARK = [
  { hex: '#1e1820', alphaTop: 0.50, alphaBot: 0.70 },
  { hex: '#1a1418', alphaTop: 0.55, alphaBot: 0.75 },
  { hex: '#151012', alphaTop: 0.60, alphaBot: 0.80 },
  { hex: '#110c0e', alphaTop: 0.65, alphaBot: 0.85 },
  { hex: '#0d090a', alphaTop: 0.70, alphaBot: 0.95 },
];

const SUBMERGED_WAVES_LIGHT = [
  { hex: '#f5eae7', alphaTop: 0.40, alphaBot: 0.60 },
  { hex: '#ede0db', alphaTop: 0.45, alphaBot: 0.65 },
  { hex: '#e4d4ce', alphaTop: 0.50, alphaBot: 0.70 },
  { hex: '#d9c6be', alphaTop: 0.55, alphaBot: 0.78 },
  { hex: '#cdb6ad', alphaTop: 0.60, alphaBot: 0.88 },
];

// Wave motion parameters (shared between modes)
// Each layer has unique frequencies and speeds for organic movement
const WAVE_PARAMS = [
  { yOffset: 0,    wAmp: 0.022, wFreq: 0.008, wFreq2: 0.005, wSpeed: 0.0030, wSpeed2: 0.0018, wPhase: 0.0, wPhase2: 1.1, fAmp: 0.040, fSpeed: 0.0018, fPhase: 0.0 },
  { yOffset: 0.09, wAmp: 0.019, wFreq: 0.006, wFreq2: 0.011, wSpeed: 0.0025, wSpeed2: 0.0022, wPhase: 1.2, wPhase2: 2.8, fAmp: 0.028, fSpeed: 0.0011, fPhase: 1.5 },
  { yOffset: 0.18, wAmp: 0.025, wFreq: 0.010, wFreq2: 0.004, wSpeed: 0.0020, wSpeed2: 0.0014, wPhase: 2.5, wPhase2: 0.4, fAmp: 0.050, fSpeed: 0.0025, fPhase: 3.1 },
  { yOffset: 0.27, wAmp: 0.018, wFreq: 0.007, wFreq2: 0.013, wSpeed: 0.0028, wSpeed2: 0.0019, wPhase: 0.7, wPhase2: 3.5, fAmp: 0.035, fSpeed: 0.0014, fPhase: 2.0 },
  { yOffset: 0.35, wAmp: 0.021, wFreq: 0.009, wFreq2: 0.006, wSpeed: 0.0022, wSpeed2: 0.0016, wPhase: 3.8, wPhase2: 1.9, fAmp: 0.045, fSpeed: 0.0020, fPhase: 4.2 },
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
  }

  /**
   * Initialize or reinitialize the wave canvas.
   * @param {'surface'|'submerged'} mode
   */
  init(mode = 'surface') {
    // Skip if already running in the same mode
    if (this.canvas && this.mode === mode && this.animId) return;
    
    this.mode = mode;

    // Clean up previous instance
    this.destroy();

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

    // Add mode class to body for CSS transparency overrides
    document.body.classList.remove('koral-waves-surface', 'koral-waves-submerged');
    document.body.classList.add(`koral-waves-${mode}`);

    // Size canvas
    this._onResize();

    // Listen for resize
    window.addEventListener('resize', this._boundResize);

    // Start animation
    this.lastTs = null;
    this.animId = requestAnimationFrame(this._boundDraw);
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

    // Select wave colors based on mode and theme
    let waveColors, bgGradient;

    if (mode === 'surface') {
      waveColors = theme === 'dark' ? SURFACE_WAVES_DARK : SURFACE_WAVES_LIGHT;
      // Paint the normal background + subtle gradient approaching waves
      if (theme === 'dark') {
        bgGradient = ctx.createLinearGradient(0, 0, 0, H);
        bgGradient.addColorStop(0, '#09090b');
        bgGradient.addColorStop(0.7, '#0d0a0b');
        bgGradient.addColorStop(1, '#150e0c');
      } else {
        bgGradient = ctx.createLinearGradient(0, 0, 0, H);
        bgGradient.addColorStop(0, '#fafafa');
        bgGradient.addColorStop(0.7, '#faf5f3');
        bgGradient.addColorStop(1, '#f8ede8');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, W, H);
    } else {
      // Submerged mode
      waveColors = theme === 'dark' ? SUBMERGED_WAVES_DARK : SUBMERGED_WAVES_LIGHT;

      // Paint coral background gradient
      if (theme === 'dark') {
        bgGradient = ctx.createLinearGradient(0, 0, 0, H);
        bgGradient.addColorStop(0, '#2a0f0a');
        bgGradient.addColorStop(0.3, '#3d1810');
        bgGradient.addColorStop(0.6, '#4a1f15');
        bgGradient.addColorStop(1, '#1a0a06');
      } else {
        bgGradient = ctx.createLinearGradient(0, 0, 0, H);
        bgGradient.addColorStop(0, '#fdf0ed');
        bgGradient.addColorStop(0.3, '#fce4de');
        bgGradient.addColorStop(0.6, '#f9d5cb');
        bgGradient.addColorStop(1, '#f5c4b3');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, W, H);
    }

    // Calculate wave region
    let waveStartY; // top of wave region
    if (mode === 'surface') {
      // Waves occupy bottom 15% of screen
      waveStartY = H * 0.85;
    } else {
      // Waves start from top 12% (fill 88% of screen)
      waveStartY = H * 0.12;
    }
    const waveRegionHeight = H - waveStartY;

    // Draw each wave layer
    WAVE_PARAMS.forEach((wp, i) => {
      const wc = waveColors[i];
      const rgb = hexToRgb(wc.hex);

      // Calculate y-position within wave region
      const baseY = waveStartY + wp.yOffset * waveRegionHeight;

      // Float (slow vertical oscillation)
      const floatOffset = Math.sin(time * wp.fSpeed + wp.fPhase) * wp.fAmp * waveRegionHeight;

      // Draw wave path
      const points = [];
      const step = 4;
      for (let x = 0; x <= W; x += step) {
        const y = baseY + floatOffset
          + Math.sin(x * wp.wFreq + time * wp.wSpeed + wp.wPhase) * wp.wAmp * H
          + Math.sin(x * wp.wFreq2 + time * wp.wSpeed2 + wp.wPhase2) * wp.wAmp * 0.4 * H;
        points.push({ x, y });
      }

      // Gradient for this layer
      const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
      const grad = ctx.createLinearGradient(0, avgY - 20, 0, H);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${wc.alphaTop})`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},${wc.alphaBot})`);

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
