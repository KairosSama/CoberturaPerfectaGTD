"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================
export interface AnalisisDistancia {
  medicion_tecnico_id: string;
  zona_referencia: string;
  distancia_metros: number;
  dentro_de_tolerancia: boolean;
}

export interface MedicionData {
  id_medicion: string;
  zona: string;
  tamano_estimado: string;
  dbm: number;
  precision_gps_metros: number;
  coordenadas?: { latitud: number; longitud: number };
  analisis_distancia?: AnalisisDistancia;
}

export interface ActaCertificacion {
  id_acta: string;
  tipo_registro: 'Visita Técnica' | 'Autoevaluación Cliente';
  fecha_formateada: string;
  mediciones: MedicionData[];
}

export type VistaActiva = "tecnico" | "cliente" | "overlay";

export type HeatmapPoint = {
  id?: string | number;
  latitud: number;
  longitud: number;
  dbm: number;
  origen?: "tecnico" | "cliente";
  id_acta?: string;
  zona?: string;
  tamano_estimado?: string;
  precision_gps_metros?: number;
};

interface HeatmapClientProps {
  actasSeleccionadas: ActaCertificacion[];
}

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN MATEMÁTICA
// ============================================================================
const titulos: Record<VistaActiva, string> = {
  tecnico: "Heatmap: Línea Base del Técnico",
  cliente: "Heatmap: Reportes del Cliente",
  overlay: "Heatmap: Comparativa Técnico vs Cliente",
};

const CANVAS_WIDTH = 1200; 
const CANVAS_HEIGHT = 800;
const PADDING = 120; 

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function filtrarPorVista(points: HeatmapPoint[], vista: VistaActiva) {
  if (vista === "overlay") return points;
  return points.filter((point) => point.origen === vista);
}

function obtenerColorOrigen(origen?: "tecnico" | "cliente") {
  return origen === "tecnico" ? "#002855" : "#00A4E4";
}

function colorPorDbm(dbm: number): [number, number, number] {
  if (dbm >= -60) return [16, 185, 129];
  if (dbm >= -70) return [250, 204, 21];
  if (dbm >= -80) return [249, 115, 22];
  return [239, 68, 68];
}

function interpolarColorPorDbm(dbm: number): [number, number, number] {
  const stops = [
    { dbm: -90, color: [220, 38, 38] },
    { dbm: -80, color: [239, 68, 68] },
    { dbm: -70, color: [250, 204, 21] },
    { dbm: -60, color: [16, 185, 129] },
    { dbm: -45, color: [5, 150, 105] },
  ];
  if (dbm <= -90) return [220, 38, 38];
  if (dbm >= -45) return [5, 150, 105];
  
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (dbm >= a.dbm && dbm <= b.dbm) {
      const t = (dbm - a.dbm) / (b.dbm - a.dbm);
      return [
        Math.round(a.color[0] + (b.color[0] - a.color[0]) * t),
        Math.round(a.color[1] + (b.color[1] - a.color[1]) * t),
        Math.round(a.color[2] + (b.color[2] - a.color[2]) * t),
      ];
    }
  }
  return colorPorDbm(dbm);
}

// ============================================================================
// MOTOR DE PROYECCIÓN ESPACIAL (HALOS CONTROLADOS, GPS DESACOPLADO)
// ============================================================================
function proyectarPuntos(points: HeatmapPoint[]) {
  const validos = points.filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
  if (validos.length === 0) return [];

  const minLatActual = Math.min(...validos.map(p => p.latitud));
  const maxLatActual = Math.max(...validos.map(p => p.latitud));
  const minLngActual = Math.min(...validos.map(p => p.longitud));
  const maxLngActual = Math.max(...validos.map(p => p.longitud));

  const latMid = (minLatActual + maxLatActual) / 2;
  const lngMid = (minLngActual + maxLngActual) / 2;

  const MIN_SPAN = 0.0008; 
  const latRange = Math.max(maxLatActual - minLatActual, MIN_SPAN) * 1.8;
  const lngRange = Math.max(maxLngActual - minLngActual, MIN_SPAN) * 1.8;

  const minLat = latMid - latRange / 2;
  const minLng = lngMid - lngRange / 2;

  const usableWidth = CANVAS_WIDTH - PADDING * 2;
  const usableHeight = CANVAS_HEIGHT - PADDING * 2;

  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((latMid * Math.PI) / 180);

  const puntosBase = validos.map(point => {
    const x = PADDING + ((point.longitud - minLng) / lngRange) * usableWidth;
    const y = CANVAS_HEIGHT - PADDING - ((point.latitud - minLat) / latRange) * usableHeight;

    const gpsErrorMeters = point.precision_gps_metros ?? 5;
    const degLatFromMeters = gpsErrorMeters / metersPerDegLat;
    const degLngFromMeters = gpsErrorMeters / metersPerDegLng;

    const gpsRadiusX = (degLngFromMeters / lngRange) * usableWidth;
    const gpsRadiusY = (degLatFromMeters / latRange) * usableHeight;
    const gpsRadiusPixel = Math.max(gpsRadiusX, gpsRadiusY, 15); 

    return { ...point, x, y, gpsRadiusPixel };
  });

  return puntosBase.map((point, index) => {
    const distances = puntosBase
      .filter((_, i) => i !== index)
      .map(other => Math.hypot(point.x - other.x, point.y - other.y));

    // Distancia al vecino más cercano
    let nearestDistance = distances.length > 0 ? Math.min(...distances) : 120;
    if (nearestDistance < 40) nearestDistance = 120; 

    // El halo de cobertura (influenceRadius) ahora es independiente del GPS.
    // Se calcula para que la señal alcance a rozar al vecino sin inflarse artificialmente.
    const connectionRadius = nearestDistance * 0.65;
    
    // Mantenemos la nube controlada: mínimo 60px, máximo 150px.
    const influenceRadius = clamp(connectionRadius, 60, 150);

    return { ...point, influenceRadius };
  });
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function HeatmapClient({ actasSeleccionadas }: HeatmapClientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [actaFoco, setActaFoco] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const puntosProyectados = useMemo(() => {
    const todos = actasSeleccionadas.flatMap(acta => 
      acta.mediciones.map(m => ({
        ...m,
        latitud: m.coordenadas?.latitud || 0,
        longitud: m.coordenadas?.longitud || 0,
        origen: acta.tipo_registro === 'Visita Técnica' ? 'tecnico' : 'cliente',
        id_acta: acta.id_acta
      }))
    );
    const vista = actasSeleccionadas.length === 2 ? 'overlay' : (actasSeleccionadas[0]?.tipo_registro === 'Visita Técnica' ? 'tecnico' : 'cliente');
    return proyectarPuntos(filtrarPorVista(todos, vista));
  }, [actasSeleccionadas]);

  const vistaActiva: VistaActiva = actasSeleccionadas.length === 2 ? 'overlay' : (actasSeleccionadas[0]?.tipo_registro === 'Visita Técnica' ? 'tecnico' : 'cliente');

  const promedioDbm = useMemo(() => {
    if (puntosProyectados.length === 0) return null;
    const promedio = puntosProyectados.reduce((sum, point) => sum + point.dbm, 0) / puntosProyectados.length;
    return Math.round(promedio);
  }, [puntosProyectados]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [actasSeleccionadas]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || puntosProyectados.length === 0) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data;

    // 1. Renderizado de Campana de Gauss
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        let totalAlphaWeight = 0;
        let totalColorWeight = 0;
        let weightedDbm = 0;
        let nearestDist = Infinity;

        for (const p of puntosProyectados) {
          const dx = x - p.x;
          const dy = y - p.y;
          const dist2 = dx * dx + dy * dy;
          const dist = Math.sqrt(dist2);
          
          if (dist < nearestDist) nearestDist = dist;

          const sigma2 = p.influenceRadius * p.influenceRadius;
          const w = Math.exp(-dist2 / (2 * sigma2));
          
          let colorW = Math.pow(w, 4); 

          if (p.id_acta === actaFoco) {
            colorW *= 50; 
          }
          
          const severityBoost = 1 + ((-40 - p.dbm) / 50); 
          colorW *= severityBoost;

          weightedDbm += p.dbm * colorW;
          totalColorWeight += colorW;
          totalAlphaWeight += w;
        }

        if (totalAlphaWeight > 0.01 && totalColorWeight > 0) {
          const finalDbm = weightedDbm / totalColorWeight;
          
          const alphaByInfluence = clamp(totalAlphaWeight * 1.2, 0, 0.95);
          const alphaByDistance = clamp(1 - nearestDist / 300, 0, 1); 
          const alpha = clamp(alphaByInfluence * alphaByDistance, 0, 0.90);

          if (alpha > 0.02) {
             const [r, g, b] = interpolarColorPorDbm(finalDbm);
             const i = (y * CANVAS_WIDTH + x) * 4;
             data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = Math.round(alpha * 255);
          }
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    // 2. Filtro de Blur 
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = CANVAS_WIDTH;
    blurCanvas.height = CANVAS_HEIGHT;
    const blurCtx = blurCanvas.getContext("2d");

    if (blurCtx) {
      blurCtx.putImageData(imageData, 0, 0);
      ctx.globalAlpha = 0.4;
      ctx.filter = "blur(14px)";
      ctx.drawImage(blurCanvas, 0, 0);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }

    // 3. Ordenamos los puntos
    const ordenado = [...puntosProyectados].sort((a) => (a.id_acta === actaFoco ? 1 : -1));

    ordenado.forEach(p => {
      const isFoco = p.id_acta === actaFoco;
      const [r, g, b] = colorPorDbm(p.dbm);

      // --- DIBUJAR MARGEN DE ERROR GPS REAL ---
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.gpsRadiusPixel, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.08)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]); 
      ctx.stroke();
      ctx.setLineDash([]); 
      
      // --- DIBUJAR PUNTO CENTRAL ---
      ctx.beginPath();
      ctx.arc(p.x, p.y, isFoco ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
      
      ctx.lineWidth = isFoco ? 4 : 2;
      ctx.strokeStyle = isFoco ? "#FFF" : obtenerColorOrigen(p.origen);
      ctx.stroke();

      // --- DIBUJAR ETIQUETAS ---
      if (isFoco || actasSeleccionadas.length === 1) {
        const labelDbm = `${p.dbm} dBm`;
        const labelZona = p.zona || "";
        
        ctx.font = "bold 13px system-ui, sans-serif";
        const textWidth = Math.max(ctx.measureText(labelDbm).width, ctx.measureText(labelZona).width);
        
        const labelX = p.x > CANVAS_WIDTH - 120 ? p.x - textWidth - 24 : p.x + 16;
        const labelY = p.y < 35 ? p.y + 20 : p.y - 12;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.roundRect(labelX - 6, labelY - 16, textWidth + 12, 38, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(226, 232, 240, 1)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = "#0F172A";
        ctx.fillText(labelDbm, labelX, labelY);
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#64748B";
        ctx.fillText(labelZona, labelX, labelY + 16);
      }
    });
  }, [puntosProyectados, actaFoco, actasSeleccionadas.length]);

  if (actasSeleccionadas.length === 0 || puntosProyectados.length === 0) {
    return (
      <div className="w-full h-[500px] bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center p-6 text-center text-[#64748B]">
        <div>
          <svg className="w-16 h-16 text-[#cbd5e1] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A2 2 0 013 15.532V6.5a2 2 0 011.056-1.765l5.5-2.75a2 2 0 011.888 0l5.5 2.75A2 2 0 0118 6.5v9.032a2 2 0 01-1.056 1.765l-5.5 2.75a2 2 0 01-1.888 0z" />
          </svg>
          <p className="font-bold text-[#002855] text-lg uppercase tracking-wide">
            {actasSeleccionadas.length === 0 ? "Heatmap: Esperando Datos" : titulos[vistaActiva]}
          </p>
          <p className="mt-2 text-sm text-[#64748B]">
            {actasSeleccionadas.length === 0 
              ? "Seleccione actas en el historial para proyectar la topología." 
              : "No existen coordenadas válidas (sin errores GPS) para renderizar en esta vista."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-5 py-4 rounded-t-2xl md:flex-row md:items-center md:justify-between shadow-sm">
        <div>
          <p className="text-sm font-black text-[#002855] uppercase tracking-wide">
            {titulos[vistaActiva]}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs font-semibold text-[#64748B]">
              Superficie generada por interpolación espacial.
            </p>
            {promedioDbm !== null && (
              <span className="bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#00A4E4] rounded border border-[#BFDBFE]">
                Promedio: {promedioDbm} dBm
              </span>
            )}
          </div>
        </div>

        {actasSeleccionadas.length === 2 && (
          <div className="flex gap-2">
            {actasSeleccionadas.map(a => (
              <button key={a.id_acta} onClick={() => setActaFoco(a.id_acta)}
                className={`text-[11px] transition-all font-bold px-4 py-2 rounded-lg border ${actaFoco === a.id_acta ? 'bg-[#002855] text-white shadow-md scale-105' : 'bg-gray-50 text-[#002855] hover:bg-gray-100'}`}>
                {a.tipo_registro === 'Visita Técnica' ? 'Traer Técnico al frente' : 'Traer Cliente al frente'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CANVAS NAVEGABLE */}
      <div 
        className="w-full h-[550px] bg-[#F8FAFC] rounded-b-2xl border border-[#E2E8F0] overflow-hidden relative cursor-move shadow-inner"
        onWheel={(e) => { 
          if (!e.ctrlKey) return; 
          e.preventDefault(); 
          setScale(s => clamp(s + (e.deltaY < 0 ? 0.15 : -0.15), 0.5, 5)); 
        }}
        onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); }}
        onMouseMove={(e) => isDragging && setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <motion.div 
          className="w-full h-full"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: "center center" }}
        >
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-contain" />
        </motion.div>

        {/* LEYENDAS Y CONTROLES OVERLAY */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button onClick={() => setScale(s => clamp(s + 0.3, 0.5, 5))} className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg shadow-md text-[#002855] font-bold text-xl flex items-center justify-center hover:bg-[#F8FAFC] transition-colors">+</button>
          <button onClick={() => setScale(s => clamp(s - 0.3, 0.5, 5))} className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg shadow-md text-[#002855] font-bold text-xl flex items-center justify-center hover:bg-[#F8FAFC] transition-colors">-</button>
          <button onClick={() => { setScale(1); setPosition({x: 0, y: 0}); }} className="w-9 h-9 bg-[#002855] rounded-lg shadow-md text-white flex items-center justify-center hover:bg-[#003B7C] transition-colors mt-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-[#E2E8F0] bg-white/95 p-3 shadow-md pointer-events-none">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#002855]">Niveles de Señal</p>
          <div className="space-y-1.5 text-xs font-bold text-[#1E293B]">
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Excelente: ≥ -60 dBm</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#FACC15]" /> Regular: -60 a -70 dBm</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" /> Mala: -70 a -80 dBm</div>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> Crítica: ≤ -80 dBm</div>
          </div>
        </div>

        {vistaActiva === 'overlay' && (
          <div className="absolute bottom-4 right-4 z-10 rounded-xl border border-[#E2E8F0] bg-white/95 p-3 shadow-md pointer-events-none">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#002855]">Trazo del Punto</p>
            <div className="space-y-1.5 text-xs font-bold text-[#1E293B]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-[3px] border-[#002855] bg-transparent"/> Línea Base (Técnico)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-[3px] border-[#00A4E4] bg-transparent"/> Reporte (Cliente)
              </div>
              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-200">
                <div className="w-3 h-3 rounded-full border border-gray-400 bg-gray-100/50" style={{ borderStyle: 'dashed' }}/> Error de GPS
              </div>
            </div>
          </div>
        )}
      </div>
      
      <p className="text-[11px] text-[#64748B] text-right mt-1">
        Mantén <b>Ctrl + Scroll</b> para ajustar el zoom en el área espacial. Los círculos punteados indican la precisión del GPS de captura.
      </p>
    </div>
  );
}