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

// (Submerged mode now uses SURFACE waves and bg configs directly to maintain identical premium look)

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

    // Select wave colors based on theme (identical for both modes)
    const waveColors = theme === 'dark' ? SURFACE_WAVES_DARK : SURFACE_WAVES_LIGHT;
    let bgGradient;

    // Paint the normal background + subtle gradient approaching waves (identical for both modes)
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

    // Calculate wave region
    let waveStartY; // top of wave region
    if (mode === 'surface') {
      // Pre-login: waves occupy bottom 15% of screen
      waveStartY = H * 0.85;
    } else {
      // Post-login: raised water level (waves start at 15% from top, filling 85% of screen)
      waveStartY = H * 0.15;
    }

    // Keep wave size, spacing, and floating amplitude EXACTLY identical between both modes
    const waveScaleHeight = H * 0.15;

    // Draw each wave layer
    WAVE_PARAMS.forEach((wp, i) => {
      const wc = waveColors[i];
      const rgb = hexToRgb(wc.hex);

      // Spacing baseY using waveScaleHeight so layers are spaced gently
      const baseY = waveStartY + wp.yOffset * waveScaleHeight;

      // Float vertical offset using waveScaleHeight so it is gentle and identical to pre-login
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
