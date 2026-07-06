'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient'; 
import SearchRUT from '@/components/SearchRUT';
import InstallationCard from '@/components/InstallationCard';
import HeatmapClient from '@/components/HeatmapClient';

// Interfaces estrictas para evitar el "any" y prevenir bugs
export interface AnalisisDistancia {
  medicion_tecnico_id: string;
  zona_referencia: string;
  distancia_metros: number;
  dentro_de_tolerancia: boolean;
}

export interface Medicion {
  id_medicion: string;
  zona: string;
  tamano_estimado: string;
  dbm: number;
  precision_gps_metros: number;
  coordenadas?: { latitud: number; longitud: number };
  analisis_distancia?: AnalisisDistancia; // Solo viene en las mediciones del cliente
}

export interface ActaCertificacion {
  id_acta: string;
  tipo_registro: 'Visita Técnica' | 'Autoevaluación Cliente';
  fecha_formateada: string;
  mediciones: Medicion[];
}

type ModalType = 'upsell' | 'ticket' | null;
type FiltroHistorial = 'Todos' | 'Visita Técnica' | 'Autoevaluación Cliente';

export default function Dashboard() {
  const [historialActas, setHistorialActas] = useState<ActaCertificacion[]>([]);
  
  // NUEVO: Soportamos hasta 2 actas seleccionadas para comparar
  const [actasSeleccionadas, setActasSeleccionadas] = useState<ActaCertificacion[]>([]);
  const [filtroActivo, setFiltroActivo] = useState<FiltroHistorial>('Todos');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  const fetchHistorial = async (rut: string) => {
    setIsLoading(true);
    setError(null);
    setHistorialActas([]);
    setActasSeleccionadas([]);

    try {
      const cleanRut = rut.trim();
      if (!cleanRut) throw new Error('Ingrese un RUT válido.');

      const { data, error: supaError } = await supabase.rpc('obtener_analisis_cobertura', {
        p_rut_cliente: cleanRut
      });

      if (supaError) throw new Error(supaError.message);

      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          throw new Error('La base de datos devolvió un formato ilegible.');
        }
      }

      if (!parsedData) {
        setError('No se obtuvo respuesta del servidor central.');
      } else if (parsedData.status === 'CLIENTE_NO_ENCONTRADO') {
        setError('El RUT ingresado no está registrado en el sistema de GTD.');
      } else if (parsedData.status === 'SIN_ACTAS') {
        setError('El cliente existe, pero no tiene historial de visitas ni reportes registrados.');
      } else if (parsedData.status === 'PROCESADO') {
        const historial = parsedData.historial || [];
        setHistorialActas(historial);
        
        // Autoseleccionar la última acta por defecto
        if (historial.length > 0) {
          setActasSeleccionadas([historial[historial.length - 1]]);
        }
      }

    } catch (err: any) {
      console.error("Error BD:", err);
      setError('Falla de conexión: ' + (err.message || 'Error de red'));
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVO: Lógica de selección múltiple (Máximo 2)
  const toggleActaSelection = (acta: ActaCertificacion) => {
    setActasSeleccionadas(prev => {
      const isAlreadySelected = prev.some(a => a.id_acta === acta.id_acta);
      
      if (isAlreadySelected) {
        // Si ya está seleccionada, la quitamos
        return prev.filter(a => a.id_acta !== acta.id_acta);
      } else {
        // Si no está seleccionada, la agregamos (si hay 2, sacamos la más vieja)
        if (prev.length >= 2) {
          return [prev[1], acta];
        } else {
          return [...prev, acta];
        }
      }
    });
  };

  const handleAction = () => {
    setIsProcessingAction(true);
    setTimeout(() => {
      setIsProcessingAction(false);
      setActionSuccess(true);
      setTimeout(() => closeModal(), 2000);
    }, 2000);
  };

  const closeModal = () => {
    setActiveModal(null);
    setTimeout(() => {
      setIsProcessingAction(false);
      setActionSuccess(false);
    }, 300); 
  };

  const actasFiltradas = historialActas.filter(a => filtroActivo === 'Todos' || a.tipo_registro === filtroActivo);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col gap-6 pb-10 relative">
      
      {/* Panel de Búsqueda */}
      <motion.section 
        className="bg-white p-7 rounded-2xl shadow-sm border border-[#E2E8F0]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-5 border-b pb-4 border-[#E2E8F0]">
            <svg className="w-6 h-6 text-[#002855]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
            </svg>
            <h2 className="text-xl font-bold text-[#002855]">Módulo de Autoevaluación y Diagnóstico TrueMesh</h2>
        </div>
        <SearchRUT onSearch={fetchHistorial} isLoading={isLoading} />
        {error && (
          <motion.div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </motion.div>
        )}
      </motion.section>

      {historialActas.length > 0 && (
        <AnimatePresence>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMNA 1: Línea de Tiempo y Filtros */}
            <section className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex flex-col border-b pb-3 border-[#E2E8F0] gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#002855] text-sm">Historial de Registros</h3>
                  <span className="bg-[#002855] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                    {historialActas.length} Eventos
                  </span>
                </div>
                {/* Pestañas de Filtrado */}
                <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                  {(['Todos', 'Visita Técnica', 'Autoevaluación Cliente'] as FiltroHistorial[]).map(filtro => (
                    <button
                      key={filtro}
                      onClick={() => setFiltroActivo(filtro)}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                        filtroActivo === filtro ? 'bg-white text-[#002855] shadow-sm border border-[#E2E8F0]' : 'text-[#64748B] hover:text-[#002855]'
                      }`}
                    >
                      {filtro === 'Todos' ? 'Todos' : filtro === 'Visita Técnica' ? 'Técnico' : 'Cliente'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {actasFiltradas.map((acta) => {
                  const selectionIndex = actasSeleccionadas.findIndex(a => a.id_acta === acta.id_acta);
                  const isSelected = selectionIndex !== -1;
                  const isPrimary = selectionIndex === 0; // El primero seleccionado es azul
                  const isSecondary = selectionIndex === 1; // El segundo seleccionado es verde

                  const isTecnico = acta.tipo_registro === 'Visita Técnica';
                  
                  return (
                    <button
                      key={acta.id_acta}
                      onClick={() => toggleActaSelection(acta)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 relative overflow-hidden ${
                        isSelected 
                          ? isPrimary 
                            ? 'border-[#00A4E4] bg-[#F0F9FF] shadow-md' 
                            : 'border-[#10B981] bg-[#F0FDF4] shadow-md'
                          : 'border-transparent bg-[#F8FAFC] hover:bg-white hover:border-[#E2E8F0]'
                      }`}
                    >
                      {isSelected && (
                        <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[10px] font-bold text-white ${isPrimary ? 'bg-[#00A4E4]' : 'bg-[#10B981]'}`}>
                          Vista {isPrimary ? '1' : '2'}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{isTecnico ? '👷‍♂️' : '📱'}</span>
                        <span className={`font-bold text-sm leading-tight ${isSelected ? (isPrimary ? 'text-[#00A4E4]' : 'text-[#10B981]') : 'text-[#64748B]'}`}>
                          {acta.tipo_registro}
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B] font-medium ml-9">{acta.fecha_formateada}</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono ml-9 uppercase truncate">ID: {acta.id_acta}</span>
                    </button>
                  );
                })}
                {actasFiltradas.length === 0 && (
                  <div className="text-center text-sm text-[#64748B] py-10">No hay registros de este tipo.</div>
                )}
              </div>
            </section>

            {/* COLUMNA 2: Detalles de Actas Seleccionadas */}
            <section className="lg:col-span-4 flex flex-col gap-4 border-l border-[#E2E8F0] pl-6">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#002855] text-sm">Zonas Registradas</h3>
                <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {actasSeleccionadas.length > 0 ? 'Comparativa Activa' : 'Sin Selección'}
                </span>
              </div>
              
              <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {actasSeleccionadas.length === 0 && (
                  <div className="text-center text-[#64748B] py-20 flex flex-col items-center gap-3">
                    <svg className="w-12 h-12 text-[#E2E8F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    <p className="text-sm font-medium">Seleccione hasta 2 actas en el panel izquierdo para ver sus detalles y compararlas.</p>
                  </div>
                )}

                {/* Renderizamos las tarjetas de las actas seleccionadas */}
                {actasSeleccionadas.map((acta, index) => (
                  <motion.div key={acta.id_acta} variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-md text-white flex items-center justify-between shadow-sm ${index === 0 ? 'bg-[#00A4E4]' : 'bg-[#10B981]'}`}>
                      <span>{acta.tipo_registro}</span>
                      <span>{acta.fecha_formateada}</span>
                    </div>
                    {acta.mediciones.map((zona) => (
                      <motion.div key={zona.id_medicion} variants={itemVariants}>
                        <InstallationCard 
                          zona={zona.zona} 
                          tamano_estimado={zona.tamano_estimado} 
                          dbm={zona.dbm} 
                          precision_gps_metros={zona.precision_gps_metros}
                          isTecnico={acta.tipo_registro === 'Visita Técnica'}
                          analisis_distancia={zona.analisis_distancia}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* COLUMNA 3: Mapa */}
            <section className="lg:col-span-5 flex flex-col gap-4 border-l border-[#E2E8F0] pl-6">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                  <h3 className="font-bold text-[#002855] text-sm">Topología Espacial</h3>
              </div>
              <HeatmapClient
                actasSeleccionadas={actasSeleccionadas} 
              />
            </section>
          </div>

          {/* Panel Inferior de Resolución */}
          <motion.section 
            className="mt-6 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h3 className="font-bold text-[#002855] text-lg">Acciones de Resolución</h3>
              <p className="text-sm text-[#64748B]">Determine el procedimiento a seguir según el historial del cliente.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setActiveModal('upsell')}
                className="px-5 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold text-sm hover:bg-[#F0FDF4] transition flex items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Contención: Ofrecer Extensor
              </button>
              <button 
                onClick={() => setActiveModal('ticket')}
                className="px-5 py-2.5 rounded-lg bg-[#00A4E4] text-white font-bold text-sm hover:bg-[#008CBE] shadow-md transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                Generar Ticket de Falla
              </button>
            </div>
          </motion.section>
        </AnimatePresence>
      )}

      {/* --- SISTEMA DE MODALES --- */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002855]/60 backdrop-blur-sm p-4">
            <motion.div 
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className={`p-5 text-white ${activeModal === 'upsell' ? 'bg-[#10B981]' : 'bg-[#00A4E4]'}`}>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {activeModal === 'upsell' ? (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Oferta de Extensor eero</>
                  ) : (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Visita Técnica</>
                  )}
                </h3>
              </div>
              <div className="p-6">
                {!actionSuccess ? (
                  <>
                    <p className="text-[#1E293B] mb-6">
                      {activeModal === 'upsell' 
                        ? 'Se enviará una oferta comercial segmentada al cliente para arriendo o compra de un Nodo TrueMesh, conteniendo la queja sin enviar personal técnico.'
                        : 'Se generará una orden de visita en terreno. Úselo solo si la falla reportada no coincide con las zonas de sombra firmadas en el acta base.'}
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={closeModal}
                        disabled={isProcessingAction}
                        className="px-4 py-2 text-[#64748B] font-bold hover:bg-[#F8FAFC] rounded-lg transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleAction}
                        disabled={isProcessingAction}
                        className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition disabled:opacity-80 flex items-center gap-2 ${activeModal === 'upsell' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#00A4E4] hover:bg-[#008CBE]'}`}
                      >
                        {isProcessingAction ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Procesando...</>
                        ) : (
                          'Confirmar Acción'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center text-[#10B981] mb-2">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h4 className="text-xl font-bold text-[#002855]">¡Operación Exitosa!</h4>
                    <p className="text-sm text-[#64748B] text-center">
                      {activeModal === 'upsell' ? 'Oferta comercial enviada al correo del cliente.' : 'Ticket técnico ingresado a la central operativa.'}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}