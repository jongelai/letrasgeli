const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H, scale, activo = false;
let pActual = "", cola = [], letras = [], casillas = [];
let rX = 0, pts = 0, letraArrastrada = null;

// --- CONFIGURACIÓN DE VELOCIDADES ---
const CONFIG = {
    // Velocidad de caída de las letras (mínima y máxima para la aleatoriedad)
    caidaMin: 1,
    caidaMax: 2.5,
    
    // Velocidad a la que cruza la palabra objetivo horizontalmente
    palabraHorizontal: 0.5
};

const TEMAS = {
    "ANIMALES": [
        "LOBO", "TIGRE", "MONO", "CEBRA", "PANDA",
        "LEON", "GATO", "PERRO", "RANA", "SAPO",
        "FOCA", "KOALA", "BURRO", "MULA", "OVEJA",
        "CABRA", "PATO", "CISNE", "MOSCA", "RATON"
    ],

    "PLANTAS": [
        "ROSA", "PINO", "ALGA", "OLMO", "BAMBU",
        "FLOR", "LIRIO", "CACTO", "MUSGO", "HELEO",
        "NARDO", "HONGO", "TRIGO", "MAIZ", "ARROZ",
        "SAUCE", "FRESNO", "CEDRO", "ABETO", "MIMOS"
    ],

    "COLORES": [
        "ROJO", "AZUL", "VERDE", "GRIS", "ROSA",
        "CIAN", "NEGRO", "BLANCO", "LILA", "OCRE",
        "BEIGE", "MORADO", "CREMA", "CORAL", "COBRE",
        "PLATA", "ORO", "VIOLETA", "JADE", "TURQ"
    ],

    "COMIDA": [
        "PAN", "ARROZ", "PASTA", "PIZZA", "QUESO",
        "FLAN", "TARTA", "SOPA", "PURE", "HUEVO",
        "NUEZ", "PERA", "MELON", "MANGO", "KIWI",
        "LIMON", "UVA", "FRESA", "CACAO", "MIEL"
    ],

    "PAISES": [
        "CHILE", "CHINA", "JAPON", "INDIA", "NEPAL",
        "EGIPTO", "KENIA", "HAITI", "CUBA", "PERU",
        "IRAN", "IRAQ", "ITALIA", "RUSIA", "SUIZA",
        "MALTA", "GABON", "SAMOA", "TOGO", "BENIN"
    ],

    "CUERPO": [
        "MANO", "PIE", "CODO", "RODILLA", "DEDOS",
        "LABIO", "NARIZ", "BOCA", "OJO", "CEJA",
        "PELO", "UÑA", "PIEL", "FEMUR", "TIBIA",
        "SENOS", "MENTON", "TALON", "NUCA", "DORSO"
    ],

    "VARIOS": [
        "MESA", "SILLA", "CAMA", "VASO", "PLATO",
        "TENEDOR", "RELOJ", "LLAVE", "LIBRO", "LAPIZ",
        "GOMA", "FOCO", "RADIO", "MOVIL", "CAJON",
        "BOLSO", "GORRA", "BOTA", "PAPEL", "PEDAL"
    ]
};
let temaSel = "ANIMALES";

function setTema(t, btn) {
    temaSel = t;
    document.querySelectorAll('.btn-opcion').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    scale = Math.min(W/800, H/600);
}

function empezarPartida() {
    document.getElementById('menu-inicio').style.display = 'none';
    resize();
    pts = 0;
    sonarAcierto();
    cola = [...TEMAS[temaSel]].sort(() => Math.random() - 0.5);
    
    let n = 8;
    let anchoC = Math.min(W * 0.92, 600);
    let startX = (W - anchoC) / 2;
    casillas = Array.from({length: n}, (_, i) => ({
        x: startX + i * (anchoC/n), 
        y: H * 0.82, 
        w: (anchoC/n) * 0.85, 
        h: (anchoC/n) * 1.1, 
        char: "", 
        esComodin: false
    }));

    const numColumnas = Math.max(5, Math.floor(W / 90));

    letras = Array.from({length: numColumnas * 3}, (_, i) => {
        const columna = i % numColumnas;
        const fila = Math.floor(i / numColumnas);

        const letra = new Letra(columna, numColumnas);
        letra.y = -50 - (fila * 120); 

        return letra;
    });

    activo = true;
    lanzarPalabra();
    requestAnimationFrame(loop);
}

function lanzarPalabra() {
    if (cola.length === 0) cola = [...TEMAS[temaSel]].sort(() => Math.random() - 0.5);
    pActual = String(cola.shift());
    rX = W - 50;
    letras.forEach((l, index) => {
        if (index % 2 === 0 && !l.dragging) {
            l.reset();
        }
    });
}

function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

class Letra {
    constructor(columnaIndex, numColumnas) { 
        this.columnaIndex = columnaIndex;
        this.numColumnas = numColumnas;
        this.reset();
    }
    reset() {
        const rand = Math.random();
        this.esComodin = rand < 0.05; 

        if (this.esComodin) {
            this.char = "⭐";
        } else {
            const palabraObjetivo = (pActual && pActual !== "undefined") ? String(pActual) : "TIGRE";
            
            if (Math.random() < 0.7) {
                this.char = palabraObjetivo[Math.floor(Math.random() * palabraObjetivo.length)];
            } else {
                const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                this.char = alfabeto[Math.floor(Math.random() * alfabeto.length)];
            }
        }

        const margen = W * 0.05;
        const anchoUtil = W - margen * 2;
        this.x = margen + (this.columnaIndex + 0.5) * (anchoUtil / this.numColumnas);

        let minY = 0;
        if (typeof letras !== 'undefined' && letras.length > 0) {
            const companeras = letras.filter(l => l !== this && l.columnaIndex === this.columnaIndex);
            if (companeras.length > 0) {
                minY = Math.min(...companeras.map(l => l.y));
            }
        }
        this.y = minY > 0 ? -50 - Math.random() * 60 : minY - 130 - Math.random() * 50;
        this.v = (CONFIG.caidaMin + Math.random() * (CONFIG.caidaMax - CONFIG.caidaMin)) * scale;
        this.dragging = false;
    }
}

function loop() {
    if (!activo) return;
    ctx.clearRect(0, 0, W, H);

    // --- 1. Título y Marcador de Puntos Pro ---
    ctx.save();
    const titleText = "LLUVIA DE LETRAS";

    ctx.font = `bold ${42 * scale}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00FFFF";
    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 18 * scale;
    ctx.fillText(titleText, 30 * scale, 40 * scale);

    const scoreText = `PUNTOS: ${pts}`;
    ctx.font = `bold ${24 * scale}px Arial`;
    const scoreWidth = ctx.measureText(scoreText).width;

    const padX = 20 * scale;
    const padY = 10 * scale;
    const boxW = scoreWidth + (padX * 2);
    const boxH = (30 * scale) + (padY * 2);
    const boxX = W - boxW - (30 * scale);
    const boxY = 10 * scale;

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(11, 17, 22, 0.8)";
    roundRect(boxX, boxY, boxW, boxH, 12 * scale, true, false);

    ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
    ctx.lineWidth = 2 * scale;
    ctx.shadowBlur = 12 * scale;
    ctx.shadowColor = "#00d4ff";
    roundRect(boxX, boxY, boxW, boxH, 12 * scale, false, true);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#00d4ff";
    ctx.font = `bold ${24 * scale}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(scoreText, boxX + boxW / 2, boxY + boxH / 2);
    ctx.restore();

    // --- 2. Palabra Objetivo (Cajón deslizante) ---
    rX -= CONFIG.palabraHorizontal;
    let esPeligro = rX < W * 0.3;
    ctx.font = `bold ${38 * scale}px Arial`;
    let textWidth = ctx.measureText(pActual).width + 60;
    
    ctx.save();
    ctx.strokeStyle = esPeligro ? "#ff4d4d" : "#00d4ff";
    ctx.lineWidth = 3;
    
    roundRect(rX, 50, textWidth, 50, 10, false, true);
    ctx.fillStyle = "rgba(11, 17, 22, 0.9)";
    roundRect(rX, 50, textWidth, 50, 10, true, false);
    
    ctx.fillStyle = esPeligro ? "#ff4d4d" : "white";
    ctx.textAlign = "center";
    ctx.fillText(pActual, rX + textWidth/2, 80);
    ctx.restore();

    if (rX + textWidth < 0) {
        activo = false;
        sonarError();
        document.getElementById('game-over-screen').style.display = 'flex';
        return;
    }

    // --- 3. Casillas inferiores ---
    casillas.forEach(c => {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        roundRect(c.x, c.y, c.w, c.h, 8, true, false);
        ctx.strokeStyle = c.char ? (c.esComodin ? "#f1c40f" : "#00d4ff") : "rgba(255,255,255,0.15)";
        ctx.lineWidth = c.char ? 3 : 1;
        roundRect(c.x, c.y, c.w, c.h, 8, false, true);
        if (c.char) {
            ctx.fillStyle = c.esComodin ? "#f1c40f" : "white";
            ctx.font = `bold ${32 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(c.char, c.x + c.w/2, c.y + c.h/2 + 12);
        }
        ctx.restore();
    });

    // --- 4. Lluvia de Letras ---
    letras.forEach(l => {
        if (!l.dragging) l.y += l.v;
        if (l.y > H + 50) l.reset();
        
        if ((l.y > 100 && l.y < H * 0.78) || l.dragging) {
            ctx.save();
            ctx.fillStyle = l.esComodin ? "#f1c40f" : (l.dragging ? "#00d4ff" : "white");
            ctx.font = `bold ${40 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(l.char, l.x, l.y);
            ctx.restore();
        }
    });

    if (letraArrastrada) {
        ctx.save();
        ctx.fillStyle = letraArrastrada.esComodin ? "#f1c40f" : "#00d4ff";
        ctx.font = `bold ${45 * scale}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(letraArrastrada.char, letraArrastrada.x, letraArrastrada.y);
        ctx.restore();
    }

    requestAnimationFrame(loop);
}

// LÓGICA DE CAPTURA
function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
}

function alTocar(e) {
    if (!activo) return;
    const pos = getPos(e);

    for (let c of casillas) {
        if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h && c.char !== "") {
            letraArrastrada = { char: c.char, esComodin: c.esComodin, x: pos.x, y: pos.y, deCasilla: true };
            c.char = ""; c.esComodin = false;
            return;
        }
    }

    for (let l of letras) {
        if (Math.hypot(l.x - pos.x, l.y - pos.y) < 50 * scale) {
            l.dragging = true;
            letraArrastrada = l;
            return;
        }
    }
}

function alMover(e) {
    if (letraArrastrada) {
        if(e.cancelable) e.preventDefault();
        const pos = getPos(e);
        letraArrastrada.x = pos.x;
        letraArrastrada.y = pos.y;
    }
}

function alSoltar() {
    if (!letraArrastrada) return;
    
    for (let c of casillas) {
        if (letraArrastrada.x > c.x && letraArrastrada.x < c.x + c.w && letraArrastrada.y > c.y && letraArrastrada.y < c.y + c.h) {
            if (c.char === "") {
                c.char = letraArrastrada.char;
                c.esComodin = letraArrastrada.esComodin;
                sonarLetra();
                verificar();
                break;
            }
        }
    }

    if (letraArrastrada.reset) {
        letraArrastrada.reset();
        letraArrastrada.dragging = false;
    }
    letraArrastrada = null;
}

function verificar() {
    let matchGlobal = false;
    
    for (let i = 0; i <= casillas.length - pActual.length; i++) {
        let match = true;
        for (let j = 0; j < pActual.length; j++) {
            let c = casillas[i+j];
            if (c.char === "" || (!c.esComodin && c.char !== pActual[j])) { match = false; break; }
        }
        if (match) { matchGlobal = true; break; }
    }

    if (matchGlobal) {
        pts += 100;
        CONFIG.palabraHorizontal = Math.min(CONFIG.palabraHorizontal + 0.05, 2.0); // Acelera ligeramente al acertar
        casillas.forEach(c => { c.char = ""; c.esComodin = false; });
        sonarAcierto();
        lanzarPalabra();
    }
}

// Eventos unificados
canvas.addEventListener('mousedown', alTocar);
window.addEventListener('mousemove', alMover);
window.addEventListener('mouseup', alSoltar);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); alTocar(e); }, {passive: false});
window.addEventListener('touchmove', (e) => { alMover(e); }, {passive: false});
window.addEventListener('touchend', alSoltar);

window.addEventListener('resize', resize);
resize();

// ==========================================
// SISTEMA DE SONIDOS SIMPLE (WebAudio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function sonarLetra() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

function sonarAcierto() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notas = [523.25, 659.25, 783.99, 1046.50];
    notas.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const tiempoInicio = audioCtx.currentTime + (index * 0.06);
        gain.gain.setValueAtTime(0.15, tiempoInicio);
        gain.gain.exponentialRampToValueAtTime(0.01, tiempoInicio + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(tiempoInicio);
        osc.stop(tiempoInicio + 0.15);
    });
}

function sonarError() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}