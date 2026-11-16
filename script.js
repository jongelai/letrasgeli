const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H, scale, activo = false;
let pActual = "", cola = [], letras = [], casillas = [];
let rX = 0, pts = 0, letraArrastrada = null;
let particulas = [];
let textosFlotantes = [];

// --- CONFIGURACIÓN DE VELOCIDADES ---
const CONFIG = {
    caidaMin: 1.2,
    caidaMax: 2.2,
    segundosCruce: 18, 
    multiplicadorVelocidad: 1
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
    W = window.innerWidth; 
    H = window.innerHeight;
    canvas.width = W; 
    canvas.height = H;
    scale = Math.max(0.65, Math.min(W / 800, H / 600));
}

// ==========================================
// SISTEMA DE PARTÍCULAS
// ==========================================
function emitirEstelaArrastre(x, y, esComodin) {
    for (let i = 0; i < 2; i++) {
        particulas.push({
            x: x + (Math.random() - 0.5) * 14 * scale,
            y: y + (Math.random() - 0.5) * 14 * scale,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6 + 0.5, // Caen suavemente
            size: (2.5 + Math.random() * 3.5) * scale,
            color: esComodin ? "#f1c40f" : (Math.random() > 0.4 ? "#00FFFF" : "#ffffff"),
            alpha: 0.9,
            decay: 0.045,
            gravedad: 0.03
        });
    }
}

function emitirExplosionCasillas() {
    // Genera una explosión radial en cada casilla que tenía letra
    casillas.forEach(c => {
        if (c.char !== "") {
            const cx = c.x + c.w / 2;
            const cy = c.y + c.h / 2;
            for (let i = 0; i < 18; i++) {
                const angulo = Math.random() * Math.PI * 2;
                const velocidad = (2 + Math.random() * 6.5) * scale;
                particulas.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angulo) * velocidad,
                    vy: Math.sin(angulo) * velocidad - (2.5 * scale),
                    size: (3 + Math.random() * 4.5) * scale,
                    color: c.esComodin ? "#f1c40f" : (Math.random() > 0.35 ? "#00FFFF" : "#ffea00"),
                    alpha: 1,
                    decay: 0.02 + Math.random() * 0.015,
                    gravedad: 0.16 * scale
                });
            }
        }
    });
}

function empezarPartida() {
    document.getElementById('menu-inicio').style.display = 'none';
    resize();
    pts = 0;
    particulas = [];
    textosFlotantes = [];
    CONFIG.multiplicadorVelocidad = 1;
    sonarAcierto();
    cola = [...TEMAS[temaSel]].sort(() => Math.random() - 0.5);
    
    let n = 8;
    let anchoC = Math.min(W * 0.94, 620);
    let startX = (W - anchoC) / 2;
    let gap = (anchoC / n) * 0.12;
    let cellW = (anchoC / n) - gap;
    let cellH = Math.min(cellW * 1.25, H * 0.1);

    casillas = Array.from({length: n}, (_, i) => ({
        x: startX + i * (anchoC / n) + gap / 2, 
        y: H - cellH - (H * 0.04),
        w: cellW, 
        h: cellH, 
        char: "", 
        esComodin: false
    }));

    const minColWidth = W < 600 ? 62 : 90;
    const numColumnas = Math.max(5, Math.floor((W * 0.92) / minColWidth));
    const numFilas = Math.max(4, Math.ceil(H / 140));

    letras = Array.from({length: numColumnas * numFilas}, (_, i) => {
        const columna = i % numColumnas;
        const fila = Math.floor(i / numColumnas);
        const letra = new Letra(columna, numColumnas);
        letra.y = -40 - (fila * (H / numFilas)); 
        return letra;
    });

    activo = true;
    lanzarPalabra();
    requestAnimationFrame(loop);
}

function lanzarPalabra() {
    if (cola.length === 0) cola = [...TEMAS[temaSel]].sort(() => Math.random() - 0.5);
    pActual = String(cola.shift());
    rX = W;
    letras.forEach((l, index) => {
        if (index % 2 === 0 && !l.dragging) {
            l.asignarCaracter();
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

    asignarCaracter() {
        const rand = Math.random();
        this.esComodin = rand < 0.05; 

        if (this.esComodin) {
            this.char = "⭐";
        } else {
            const palabraObjetivo = (pActual && pActual !== "undefined") ? String(pActual) : "TIGRE";
            if (Math.random() < 0.72) {
                this.char = palabraObjetivo[Math.floor(Math.random() * palabraObjetivo.length)];
            } else {
                const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                this.char = alfabeto[Math.floor(Math.random() * alfabeto.length)];
            }
        }
    }

    reset() {
        this.asignarCaracter();

        const margen = W * 0.04;
        const anchoUtil = W - margen * 2;
        this.x = margen + (this.columnaIndex + 0.5) * (anchoUtil / this.numColumnas);

        let minY = 0;
        if (typeof letras !== 'undefined' && letras.length > 0) {
            const companeras = letras.filter(l => l !== this && l.columnaIndex === this.columnaIndex);
            if (companeras.length > 0) {
                minY = Math.min(...companeras.map(l => l.y));
            }
        }
        const separacionMinima = 110 * scale;
        this.y = minY > 0 ? -40 - Math.random() * 50 : minY - separacionMinima - Math.random() * 40;
        
        const factorAltura = H / 750;
        this.v = (CONFIG.caidaMin + Math.random() * (CONFIG.caidaMax - CONFIG.caidaMin)) * factorAltura;
        this.dragging = false;
    }
}

function loop() {
    if (!activo) return;
    ctx.clearRect(0, 0, W, H);

    // --- 1. Título y Marcador de Puntos ---
    ctx.save();
    const titleSize = Math.min(36 * scale, W * 0.055);
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00FFFF";
    ctx.shadowColor = "#00FFFF";
    ctx.shadowBlur = 15 * scale;
    ctx.fillText("LLUVIA DE LETRAS", 20 * scale, 35 * scale);

    const scoreText = `PUNTOS: ${pts}`;
    const scoreSize = Math.min(22 * scale, W * 0.04);
    ctx.font = `bold ${scoreSize}px Arial`;
    const scoreWidth = ctx.measureText(scoreText).width;

    const padX = 16 * scale;
    const padY = 8 * scale;
    const boxW = scoreWidth + (padX * 2);
    const boxH = scoreSize + (padY * 2);
    const boxX = W - boxW - (20 * scale);
    const boxY = (35 * scale) - (boxH / 2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(11, 17, 22, 0.85)";
    roundRect(boxX, boxY, boxW, boxH, 10 * scale, true, false);

    ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10 * scale;
    ctx.shadowColor = "#00d4ff";
    roundRect(boxX, boxY, boxW, boxH, 10 * scale, false, true);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#00d4ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(scoreText, boxX + boxW / 2, boxY + boxH / 2);
    ctx.restore();

    // --- 2. Palabra Objetivo ---
    const velocidadRelativa = (W / (CONFIG.segundosCruce * 60)) * CONFIG.multiplicadorVelocidad;
    rX -= velocidadRelativa;

    let esPeligro = rX < W * 0.25;
    const targetFontSize = 32 * scale;
    ctx.font = `bold ${targetFontSize}px Arial`;
    let textWidth = ctx.measureText(pActual).width + (44 * scale);
    let targetBoxH = 46 * scale;
    let targetBoxY = boxY + boxH + (15 * scale);
    
    ctx.save();
    ctx.fillStyle = "rgba(11, 17, 22, 0.92)";
    roundRect(rX, targetBoxY, textWidth, targetBoxH, 10 * scale, true, false);

    ctx.strokeStyle = esPeligro ? "#ff4d4d" : "#00d4ff";
    ctx.lineWidth = 2.5;
    roundRect(rX, targetBoxY, textWidth, targetBoxH, 10 * scale, false, true);
    
    ctx.fillStyle = esPeligro ? "#ff4d4d" : "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pActual, rX + textWidth / 2, targetBoxY + targetBoxH / 2);
    ctx.restore();

  if (rX + textWidth < 0) {
        activo = false;
        sonarError();

        const finalScoreEl = document.getElementById('final-pts');
        if (finalScoreEl) finalScoreEl.innerText = `PUNTOS: ${pts}`;

        document.getElementById('game-over-screen').style.display = 'flex';
        return;
    }
    // --- 3. Casillas inferiores ---
    casillas.forEach(c => {
        ctx.save();
        const hoverCasilla = letraArrastrada && c.char === "" &&
            letraArrastrada.x > c.x - 10 * scale && letraArrastrada.x < c.x + c.w + 10 * scale &&
            letraArrastrada.y > c.y - 10 * scale && letraArrastrada.y < c.y + c.h + 10 * scale;

        ctx.fillStyle = hoverCasilla ? "rgba(0, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.06)";
        roundRect(c.x, c.y, c.w, c.h, 8 * scale, true, false);
        ctx.strokeStyle = hoverCasilla ? "#00FFFF" : (c.char ? (c.esComodin ? "#f1c40f" : "#00d4ff") : "rgba(255,255,255,0.2)");
        ctx.lineWidth = (c.char || hoverCasilla) ? 2.5 : 1.5;
        roundRect(c.x, c.y, c.w, c.h, 8 * scale, false, true);
        if (c.char) {
            ctx.fillStyle = c.esComodin ? "#f1c40f" : "white";
            ctx.font = `bold ${c.w * 0.65}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(c.char, c.x + c.w / 2, c.y + c.h / 2);
        }
        ctx.restore();
    });

    // --- 4. Lluvia de Letras ---
    const limiteSuperiorLluvia = targetBoxY + targetBoxH + (20 * scale);
    const limiteInferiorLluvia = casillas[0].y - (15 * scale);

    letras.forEach(l => {
        if (!l.dragging) l.y += l.v;
        if (l.y > H + 40) l.reset();
        
        if ((l.y > limiteSuperiorLluvia && l.y < limiteInferiorLluvia) || l.dragging) {
            ctx.save();
            ctx.fillStyle = l.esComodin ? "#f1c40f" : (l.dragging ? "#00d4ff" : "white");
            ctx.font = `bold ${36 * scale}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(l.char, l.x, l.y);
            ctx.restore();
        }
    });

    // --- 5. Actualizar y Dibujar Partículas ---
    for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravedad;
        p.alpha -= p.decay;
        p.size *= 0.97;

        if (p.alpha <= 0 || p.size < 0.3) {
            particulas.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- 6. Textos Flotantes (+100 / +150) ---
    for (let i = textosFlotantes.length - 1; i >= 0; i--) {
        const t = textosFlotantes[i];
        t.y += t.vy;
        t.alpha -= 0.02;

        if (t.alpha <= 0) {
            textosFlotantes.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.fillStyle = "#f1c40f";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 6;
        ctx.font = `bold ${30 * scale}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(t.texto, t.x, t.y);
        ctx.restore();
    }

    // --- 7. Letra Arrastrada ---
    if (letraArrastrada) {
        ctx.save();
        ctx.fillStyle = letraArrastrada.esComodin ? "#f1c40f" : "#00d4ff";
        ctx.shadowColor = letraArrastrada.esComodin ? "#f1c40f" : "#00FFFF";
        ctx.shadowBlur = 12 * scale;
        ctx.font = `bold ${44 * scale}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
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
            emitirEstelaArrastre(pos.x, pos.y, letraArrastrada.esComodin);
            return;
        }
    }

    const radioTactil = Math.max(45, 55 * scale);
    for (let l of letras) {
        if (Math.hypot(l.x - pos.x, l.y - pos.y) < radioTactil) {
            l.dragging = true;
            letraArrastrada = l;
            emitirEstelaArrastre(pos.x, pos.y, l.esComodin);
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
        
        // Soltar partículas continuamente mientras se arrastra
        emitirEstelaArrastre(pos.x, pos.y, letraArrastrada.esComodin);
    }
}

function alSoltar() {
    if (!letraArrastrada) return;
    
    const margenDrop = 10 * scale;
    for (let c of casillas) {
        if (letraArrastrada.x > c.x - margenDrop && 
            letraArrastrada.x < c.x + c.w + margenDrop && 
            letraArrastrada.y > c.y - margenDrop && 
            letraArrastrada.y < c.y + c.h + margenDrop) {
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
        const bonusRapidez = rX > W * 0.5 ? 50 : 0;
        const ganado = 100 + bonusRapidez;
        pts += ganado;

        // Dispara la explosión ANTES de vaciar las casillas para usar sus coordenadas
        emitirExplosionCasillas();
        textosFlotantes.push({
            x: W / 2,
            y: casillas[0].y - 15 * scale,
            texto: bonusRapidez ? `+${ganado} ¡RÁPIDO!` : `+${ganado}`,
            alpha: 1,
            vy: -1.5 * scale
        });

        CONFIG.multiplicadorVelocidad = Math.min(CONFIG.multiplicadorVelocidad + 0.08, 2.5);
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