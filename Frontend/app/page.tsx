'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient'; // Importamos el cliente real
import SearchRUT from '@/components/SearchRUT';
import InstallationCard from '@/components/InstallationCard';
import MapPlaceholder from '@/components/MapPlaceholder';

export default function Dashboard() {
  const [tecnicoData, setTecnicoData] = useState<any[]>([]);
  const [clienteData, setClienteData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mapView, setMapView] = useState<'tecnico' | 'cliente' | 'overlay'>('overlay');

  // Función asíncrona que conecta directamente con la BD de Supabase
  const fetchInstalaciones = async (rut: string) => {
    setIsLoading(true);
    setError(null);
    setTecnicoData([]);
    setClienteData([]);

    try {
      const cleanRut = rut.trim();
      if (!cleanRut) throw new Error('Debe ingresar un RUT para realizar la búsqueda.');

      // Llamada directa al Remote Procedure Call (RPC) de la base de datos
      const { data, error: supaError } = await supabase.rpc('obtener_analisis_cobertura_por_rut', {
        p_rut_cliente: cleanRut
      });

      if (supaError) {
        throw new Error(supaError.message);
      }

      // Manejo de los estados definidos por la base de datos
      if (!data) {
        setError('No se obtuvo respuesta del servidor.');
      } else if (data.status === 'CLIENTE_NO_ENCONTRADO') {
        setError('El RUT ingresado no se encuentra registrado en el sistema de clientes de GTD.');
      } else if (data.status === 'SIN_LINEA_BASE') {
        setError('El cliente existe, pero no posee un acta técnica (Línea Base) registrada.');
      } else if (data.status === 'PROCESADO') {
        // La consulta fue exitosa, inyectamos los datos a los estados
        setTecnicoData(data.lineas_base_tecnico || []);
        setClienteData(data.mediciones_cliente || []);
      }

    } catch (err: any) {
      console.error("Error en la conexión a Supabase:", err);
      setError('Error al procesar la solicitud: ' + (err.message || 'Falla de red'));
    } finally {
      setIsLoading(false);
    }
  };

  // Preparamos el array unificado para el mapa
  const mapCoordinates = [...tecnicoData, ...clienteData].map(item => ({
    latitud: item.coordenadas?.latitud || 0,
    longitud: item.coordenadas?.longitud || 0,
    dbm: item.dbm
  }));

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* Panel de Búsqueda */}
      <motion.section 
        className="bg-white p-7 rounded-2xl shadow-sm border border-[#E2E8F0]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-3 mb-5 border-b pb-4 border-[#E2E8F0]">
            <svg className="w-6 h-6 text-[#002855]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
            </svg>
            <h2 className="text-xl font-bold text-[#002855]">Módulo de Autoevaluación y Diagnóstico TrueMesh</h2>
        </div>
        <SearchRUT onSearch={fetchInstalaciones} isLoading={isLoading} />
        {error && (
          <motion.div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm font-medium flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </motion.div>
        )}
      </motion.section>

      {/* Resultados Comparativos */}
      {tecnicoData.length > 0 && (
        <AnimatePresence>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* COLUMNA 1: Línea Base del Técnico */}
            <section className="lg:col-span-1 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#002855] text-sm">Acta Técnica (Línea Base)</h3>
                <span className="bg-[#64748B] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {tecnicoData.length} Áreas
                </span>
              </div>
              
              <motion.div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" variants={containerVariants} initial="hidden" animate="visible">
                {tecnicoData.map((zona) => (
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

            {/* COLUMNA 2: Autoevaluación del Cliente */}
            <section className="lg:col-span-1 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#00A4E4] text-sm">Reporte Cliente (Mi GTD)</h3>
                <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {clienteData.length} Reclamos
                </span>
              </div>
              
              <motion.div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" variants={containerVariants} initial="hidden" animate="visible">
                {clienteData.map((zona) => (
                  <motion.div key={zona.id_medicion} variants={itemVariants}>
                    <InstallationCard 
                      zona={zona.zona} 
                      tamano_estimado={zona.tamano_estimado} 
                      dbm={zona.dbm} 
                      precision_gps_metros={zona.precision_gps_metros} 
                    />
                  </motion.div>
                ))}
                {clienteData.length === 0 && (
                  <p className="text-sm text-[#64748B] italic text-center mt-4 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">Sin reportes recientes desde la app Mi GTD.</p>
                )}
              </motion.div>
            </section>

            {/* COLUMNA 3 y 4: Mapa */}
            <section className="lg:col-span-2 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                  <h3 className="font-bold text-[#002855] text-sm">Topología Georreferenciada</h3>
                  
                  <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                    <button 
                      onClick={() => setMapView('tecnico')} 
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${mapView === 'tecnico' ? 'bg-[#002855] text-white shadow-sm' : 'text-[#64748B] hover:text-[#002855]'}`}
                    >
                      Técnico
                    </button>
                    <button 
                      onClick={() => setMapView('cliente')} 
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${mapView === 'cliente' ? 'bg-[#00A4E4] text-white shadow-sm' : 'text-[#64748B] hover:text-[#00A4E4]'}`}
                    >
                      Cliente
                    </button>
                    <button 
                      onClick={() => setMapView('overlay')} 
                      className={`px-3 py-1 text-xs font-bold rounded-md transition ${mapView === 'overlay' ? 'bg-white text-[#1E293B] shadow-sm border border-[#E2E8F0]' : 'text-[#64748B] hover:text-[#1E293B]'}`}
                    >
                      Overlay
                    </button>
                  </div>
              </div>
              <MapPlaceholder coordenadas={mapCoordinates} vistaActiva={mapView} />
            </section>
          </div>

          {/* Panel Inferior de Resolución del Ejecutivo */}
          <motion.section 
            className="mt-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div>
              <h3 className="font-bold text-[#002855] text-lg">Acciones de Resolución</h3>
              <p className="text-sm text-[#64748B]">Determine el procedimiento a seguir según la comparativa y el acta firmada.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                className="px-5 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold text-sm hover:bg-[#F0FDF4] transition flex items-center gap-2"
                onClick={() => alert('Iniciando flujo de Upselling: Ofreciendo Extensor eero TrueMesh.')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Contención: Ofrecer Extensor
              </button>

              <button 
                className="px-5 py-2.5 rounded-lg bg-[#00A4E4] text-white font-bold text-sm hover:bg-[#008CBE] shadow-md transition flex items-center gap-2"
                onClick={() => alert('Generando Ticket de Visita Técnica en sistema central...')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                Generar Ticket de Falla
              </button>
            </div>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}
