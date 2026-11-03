// Ambient Particles Engine for Checkers Battlefields
// Renders dynamic, atmospheric particles (Sakura, Stardust, Fireflies, Embers, Sparkles)

class AmbientArenaEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.currentArena = 'arena-dojo';
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.animId = null;
  }

  init() {
    this.canvas = document.getElementById('ambientCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    this.setArena(this.currentArena);
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
  }

  setArena(arenaName) {
    this.currentArena = arenaName;
    this.particles = [];

    let count = 40;
    if (arenaName === 'arena-anime-autumn') count = 45;
    else if (arenaName === 'arena-graveyard') count = 50;
    else if (arenaName === 'arena-space') count = 75;
    else if (arenaName === 'arena-forest') count = 45;
    else if (arenaName === 'arena-volcano') count = 55;
    else if (arenaName === 'arena-dojo') count = 35;
    else count = 40;

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(initial = false) {
    const arena = this.currentArena;
    const x = Math.random() * this.width;
    const y = initial ? Math.random() * this.height : (arena === 'arena-volcano' ? this.height + 10 : -10);

    let p = {
      x,
      y,
      size: Math.random() * 4 + 2,
      speedX: 0,
      speedY: 0,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() * Math.PI,
      type: arena
    };

    if (arena === 'arena-anime-autumn') {
      // Autumn maple leaves drifting down
      p.size = Math.random() * 8 + 7;
      p.speedX = Math.random() * 1.5 - 0.3;
      p.speedY = Math.random() * 1.4 + 0.9;
      const autumnColors = ['#ea580c', '#dc2626', '#f59e0b', '#b91c1c', '#f97316'];
      p.color = autumnColors[Math.floor(Math.random() * autumnColors.length)];
    } else if (arena === 'arena-dojo') {
      // Sakura petal: gentle drift down and sway
      p.size = Math.random() * 8 + 6;
      p.speedX = Math.random() * 1.2 - 0.2;
      p.speedY = Math.random() * 1.2 + 0.8;
      p.color = '#fda4af';
    } else if (arena === 'arena-space') {
      // Stardust and shooting micro-sparkles
      p.size = Math.random() * 2.5 + 1;
      p.speedX = (Math.random() - 0.5) * 0.3;
      p.speedY = (Math.random() - 0.5) * 0.3;
      p.color = Math.random() > 0.4 ? '#a78bfa' : '#67e8f9';
    } else if (arena === 'arena-graveyard') {
      // Eerie will-o'-the-wisp ghostly soul orbs
      p.size = Math.random() * 5 + 2.5;
      p.speedX = (Math.random() - 0.5) * 0.7;
      p.speedY = -(Math.random() * 0.9 + 0.3);
      p.color = Math.random() > 0.4 ? '#4ade80' : '#c084fc';
    } else if (arena === 'arena-forest') {
      // Fireflies: slow gentle wandering hover
      p.size = Math.random() * 4.5 + 2.5;
      p.speedX = (Math.random() - 0.5) * 0.7;
      p.speedY = (Math.random() - 0.5) * 0.7;
      p.color = Math.random() > 0.5 ? '#a3e635' : '#34d399';
    } else if (arena === 'arena-volcano') {
      // Rising embers
      p.size = Math.random() * 4 + 1.5;
      p.speedX = (Math.random() - 0.5) * 1.2;
      p.speedY = -(Math.random() * 2.2 + 1.2);
      p.color = Math.random() > 0.4 ? '#fb923c' : '#ef4444';
    } else if (arena === 'arena-palace') {
      // Golden sparkles falling
      p.size = Math.random() * 3 + 1.5;
      p.speedX = (Math.random() - 0.5) * 0.5;
      p.speedY = Math.random() * 0.8 + 0.4;
      p.color = '#fef08a';
    } else {
      // Sunset warm sparkles
      p.size = Math.random() * 3.5 + 1.5;
      p.speedX = (Math.random() - 0.5) * 0.6;
      p.speedY = -(Math.random() * 0.8 + 0.3);
      p.color = '#f472b6';
    }

    return p;
  }

  update() {
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      p.pulse += 0.03;
      p.rotation += p.rotationSpeed;

      if (this.currentArena === 'arena-anime-autumn') {
        p.x += p.speedX + Math.sin(p.pulse) * 1.1;
        p.y += p.speedY;
        if (p.y > this.height + 25 || p.x > this.width + 25) {
          this.particles[i] = this.createParticle(false);
        }
      } else if (this.currentArena === 'arena-dojo') {
        p.x += p.speedX + Math.sin(p.pulse) * 0.8;
        p.y += p.speedY;
        if (p.y > this.height + 20 || p.x > this.width + 20) {
          this.particles[i] = this.createParticle(false);
        }
      } else if (this.currentArena === 'arena-volcano') {
        p.x += p.speedX + Math.sin(p.pulse) * 0.6;
        p.y += p.speedY;
        if (p.y < -20) {
          this.particles[i] = this.createParticle(false);
        }
      } else if (this.currentArena === 'arena-graveyard') {
        p.x += p.speedX + Math.sin(p.pulse * 0.9) * 0.7;
        p.y += p.speedY;
        if (p.y < -20) {
          this.particles[i] = this.createParticle(false);
        }
      } else if (this.currentArena === 'arena-forest') {
        p.x += p.speedX + Math.sin(p.pulse * 0.8) * 0.5;
        p.y += p.speedY + Math.cos(p.pulse * 0.8) * 0.5;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      } else {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y > this.height + 20 || p.y < -20 || p.x > this.width + 20 || p.x < -20) {
          this.particles[i] = this.createParticle(false);
        }
      }
    }
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let p of this.particles) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      const alpha = Math.max(0.15, Math.min(1, p.opacity + Math.sin(p.pulse) * 0.25));
      this.ctx.globalAlpha = alpha;

      if (this.currentArena === 'arena-anime-autumn') {
        // Draw Momiji (Autumn leaf)
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size);
        this.ctx.lineTo(p.size * 0.4, -p.size * 0.5);
        this.ctx.lineTo(p.size * 0.9, -p.size * 0.3);
        this.ctx.lineTo(p.size * 0.5, 0.1 * p.size);
        this.ctx.lineTo(p.size * 0.7, 0.7 * p.size);
        this.ctx.lineTo(0, p.size * 0.5);
        this.ctx.lineTo(-p.size * 0.7, 0.7 * p.size);
        this.ctx.lineTo(-p.size * 0.5, 0.1 * p.size);
        this.ctx.lineTo(-p.size * 0.9, -p.size * 0.3);
        this.ctx.lineTo(-p.size * 0.4, -p.size * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (this.currentArena === 'arena-dojo') {
        // Draw Sakura Petal Shape
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size);
        this.ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.8, p.size * 0.9, p.size * 0.4, 0, p.size);
        this.ctx.bezierCurveTo(-p.size * 0.9, p.size * 0.4, -p.size * 0.8, -p.size * 0.8, 0, -p.size);
        this.ctx.fill();
      } else if (this.currentArena === 'arena-forest' || this.currentArena === 'arena-volcano' || this.currentArena === 'arena-graveyard') {
        // Glowing orb
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Star sparkle
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  animate() {
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(() => this.animate());
  }
}

window.ambientArena = new AmbientArenaEngine();
