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

export default function Dashboard() {
  const [historialActas, setHistorialActas] = useState<ActaCertificacion[]>([]);
  const [actaActiva, setActaActiva] = useState<ActaCertificacion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = async (rut: string) => {
    setIsLoading(true);
    setError(null);
    setHistorialActas([]);
    setActaActiva(null);

    try {
      const cleanRut = rut.trim();
      if (!cleanRut) throw new Error('Ingrese un RUT válido.');

      // Llamado a Supabase
      const { data, error: supaError } = await supabase.rpc('obtener_analisis_cobertura', {
         cleanRut
      });

      if (supaError) throw new Error(supaError.message);

      // --- PARCHE DE LECTURA RPC ---
      // A veces Supabase devuelve el JSON de Postgres como un string en vez de un objeto.
      // Validamos y forzamos el parseo si es necesario.
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          throw new Error('La base de datos devolvió un formato ilegible.');
        }
      }

      // Ahora leemos desde parsedData en lugar de data directamente
      if (!parsedData) {
        setError('No se obtuvo respuesta del servidor central.');
      } else if (parsedData.status === 'CLIENTE_NO_ENCONTRADO') {
        setError('El RUT ingresado no está registrado en el sistema de GTD.');
      } else if (parsedData.status === 'SIN_ACTAS') {
        setError('El cliente existe, pero no tiene historial de visitas ni reportes registrados.');
      } else if (parsedData.status === 'PROCESADO') {
        setHistorialActas(parsedData.historial || []);
        
        if (parsedData.historial && parsedData.historial.length > 0) {
          // Autoseleccionar siempre el acta más reciente (la última de la lista)
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

  return (
    <div className="flex flex-col gap-6 pb-10">
      
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* COLUMNA 1: Línea de Tiempo */}
            <section className="lg:col-span-1 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#002855] text-sm">Historial de Registros</h3>
                <span className="bg-[#002855] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {historialActas.length} Eventos
                </span>
              </div>
              
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {historialActas.map((acta) => {
                  const isActive = actaActiva?.id_acta === acta.id_acta;
                  const isTecnico = acta.tipo_registro === 'Visita Técnica';
                  
                  return (
                    <button
                      key={acta.id_acta}
                      onClick={() => setActaActiva(acta)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 ${
                        isActive 
                          ? isTecnico ? 'border-[#002855] bg-white shadow-md' : 'border-[#00A4E4] bg-white shadow-md'
                          : 'border-transparent bg-[#F8FAFC] hover:bg-white hover:border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{isTecnico ? '👷‍♂️' : '📱'}</span>
                        <span className={`font-bold text-sm ${isActive ? (isTecnico ? 'text-[#002855]' : 'text-[#00A4E4]') : 'text-[#64748B]'}`}>
                          {acta.tipo_registro}
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B] font-medium ml-7">{acta.fecha_formateada}</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono ml-7 mt-1 tracking-wider uppercase">ID: {acta.id_acta}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* COLUMNA 2: Detalles del Acta */}
            <section className="lg:col-span-1 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#00A4E4] text-sm">Zonas Registradas</h3>
                <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {actaActiva?.mediciones.length || 0} Puntos
                </span>
              </div>
              
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {actaActiva?.mediciones.map((zona) => (
                  <InstallationCard 
                    key={zona.id_medicion}
                    zona={zona.zona} 
                    tamano_estimado={zona.tamano_estimado} 
                    dbm={zona.dbm} 
                    precision_gps_metros={zona.precision_gps_metros} 
                  />
                ))}
              </div>
            </section>

            {/* COLUMNA 3 y 4: Mapa */}
            <section className="lg:col-span-2 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
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
            className="mt-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h3 className="font-bold text-[#002855] text-lg">Acciones de Resolución</h3>
              <p className="text-sm text-[#64748B]">Determine el procedimiento a seguir según el historial del cliente.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button className="px-5 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold text-sm hover:bg-[#F0FDF4] transition flex items-center gap-2">
                Contención: Ofrecer Extensor
              </button>
              <button className="px-5 py-2.5 rounded-lg bg-[#00A4E4] text-white font-bold text-sm hover:bg-[#008CBE] shadow-md transition flex items-center gap-2">
                Generar Ticket de Falla
              </button>
            </div>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}
