/* omnIA · orbe animado (propuesta D) en Canvas 2D, sin librerias.
   Se pausa cuando no se ve, baja a 30 fps en reposo y queda estatico con «reducir movimiento».
   Referencia directa para el componente Angular <omnia-orb [state]>. */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = { idle: 0.012, listening: 0.035, thinking: 0.08, alert: 0.03, offline: 0 };
  var FPS = { idle: 30, listening: 60, thinking: 60, alert: 45, offline: 0 };
  var LIVE = { core: ['#0a2a6b', '#001c3f'], glow: ['rgba(0,220,250,', 'rgba(10,88,235,', 'rgba(120,200,255,'] };
  var DIM = { core: ['#3a4a5e', '#1d2a3a'], glow: ['rgba(157,176,197,', 'rgba(85,101,120,', 'rgba(157,176,197,'] };
  var all = [];

  function Orb(canvas) {
    this.state = 'idle'; this.visible = true; this.running = false; this.raf = 0; this.last = 0;
    this.t = Math.random() * 10;
    var self = this; this.loop = function (ts) { self.tick(ts); };
    this.attach(canvas);
    all.push(this);
  }
  Orb.prototype.attach = function (canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    var css = canvas.clientWidth || parseInt(canvas.getAttribute('data-size'), 10) || canvas.width / 2;
    var px = Math.round(css * Math.min(2, window.devicePixelRatio || 1));
    if (px && canvas.width !== px) { canvas.width = px; canvas.height = px; }
    this.sync();
  };
  Orb.prototype.setState = function (s) { if (this.state !== s) { this.state = s; this.sync(); } };
  Orb.prototype.setVisible = function (v) { if (this.visible !== v) { this.visible = v; this.sync(); } };
  Orb.prototype.sync = function () {
    var run = this.visible && !document.hidden && !REDUCED && FPS[this.state] > 0;
    if (run && !this.running) { this.running = true; this.last = 0; this.raf = requestAnimationFrame(this.loop); }
    else if (!run && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
    if (!run) this.draw();
  };
  Orb.prototype.tick = function (ts) {
    if (!this.running) return;
    var f = FPS[this.state] || 30;
    if (!this.last || ts - this.last >= 1000 / f - 2) {
      this.t += SPEED[this.state] * (this.last ? (ts - this.last) / 16.7 : 1);
      this.last = ts; this.draw();
    }
    this.raf = requestAnimationFrame(this.loop);
  };
  Orb.prototype.draw = function () {
    var ctx = this.ctx, W = this.cv.width, R = W / 2, t = this.t, st = this.state;
    if (!W) return;
    var pal = st === 'offline' ? DIM : LIVE;
    ctx.clearRect(0, 0, W, W);
    var g = ctx.createRadialGradient(R, R, 2, R, R, R);
    g.addColorStop(0, pal.core[0]); g.addColorStop(1, pal.core[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      var a = t * (1 + i * 0.4) + i * 2.1, rr = R * (0.38 + 0.08 * Math.sin(t * 1.3 + i));
      var x = R + Math.cos(a) * R * 0.32, y = R + Math.sin(a * 1.2) * R * 0.32;
      var k = st === 'alert' ? 0.55 + 0.35 * Math.sin(t * 6) : st === 'offline' ? 0.35 : 0.6;
      var gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.6);
      gl.addColorStop(0, pal.glow[i] + k + ')'); gl.addColorStop(1, pal.glow[i] + '0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  document.addEventListener('visibilitychange', function () { all.forEach(function (o) { o.sync(); }); });
  window.OmniaOrb = Orb;
})();
