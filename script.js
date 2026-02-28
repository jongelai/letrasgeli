const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu-inicio');
const runner = document.getElementById('word-runner');
const puntosTxt = document.getElementById('puntos');

let W, H, scale;
const TEMAS = {
    "ANIMALES": ["PERRO", "GATO", "LEON", "TIGRE", "CEBRA", "LOBO", "MONO", "VACA", "ELEFANTE", "JIRAFA"],
    "PLANTAS": ["ROSA", "PINO", "ALGA", "OLMO", "FLOR", "LIQUEN", "MOHO", "CEDRO", "PALMERA", "BAMBU"],
    "COLORES": ["ROJO", "AZUL", "VERDE", "GRIS", "ROSA", "AMARILLO", "CIAN", "NEGRO", "VIOLETA", "BLANCO"]
};

let temaSel = "ANIMALES", palabrasCola = [], casillas = [], letras = [];
let palabraActual = "", juegoActivo = false, puntos = 0;
let letraArrastrada = null, ultimoFrame = 0;

// Configuración de movimiento y dificultad
let runnerPosX = -200;
let runnerVel = 0.5; // Velocidad inicial (píxeles por frame aprox)
let multiplicadorVel = 1.05; // Aumento de velocidad cada palabra resuelta

function setTema(t, b) {
    temaSel = t;
    document.querySelectorAll('.btn-opcion').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
}

function empezarPartida() {
    menu.style.display = 'none';
    resize();
    iniciarLogica();
}

class Letra {
    constructor() { this.reset(); this.y = Math.random() * H; }
    reset() {
        const rand = Math.random();
        if (rand < 0.05) { this.char = "?"; this.esComodin = true; } 
        else if (rand < 0.85 && palabraActual) {
            this.char = palabraActual[Math.floor(Math.random() * palabraActual.length)];
            this.esComodin = false;
        } else {
            this.char = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
            this.esComodin = false;
        }
        this.x = 20 + Math.random() * (W - 40);
        this.y = -50 - Math.random() * 200;
        this.vel = (1.2 + Math.random() * 1.5) * scale;
        this.dragging = false;
    }
    update() {
        if (!this.dragging && juegoActivo) {
            this.y += this.vel;
            if (this.y > H * 0.82) this.reset();
        }
    }
    draw() {
        ctx.save();
        ctx.font = `${this.dragging ? 600 : 300} ${42 * scale}px 'Segoe UI'`;
        ctx.textAlign = "center";
        ctx.fillStyle = this.esComodin ? "#f1c40f" : (this.dragging ? "#00d4ff" : "white");
        ctx.fillText(this.char, this.x, this.y);
        ctx.restore();
    }
}

function iniciarLogica() {
    palabrasCola = [...TEMAS[temaSel]].sort(() => 0.5 - Math.random());
    puntos = 0; runnerVel += 0.1 * scale;
    puntosTxt.innerText = puntos;
    juegoActivo = true;
    
    let n = 8; let ancho = Math.min(W * 0.95, 700);
    let inicioX = (W - ancho) / 2;
    casillas = Array.from({length: n}, (_, i) => ({
        x: inicioX + i * (ancho / n), y: H * 0.85, w: (ancho / n) * 0.88, h: ((ancho / n) * 0.88) * 1.3, letra: ""
    }));
    
    letras = Array.from({length: 22}, () => new Letra());
    lanzarSiguientePalabra();
    ultimoFrame = performance.now();
    requestAnimationFrame(loop);
}

function lanzarSiguientePalabra() {
    if (palabrasCola.length > 0) {
        palabraActual = palabrasCola.shift();
        runnerPosX = W + 50; // Aparece por la derecha
        runner.style.right = "auto";
        runner.innerText = palabraActual;
    } else {
        // Si se acaban las palabras de la lista, rellenar con la misma categoría
        palabrasCola = [...TEMAS[temaSel]].sort(() => 0.5 - Math.random());
        lanzarSiguientePalabra();
    }
}

function loop(t) {
    if (!juegoActivo) return;
    let dt = (t - ultimoFrame) / 16; ultimoFrame = t;
    ctx.clearRect(0, 0, W, H);

    // Mover palabra de derecha a izquierda
    runnerPosX -= runnerVel * dt;
    runner.style.left = runnerPosX + "px";

    // Condición de derrota: Toca el borde izquierdo
    if (runnerPosX + runner.offsetWidth < 0) {
        finalizarJuego("¡LA PALABRA SE ESCAPÓ!");
        return;
    }

    letras.forEach(l => { l.update(); l.draw(); });
    casillas.forEach(c => {
        ctx.strokeStyle = c.letra ? "#00d4ff" : "rgba(255,255,255,0.1)";
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        if (c.letra) {
            ctx.fillStyle = c.letra === "?" ? "#f1c40f" : "white";
            ctx.font = `300 ${35 * scale}px 'Segoe UI'`;
            ctx.textAlign = "center"; ctx.fillText(c.letra, c.x + c.w/2, c.y + c.h/2 + 12);
        }
    });

    if (letraArrastrada) letraArrastrada.draw();
    requestAnimationFrame(loop);
}

function verificar() {
    if (!palabraActual) return;
    let cadena = casillas.map(c => c.letra || " ");
    
    for (let i = 0; i <= casillas.length - palabraActual.length; i++) {
        let coincide = true;
        for (let j = 0; j < palabraActual.length; j++) {
            let letraEnCasilla = cadena[i + j];
            if (letraEnCasilla === " ") { coincide = false; break; }
            if (letraEnCasilla !== "?" && letraEnCasilla !== palabraActual[j]) { coincide = false; break; }
        }

        if (coincide) {
            // Éxito: Sumar puntos y aumentar velocidad
            puntos += 100;
            puntosTxt.innerText = puntos;
            runnerVel *= multiplicadorVel; // Cada vez más rápido
            
            casillas.forEach(c => c.letra = ""); 
            palabraActual = "";
            setTimeout(lanzarSiguientePalabra, 100);
            return;
        }
    }
}

function finalizarJuego(msg) {
    juegoActivo = false;
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "white"; ctx.textAlign = "center";
    ctx.font = `300 ${40 * scale}px 'Segoe UI'`;
    ctx.fillText(msg, W / 2, H / 2 - 20);
    ctx.font = `300 ${25 * scale}px 'Segoe UI'`;
    ctx.fillText(`PUNTOS: ${puntos}`, W / 2, H / 2 + 30);
    document.getElementById('btn-reiniciar').style.display = "block";
}

// Interacción Arrastrar/Soltar (Igual que antes pero con verificar())
function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
}

function manejarInicio(e) {
    if (!juegoActivo) return;
    const pos = getPos(e);
    for (let c of casillas) {
        if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h && c.letra !== "") {
            letraArrastrada = new Letra(); letraArrastrada.char = c.letra;
            letraArrastrada.esComodin = (c.letra === "?");
            letraArrastrada.x = pos.x; letraArrastrada.y = pos.y;
            letraArrastrada.dragging = true; c.letra = ""; return;
        }
    }
    for (let l of letras) {
        if (Math.abs(l.x - pos.x) < 40 * scale && Math.abs(l.y - pos.y) < 40 * scale) {
            letraArrastrada = l; l.dragging = true; return;
        }
    }
}

function manejarFin() {
    if (!letraArrastrada) return;
    for (let c of casillas) {
        if (letraArrastrada.x > c.x && letraArrastrada.x < c.x + c.w && letraArrastrada.y > c.y && letraArrastrada.y < c.y + c.h) {
            if (!c.letra) { c.letra = letraArrastrada.char; verificar(); break; }
        }
    }
    if (letras.includes(letraArrastrada)) letraArrastrada.reset();
    letraArrastrada.dragging = false; letraArrastrada = null;
}

window.addEventListener('mousedown', manejarInicio);
window.addEventListener('mousemove', (e) => { if (letraArrastrada) { const pos = getPos(e); letraArrastrada.x = pos.x; letraArrastrada.y = pos.y; } });
window.addEventListener('mouseup', manejarFin);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); manejarInicio(e); }, { passive: false });
window.addEventListener('touchmove', (e) => { if (letraArrastrada) { e.preventDefault(); const pos = getPos(e); letraArrastrada.x = pos.x; letraArrastrada.y = pos.y; } }, { passive: false });
window.addEventListener('touchend', manejarFin);

function resize() { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; scale = Math.min(W / 800, H / 600); }
function reiniciar() { document.getElementById('btn-reiniciar').style.display = 'none'; iniciarLogica(); }
window.addEventListener('resize', resize);
resize();