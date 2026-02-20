const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu-inicio');

let W, H, scale;
const TEMAS = {
    "ANIMALES": ["PERRO", "GATO", "LEON", "TIGRE", "CEBRA"],
    "PLANTAS": ["ROSA", "PINO", "ALGA", "OLMO", "FLOR"],
    "COLORES": ["ROJO", "AZUL", "VERDE", "GRIS", "ROSA"]
};
const NIVELES = { "NIVEL 1": 100, "NIVEL 2": 80, "NIVEL 3": 50 };

let temaSel = "ANIMALES", nivelSel = "NIVEL 1";
let palabrasObj = [], casillas = [], letras = [], particulas = [];
let tiempoTotal, tiempoRestante, juegoActivo = false, letraArrastrada = null;
let ultimoFrame = 0;

// --- SISTEMA DE AUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(f, t, d, v = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = t;
        o.frequency.setValueAtTime(f, audioCtx.currentTime);
        g.gain.setValueAtTime(v, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        o.stop(audioCtx.currentTime + d);
    } catch (e) { console.log("Error de audio"); }
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
        this.vx = (Math.random() - 0.5) * 8; this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1; this.color = color || "#00d4ff";
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 2 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); this.x += this.vx; this.y += this.vy; this.alpha -= 0.03;
    }
}

class Letra {
    constructor(col) { this.col = col; this.reset(); this.y = Math.random() * (H * 0.4); }
    reset() {
        this.esComodin = Math.random() < 0.12;
        this.char = this.esComodin ? "?" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
        this.x = (W * 0.35) + (this.col * ((W * 0.6) / 10));
        this.y = Math.random() * -100;
        this.vel = (1.2 + Math.random() * 1.5) * scale;
        this.dragging = false;
    }
    update() { 
        if (!this.dragging && juegoActivo) { 
            this.y += this.vel; 
            if (this.y > H * 0.79) this.reset(); // Muere antes de las casillas
        } 
    }
    draw() {
        ctx.save();
        ctx.font = `300 ${42 * scale}px 'Segoe UI', Arial`;
        ctx.textAlign = "center";
        if (this.esComodin) { ctx.fillStyle = "#f1c40f"; ctx.shadowBlur = 10; ctx.shadowColor = "#f1c40f"; }
        else { ctx.fillStyle = this.dragging ? "#00d4ff" : "white"; }
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

function iniciarLogica() {
    palabrasObj = [...TEMAS[temaSel]].sort(() => 0.5 - Math.random());
    tiempoTotal = NIVELES[nivelSel] * 1000; tiempoRestante = tiempoTotal;
    juegoActivo = true; casillas = [];
    let n = 8, anchoArea = W * 0.6;
    let wC = (anchoArea / n) * 0.85;
    let hC = wC * 1.4;
    for(let i=0; i<n; i++) {
        casillas.push({ x: (W*0.35) + i*(anchoArea/n), y: H*0.80, w: wC, h: hC, letra: "" });
    }
    letras = Array.from({length: 12}, (_, i) => new Letra(i % 10));
    actualizarSidebar();
    requestAnimationFrame(loop);
}

function loop(t) {
    let dt = t - ultimoFrame; ultimoFrame = t;
    ctx.clearRect(0, 0, W, H);
    if (juegoActivo) { 
        tiempoRestante -= dt; 
        if (tiempoRestante <= 0 || palabrasObj.length === 0) juegoActivo = false; 
    }

    // Barra de tiempo
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.fillRect(W*0.35, 40, W*0.6, 4);
    ctx.fillStyle = "#00d4ff"; ctx.fillRect(W*0.35, 40, (W*0.6) * (tiempoRestante/tiempoTotal), 4);

    letras.forEach(l => { l.update(); l.draw(); });
    particulas = particulas.filter(p => p.alpha > 0); particulas.forEach(p => p.draw());

    casillas.forEach(c => {
        ctx.fillStyle = c.letra ? "rgba(0, 212, 255, 0.2)" : "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = c.letra ? "#00d4ff" : "rgba(0, 212, 255, 0.3)";
        ctx.lineWidth = c.letra ? 2 : 1;
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        if (c.letra) {
            ctx.save();
            ctx.fillStyle = c.letra === "?" ? "#f1c40f" : "#ffffff";
            ctx.font = `300 ${32 * scale}px 'Segoe UI', Arial`; ctx.textAlign = "center";
            ctx.fillText(c.letra, c.x + c.w/2, c.y + c.h/2 + 10);
            ctx.restore();
        }
    });

    if (letraArrastrada) letraArrastrada.draw();
    if (!juegoActivo) {
        ctx.fillStyle = "rgba(10, 23, 30, 0.9)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white"; ctx.textAlign = "center"; 
        ctx.font = `300 ${24 * scale}px 'Segoe UI'`;
        ctx.fillText(palabrasObj.length === 0 ? "¡VICTORIA!" : "TIEMPO AGOTADO", W/2, H/2 - 60);
        document.getElementById('btn-reiniciar').style.display = 'block';
    }
    requestAnimationFrame(loop);
}

function manejarInicio(e) {
    if (!juegoActivo) return;
    const pos = getPos(e);
    
    // Al sacar de casilla
    casillas.forEach(c => {
        if (pos.x > c.x && pos.x < c.x+c.w && pos.y > c.y && pos.y < c.y+c.h && c.letra !== "") {
            sndPop();
            letraArrastrada = new Letra(99); letraArrastrada.char = c.letra;
            letraArrastrada.x = pos.x; letraArrastrada.y = pos.y;
            letraArrastrada.dragging = true; c.letra = "";
        }
    });
    // Al atrapar de la lluvia
    if (!letraArrastrada) {
        letras.forEach(l => { 
            if (Math.abs(l.x - pos.x) < 45*scale && Math.abs(l.y - pos.y) < 45*scale) { 
                sndPop();
                letraArrastrada = l; l.dragging = true; 
            } 
        });
    }
}

function manejarFin() {
    if (!letraArrastrada) return;
    let colocada = false;
    casillas.forEach(c => {
        if (letraArrastrada.x > c.x && letraArrastrada.x < c.x+c.w && letraArrastrada.y > c.y-50 && letraArrastrada.y < c.y+50) {
            if (c.letra === "") { c.letra = letraArrastrada.char; colocada = true; }
        }
    });
    if (colocada && letraArrastrada.col !== 99) letraArrastrada.reset();
    if (letraArrastrada) letraArrastrada.dragging = false; letraArrastrada = null;
    if (colocada) setTimeout(verificar, 10);
}

function verificar() {
    let cadena = casillas.map(c => c.letra || " ");
    palabrasObj.forEach((palabra, i) => {
        for (let inicio = 0; inicio <= casillas.length - palabra.length; inicio++) {
            let coincide = true; let indCom = [];
            for (let j = 0; j < palabra.length; j++) {
                let lt = cadena[inicio + j];
                if (lt === "?") indCom.push(inicio + j);
                else if (lt !== palabra[j]) { coincide = false; break; }
            }
            if (coincide) {
                sndWin();
                indCom.forEach(idx => { casillas[idx].letra = palabra[idx-inicio]; sndMagic(); });
                setTimeout(() => { palabrasObj.splice(i, 1); actualizarSidebar(); }, 400);
                for(let k=inicio; k<inicio+palabra.length; k++) {
                    for(let p=0; p<10; p++) particulas.push(new Particula(casillas[k].x+casillas[k].w/2, casillas[k].y+casillas[k].h/2));
                    casillas[k].letra = "";
                }
                return;
            }
        }
    });
}

function empezarPartida() { 
    if (audioCtx.state === 'suspended') audioCtx.resume(); 
    menu.style.display = 'none'; 
    canvas.style.display = 'block'; 
    resize(); 
    iniciarLogica(); 
}

function setTema(t, b) { temaSel = t; document.querySelectorAll('#grupo-temas .btn-opcion').forEach(x => x.classList.remove('active')); b.classList.add('active'); }
function setNivel(n, b) { nivelSel = n; document.querySelectorAll('#grupo-niveles .btn-opcion').forEach(x => x.classList.remove('active')); b.classList.add('active'); }
function actualizarSidebar() {
    const s = document.getElementById('sidebar-words'); s.innerHTML = "";
    palabrasObj.forEach(p => { const d = document.createElement('div'); d.className = 'word-pill'; d.innerText = p; s.appendChild(d); });
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