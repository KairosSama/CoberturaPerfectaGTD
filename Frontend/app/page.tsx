'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient'; 
import SearchRUT from '@/components/SearchRUT';
import InstallationCard from '@/components/InstallationCard';
import MapPlaceholder from '@/components/MapPlaceholder';

interface ActaCertificacion {
  id_acta: string;
  tipo_registro: 'Visita Técnica' | 'Autoevaluación Cliente';
  fecha_formateada: string;
  mediciones: any[];
}

// Tipos para nuestro nuevo sistema de modales
type ModalType = 'upsell' | 'ticket' | null;

export default function Dashboard() {
  const [historialActas, setHistorialActas] = useState<ActaCertificacion[]>([]);
  const [actaActiva, setActaActiva] = useState<ActaCertificacion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para controlar los modales y simulaciones de carga
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  const fetchHistorial = async (rut: string) => {
    setIsLoading(true);
    setError(null);
    setHistorialActas([]);
    setActaActiva(null);

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
        setHistorialActas(parsedData.historial || []);
        if (parsedData.historial && parsedData.historial.length > 0) {
          setActaActiva(parsedData.historial[parsedData.historial.length - 1]);
        }
      }

    } catch (err: any) {
      console.error("Error BD:", err);
      setError('Falla de conexión: ' + (err.message || 'Error de red'));
    } finally {
      setIsLoading(false);
    }
  };

  const mapCoordinates = actaActiva?.mediciones.map(item => ({
    latitud: item.coordenadas?.latitud || 0,
    longitud: item.coordenadas?.longitud || 0,
    dbm: item.dbm
  })) || [];

  // Función para ejecutar la acción de los botones
  const handleAction = () => {
    setIsProcessingAction(true);
    // Simulamos un llamado a la API de ventas/soporte de GTD (2 segundos)
    setTimeout(() => {
      setIsProcessingAction(false);
      setActionSuccess(true);
      
      // Cerramos el modal automáticamente después de mostrar el éxito
      setTimeout(() => {
        closeModal();
      }, 2000);
    }, 2000);
  };

  const closeModal = () => {
    setActiveModal(null);
    setTimeout(() => {
      setIsProcessingAction(false);
      setActionSuccess(false);
    }, 300); // Esperamos a que termine la animación para resetear
  };

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
            
            {/* COLUMNA 1: Línea de Tiempo */}
            <section className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#002855] text-sm">Historial de Registros</h3>
                <span className="bg-[#002855] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {historialActas.length} Eventos
                </span>
              </div>
              
              <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {historialActas.map((acta) => {
                  const isActive = actaActiva?.id_acta === acta.id_acta;
                  const isTecnico = acta.tipo_registro === 'Visita Técnica';
                  
                  return (
                    <button
                      key={acta.id_acta}
                      onClick={() => setActaActiva(acta)}
                      className={`text-left p-5 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 ${
                        isActive 
                          ? isTecnico ? 'border-[#002855] bg-white shadow-md' : 'border-[#00A4E4] bg-white shadow-md'
                          : 'border-transparent bg-[#F8FAFC] hover:bg-white hover:border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{isTecnico ? '👷‍♂️' : '📱'}</span>
                        <span className={`font-bold text-base leading-tight ${isActive ? (isTecnico ? 'text-[#002855]' : 'text-[#00A4E4]') : 'text-[#64748B]'}`}>
                          {acta.tipo_registro}
                        </span>
                      </div>
                      <span className="text-sm text-[#64748B] font-medium ml-9">{acta.fecha_formateada}</span>
                      <span className="text-xs text-[#94A3B8] font-mono ml-9 mt-1 tracking-wider uppercase">ID: {acta.id_acta}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* COLUMNA 2: Detalles del Acta */}
            <section className="lg:col-span-4 flex flex-col gap-4 border-l border-[#E2E8F0] pl-6">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#00A4E4] text-sm">Zonas Registradas</h3>
                <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {actaActiva?.mediciones.length || 0} Puntos
                </span>
              </div>
              
              <motion.div className="flex flex-col gap-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar" variants={containerVariants} initial="hidden" animate="visible">
                {actaActiva?.mediciones.map((zona) => (
                  <motion.div key={zona.id_medicion} variants={itemVariants}>
                    <InstallationCard 
                      zona={zona.zona} 
                      tamano_estimado={zona.tamano_estimado} 
                      dbm={zona.dbm} 
                      precision_gps_metros={zona.precision_gps_metros} 
                    />
                  </motion.div>
                ))}
              </motion.div>
            </section>

            {/* COLUMNA 3: Mapa */}
            <section className="lg:col-span-5 flex flex-col gap-4 border-l border-[#E2E8F0] pl-6">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                  <h3 className="font-bold text-[#002855] text-sm">Topología del Registro</h3>
                  <div className="bg-[#F8FAFC] px-3 py-1 rounded-md border border-[#E2E8F0] text-xs font-bold text-[#64748B]">
                    Renderizando: {actaActiva?.id_acta}
                  </div>
              </div>
              <MapPlaceholder 
                coordenadas={mapCoordinates} 
                vistaActiva={actaActiva?.tipo_registro === 'Visita Técnica' ? 'tecnico' : 'cliente'} 
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
              {/* Header del Modal */}
              <div className={`p-5 text-white ${activeModal === 'upsell' ? 'bg-[#10B981]' : 'bg-[#00A4E4]'}`}>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {activeModal === 'upsell' ? (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Oferta de Extensor eero</>
                  ) : (
                    <><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Visita Técnica</>
                  )}
                </h3>
              </div>

              {/* Cuerpo del Modal */}
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
                  /* Vista de Éxito */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-6 gap-3"
                  >
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
