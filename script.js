const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu-inicio');

let W, H, scale;
const TEMAS = {
    "ANIMALES": ["PERRO", "GATO", "LEON", "TIGRE", "CEBRA"],
    "PLANTAS": ["ROSA", "PINO", "ALGA", "OLMO", "FLOR"],
    "COLORES": ["ROJO", "AZUL", "VERDE", "GRIS", "ROSA"]
};
const NIVELES = { "NIVEL 1": 60, "NIVEL 2": 80, "NIVEL 3": 100 };

let temaSel = "ANIMALES", nivelSel = "NIVEL 1";
let palabrasObj = [], casillas = [], letras = [], particulas = [];
let tiempoTotal, tiempoRestante, juegoActivo = false, letraArrastrada = null;
let ultimoFrame = 0;

// --- SISTEMA DE AUDIO (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frecuencia, tipo, duracion, volumen = 0.1) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(frecuencia, audioCtx.currentTime);
        gain.gain.setValueAtTime(volumen, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracion);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duracion);
    } catch(e) { console.log("Audio bloqueado"); }
}

const sndPop = () => playSound(440, 'sine', 0.1, 0.05);
const sndMagic = () => {
    playSound(660, 'triangle', 0.3, 0.04);
    setTimeout(() => playSound(880, 'triangle', 0.3, 0.04), 100);
};
const sndWin = () => {
    [523, 659, 783, 1046].forEach((f, i) => {
        setTimeout(() => playSound(f, 'sine', 0.4, 0.06), i * 100);
    });
};

class Particula {
    constructor(x, y, color = null) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.alpha = 1;
        this.color = color || "#00d4ff";
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        this.x += this.vx; this.y += this.vy;
        this.alpha -= 0.025;
    }
}

class Letra {
    constructor(col) {
        this.col = col;
        this.reset();
        this.y = Math.random() * (H * 0.5) + 80;
    }
    reset() {
        this.esComodin = Math.random() < 0.10;
        this.char = this.esComodin ? "?" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
        let zonaJuego = W * 0.6;
        this.x = (W * 0.35) + (this.col * (zonaJuego / 10));
        this.y = 70;
        this.vel = (1.4 + Math.random() * 1.6) * scale;
        this.dragging = false;
        this.vieneDeCasilla = false;
    }
    update() {
        if (!this.dragging && juegoActivo) {
            this.y += this.vel;
            if (this.y > H * 0.82) this.reset();
        }
    }
    draw() {
        ctx.save();
        if (this.esComodin || this.char === "?") {
            ctx.fillStyle = "#f1c40f";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#f1c40f";
            ctx.font = `300 ${28 * scale}px 'Segoe UI', Arial`;
        } else {
            ctx.fillStyle = this.dragging ? "#00d4ff" : "#ffffff";
            ctx.font = `300 ${32 * scale}px 'Segoe UI', Arial`;
        }
        ctx.textAlign = "center";
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

function empezarPartida() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    menu.style.display = 'none';
    canvas.style.display = 'block';
    resize();
    iniciarLogica();
}

function iniciarLogica() {
    palabrasObj = [...TEMAS[temaSel]].sort(() => 0.5 - Math.random());
    tiempoTotal = NIVELES[nivelSel] * 1000;
    tiempoRestante = tiempoTotal;
    juegoActivo = true;
    casillas = [];
    let n = 8;
    let size = (W * 0.6) / n;
    for(let i=0; i<n; i++) {
        casillas.push({ x: (W*0.35) + i*size, y: H*0.85, w: size*0.8, h: H*0.08, letra: "" });
    }
    letras = Array.from({length: 12}, (_, i) => new Letra(i % 10));
    actualizarSidebar();
    requestAnimationFrame(loop);
}

function loop(t) {
    let dt = t - ultimoFrame;
    ultimoFrame = t;
    ctx.clearRect(0, 0, W, H);
    if (juegoActivo) {
        tiempoRestante -= dt;
        if (tiempoRestante <= 0 || palabrasObj.length === 0) juegoActivo = false;
    }

    // Cabezal
    ctx.fillStyle = "#0f171e"; 
    ctx.fillRect(0, 0, W, 80); 

    const barW = W * 0.5, barX = W * 0.4, barY = 35;
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(barX, barY, barW * (tiempoRestante/tiempoTotal), 10);

    letras.forEach(l => { l.update(); l.draw(); });
    particulas = particulas.filter(p => p.alpha > 0);
    particulas.forEach(p => p.draw());

    // --- DIBUJO DE CASILLAS ESTILIZADAS ---
    casillas.forEach(c => {
        ctx.fillStyle = c.letra ? "rgba(0, 212, 255, 0.1)" : "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = c.letra ? "#00d4ff" : "rgba(0, 212, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        if (!c.letra) {
            ctx.beginPath();
            ctx.strokeStyle = "#00d4ff";
            ctx.lineWidth = 2;
            ctx.moveTo(c.x, c.y + 10); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x + 10, c.y);
            ctx.moveTo(c.x + c.w - 10, c.y + c.h); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.lineTo(c.x + c.w, c.y + c.h - 10);
            ctx.stroke();
        }
        
        if (c.letra) {
            ctx.fillStyle = c.letra === "?" ? "#f1c40f" : "#ffffff";
            ctx.font = `300 ${32 * scale}px 'Segoe UI', Arial`;
            ctx.textAlign = "center";
            ctx.fillText(c.letra, c.x + c.w/2, c.y + c.h/2 + 12);
        }
    });

    if (letraArrastrada) letraArrastrada.draw();

    if (!juegoActivo) {
        ctx.fillStyle = "rgba(10, 15, 20, 0.95)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "300 45px 'Segoe UI', Arial";
        ctx.fillText(palabrasObj.length === 0 ? "¡VICTORIA!" : "TIEMPO AGOTADO", W/2, H/2 - 40);
        document.getElementById('btn-reiniciar').style.display = 'block';
    }
    requestAnimationFrame(loop);
}

function manejarInicio(e) {
    if (!juegoActivo) return;
    const pos = getPos(e);
    casillas.forEach(c => {
        if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h && c.letra !== "") {
            sndPop();
            letraArrastrada = new Letra(99);
            letraArrastrada.char = c.letra;
            letraArrastrada.esComodin = (c.letra === "?");
            letraArrastrada.x = pos.x; letraArrastrada.y = pos.y;
            letraArrastrada.dragging = true; letraArrastrada.vieneDeCasilla = true;
            c.letra = "";
        }
    });
    if (!letraArrastrada) {
        letras.forEach(l => {
            if (Math.abs(l.x - pos.x) < 40 * scale && Math.abs(l.y - pos.y) < 40 * scale) {
                sndPop();
                letraArrastrada = l; l.dragging = true;
            }
        });
    }
}

function manejarFin() {
    if (!letraArrastrada) return;
    let colocada = false;
    casillas.forEach((c) => {
        if (letraArrastrada.x > c.x && letraArrastrada.x < c.x + c.w && 
            letraArrastrada.y > c.y - 60 && letraArrastrada.y < c.y + 60) {
            if (c.letra === "") {
                c.letra = letraArrastrada.char;
                colocada = true;
            }
        }
    });
    if (colocada && !letraArrastrada.vieneDeCasilla) letraArrastrada.reset();
    letraArrastrada.dragging = false; letraArrastrada = null;
    if (colocada) setTimeout(verificar, 10);
}

function verificar() {
    let cadenaTablero = casillas.map(c => c.letra || " ");
    palabrasObj.forEach((palabra, i) => {
        for (let inicio = 0; inicio <= casillas.length - palabra.length; inicio++) {
            let coincide = true;
            let indicesComodines = [];
            for (let j = 0; j < palabra.length; j++) {
                let letraTablero = cadenaTablero[inicio + j];
                let letraEsperada = palabra[j];
                if (letraTablero === "?") indicesComodines.push(inicio + j);
                else if (letraTablero !== letraEsperada) { coincide = false; break; }
            }
            if (coincide) {
                sndWin();
                indicesComodines.forEach(idx => {
                    casillas[idx].letra = palabra[idx - inicio];
                    sndMagic();
                    for(let k=0; k<20; k++) particulas.push(new Particula(casillas[idx].x + casillas[idx].w/2, casillas[idx].y + casillas[idx].h/2, "#f1c40f"));
                });
                let ultimaC = casillas[inicio + palabra.length - 1];
                for(let k=0; k<30; k++) particulas.push(new Particula(ultimaC.x + ultimaC.w/2, ultimaC.y + ultimaC.h/2));
                const pills = document.querySelectorAll('.word-pill');
                pills.forEach(pill => {
                    if (pill.innerText === palabra && !pill.classList.contains('found')) {
                        pill.classList.add('found');
                        const r = pill.getBoundingClientRect();
                        for(let k=0; k<30; k++) particulas.push(new Particula(r.left + r.width/2, r.top + r.height/2));
                    }
                });
                setTimeout(() => {
                    palabrasObj.splice(i, 1);
                    actualizarSidebar();
                }, 450);
                for(let k = inicio; k < inicio + palabra.length; k++) casillas[k].letra = "";
                return;
            }
        }
    });
}

// AUXILIARES
function setTema(t, b) { temaSel = t; document.querySelectorAll('#grupo-temas .btn-opcion').forEach(x => x.classList.remove('active')); b.classList.add('active'); }
function setNivel(n, b) { nivelSel = n; document.querySelectorAll('#grupo-niveles .btn-opcion').forEach(x => x.classList.remove('active')); b.classList.add('active'); }
function actualizarSidebar() {
    const c = document.getElementById('sidebar-words');
    if (document.querySelectorAll('.word-pill.found').length === 0) {
        c.innerHTML = "";
        palabrasObj.forEach(p => {
            const d = document.createElement('div'); d.className = 'word-pill'; d.innerText = p; c.appendChild(d);
        });
    }
}
function getPos(e) { const r = canvas.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: cx - r.left, y: cy - r.top }; }
function resize() { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; scale = Math.min(W/800, H/600); }

window.addEventListener('mousedown', manejarInicio);
window.addEventListener('mousemove', (e) => { if(letraArrastrada){ const p = getPos(e); letraArrastrada.x = p.x; letraArrastrada.y = p.y; }});
window.addEventListener('mouseup', manejarFin);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); manejarInicio(e); }, {passive:false});
window.addEventListener('touchmove', (e) => { e.preventDefault(); const p = getPos(e); if(letraArrastrada){letraArrastrada.x=p.x; letraArrastrada.y=p.y;} }, {passive:false});
window.addEventListener('touchend', manejarFin);
window.addEventListener('resize', resize);