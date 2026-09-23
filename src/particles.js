export function initBackgroundParticles() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particlesArray = [];
  let animationFrameId;

  // Estado do cursor do rato
  const mouse = {
    x: null,
    y: null,
    radius: 140 // Raio de influência e atração do íman/gancho
  };

  window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Cores institucionais DHL / Formula E translúcidas
  const colors = [
    'rgba(255, 204, 0, 0.55)',  // DHL Yellow
    'rgba(255, 204, 0, 0.30)',  // DHL Yellow soft
    'rgba(212, 5, 17, 0.40)',   // DHL Red
    'rgba(255, 255, 255, 0.35)' // White accent
  ];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.baseX = this.x;
      this.baseY = this.y;
      this.size = Math.random() * 2.2 + 1.0;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.4 - 0.1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.density = Math.random() * 20 + 5; // Inércia da partícula
    }

    update() {
      // Movimento contínuo de deriva
      this.x += this.speedX;
      this.y += this.speedY;

      // Efeito de gancho / atração gravitacional ao cursor
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < mouse.radius && distance > 2) {
          // Força de atração progressiva (quanto mais perto, mais atrai)
          const force = (mouse.radius - distance) / mouse.radius;
          const directionX = (dx / distance) * force * (this.density * 0.25);
          const directionY = (dy / distance) * force * (this.density * 0.25);

          this.x += directionX;
          this.y += directionY;
        }
      }

      // Ciclo contínuo nas extremidades do ecrã
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  function init() {
    particlesArray = [];
    const count = Math.floor((canvas.width * canvas.height) / 13000);
    for (let i = 0; i < count; i++) {
      particlesArray.push(new Particle());
    }
  }
  init();

  // Ligações entre partículas e conexão extra com o cursor
  function connect() {
    const maxDistance = 85;
    for (let a = 0; a < particlesArray.length; a++) {
      for (let b = a + 1; b < particlesArray.length; b++) {
        const dx = particlesArray[a].x - particlesArray[b].x;
        const dy = particlesArray[a].y - particlesArray[b].y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDistance) {
          const opacity = (1 - dist / maxDistance) * 0.15;
          ctx.strokeStyle = `rgba(255, 204, 0, ${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
          ctx.stroke();
        }
      }

      // Linhas dinâmicas até ao cursor quando dentro do raio de atração
      if (mouse.x !== null && mouse.y !== null) {
        const mdx = mouse.x - particlesArray[a].x;
        const mdy = mouse.y - particlesArray[a].y;
        const mdist = Math.hypot(mdx, mdy);

        if (mdist < mouse.radius * 0.75) {
          const mouseLineOpacity = (1 - mdist / (mouse.radius * 0.75)) * 0.25;
          ctx.strokeStyle = `rgba(255, 204, 0, ${mouseLineOpacity})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
    }
    connect();
    animationFrameId = requestAnimationFrame(render);
  }

  render();

  return () => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resize);
  };
}