const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H, scale, activo = false;
let pActual = "", cola = [], letras = [], casillas = [];
let rX = 0, rVel = 0.3, pts = 0, letraArrastrada = null;

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
    "BOLSO", "GORRA", "BOTA", "PAPEL", "REGAL"
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

    letras = Array.from({length: 35}, () => new Letra());
    activo = true;
    lanzarPalabra();
    requestAnimationFrame(loop);
}

function lanzarPalabra() {
    if (cola.length === 0) cola = [...TEMAS[temaSel]].sort(() => Math.random() - 0.5);
    pActual = String(cola.shift());
    rX = W - 50;
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
    constructor() { this.reset(); this.y = Math.random() * H; }
    reset() {
        const rand = Math.random();
        this.esComodin = rand < 0.05; 

        if (this.esComodin) {
            this.char = "⭐";
        } else {
            // --- SISTEMA DE AYUDA MEJORADO AL 80% ---
            // Forzamos que pActual sea siempre un texto válido
            const palabraObjetivo = (pActual && pActual !== "undefined") ? String(pActual) : "TIGRE";
            
            // 80% de probabilidad de que salga una letra de la palabra actual
            if (Math.random() < 0.8) {
                this.char = palabraObjetivo[Math.floor(Math.random() * palabraObjetivo.length)];
            } else {
                // 20% de probabilidad de letra aleatoria para mantener el reto
                const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                this.char = alfabeto[Math.floor(Math.random() * alfabeto.length)];
            }
        }

        

        this.x = 50 + Math.random() * (W - 100);
        this.y = -50;
        this.v = (1 + Math.random() * 1) * scale;
        this.dragging = false;
    }
}

function loop() {
    if (!activo) return;
    ctx.clearRect(0, 0, W, H);

// --- 1. Título y Marcador de Puntos Pro ---
ctx.save();

// A. TÍTULO DEL JUEGO
const titleText = "LLUVIA DE LETRAS";

ctx.font = `bold ${42 * scale}px Arial`;
ctx.textAlign = "left";
ctx.textBaseline = "middle";
ctx.fillStyle = "#00FFFF";
ctx.shadowColor = "#00FFFF";
ctx.shadowBlur = 18 * scale;

ctx.fillText(titleText, 30 * scale, 40 * scale);

// B. MARCADOR DE PUNTOS
const scoreText = `PUNTOS: ${pts}`;
ctx.font = `bold ${24 * scale}px Arial`;

const scoreWidth = ctx.measureText(scoreText).width;

// Dimensiones del contenedor
const padX = 20 * scale;
const padY = 10 * scale;
const boxW = scoreWidth + (padX * 2);
const boxH = (30 * scale) + (padY * 2);
const boxX = W - boxW - (30 * scale);
const boxY = 10 * scale;

// Fondo con efecto cristal
ctx.shadowBlur = 0;
ctx.fillStyle = "rgba(11, 17, 22, 0.8)";
roundRect(boxX, boxY, boxW, boxH, 12 * scale, true, false);

// Borde con brillo cian
ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
ctx.lineWidth = 2 * scale;
ctx.shadowBlur = 12 * scale;
ctx.shadowColor = "#00d4ff";
roundRect(boxX, boxY, boxW, boxH, 12 * scale, false, true);

// Texto de la puntuación
ctx.shadowBlur = 0;
ctx.fillStyle = "#00d4ff";
ctx.font = `bold ${24 * scale}px Arial`;
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText(
    scoreText,
    boxX + boxW / 2,
    boxY + boxH / 2
);

ctx.restore();

// 2. Palabra Objetivo (Cajón)
    rX -= rVel;
    let esPeligro = rX < W * 0.3;
    ctx.font = `bold ${38 * scale}px Arial`;
    let textWidth = ctx.measureText(pActual).width + 60;
    
    ctx.save();
    ctx.strokeStyle = esPeligro ? "#ff4d4d" : "#00d4ff";
    ctx.lineWidth = 3;
    
    // Posición Y cambiada a 20 para subirlo
    roundRect(rX, 50, textWidth, 50, 10, false, true);
    ctx.fillStyle = "rgba(11, 17, 22, 0.9)";
    roundRect(rX, 50, textWidth, 50, 10, true, false);
    
    ctx.fillStyle = esPeligro ? "#ff4d4d" : "white";
    ctx.textAlign = "center";
    ctx.fillText(pActual, rX + textWidth/2, 90); // Texto ajustado proporcionalmente a Y=20
    ctx.restore();

    if (rX + textWidth < 0) {
        activo = false;
        document.getElementById('game-over-screen').style.display = 'flex';
        return;
    }


    // 4. Lluvia de Letras
    letras.forEach(l => {
        if (!l.dragging) l.y += l.v;
        if (l.y > H + 50) l.reset();
        
        if ((l.y > 160 && l.y < H * 0.78) || l.dragging) {
            ctx.save();
            ctx.fillStyle = l.esComodin ? "#f1c40f" : (l.dragging ? "#00d4ff" : "white");
            ctx.font = `bold ${40 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(l.char, l.x, l.y);
            ctx.restore();
        }
    });
    // 3. Casillas
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

// LÓGICA DE CAPTURA MEJORADA
function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
}

function alTocar(e) {
    if (!activo) return;
    const pos = getPos(e);

    // 1. Intentar agarrar de casilla
    for (let c of casillas) {
        if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h && c.char !== "") {
            letraArrastrada = { char: c.char, esComodin: c.esComodin, x: pos.x, y: pos.y, deCasilla: true };
            c.char = ""; c.esComodin = false;
            return;
        }
    }

    // 2. Intentar agarrar de lluvia (Área de clic más grande: 50px)
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
    
    let exito = false;
    for (let c of casillas) {
        if (letraArrastrada.x > c.x && letraArrastrada.x < c.x + c.w && letraArrastrada.y > c.y && letraArrastrada.y < c.y + c.h) {
            if (c.char === "") {
                c.char = letraArrastrada.char;
                c.esComodin = letraArrastrada.esComodin;
                exito = true;
                verificar();
                break;
            }
        }
    }

    // Si venía de la lluvia, resetearla. Si era de casilla y no se puso en otra, desaparece.
    if (letraArrastrada.reset) {
        letraArrastrada.reset();
        letraArrastrada.dragging = false;
    }
    letraArrastrada = null;
}

function verificar() {
    let formada = casillas.map(c => c.char).join("");
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
        rVel = Math.min(rVel + 0.02, 1.2);
        casillas.forEach(c => { c.char = ""; c.esComodin = false; });
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