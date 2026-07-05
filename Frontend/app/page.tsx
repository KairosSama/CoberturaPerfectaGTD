'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import SearchRUT from '@/components/SearchRUT';
import InstallationCard from '@/components/InstallationCard';
import MapPlaceholder from '@/components/MapPlaceholder';

// Estructura de la sesión que el frontend espera renderizar
interface ActaCertificacion {
  id_acta: string;
  tipo_registro: string;
  fecha_formateada: string;
  mediciones: any[];
}

export default function Dashboard() {
  const [historialActas, setHistorialActas] = useState<ActaCertificacion[]>([]);
  const [actaActiva, setActaActiva] = useState<ActaCertificacion | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función asíncrona conectada a la base de datos real (Supabase)
  const fetchHistorial = async (rut: string) => {
    setIsLoading(true);
    setError(null);
    setHistorialActas([]);
    setActaActiva(null);

    try {
      const cleanRut = rut.trim();
      if (!cleanRut) throw new Error('Debe ingresar un RUT válido.');

      // Llamada al RPC de Supabase (El nombre se mantuvo según instrucción)
      const { data, error: supaError } = await supabase.rpc('obtener_analisis_cobertura', {
        p_rut_cliente: cleanRut
      });

      if (supaError) {
        throw new Error(supaError.message);
      }

      // Validaciones de estado provenientes de la base de datos
      if (!data) {
        setError('No se obtuvo respuesta del servidor.');
        return;
      }

      if (data.status === 'CLIENTE_NO_ENCONTRADO') {
        setError('El RUT ingresado no se encuentra registrado en el sistema de clientes de GTD.');
        return;
      }

      // Asumimos que el compañero estructuró la respuesta del RPC para devolver el historial
      // Mapeamos los datos de la base de datos (perfil_origen, created_at) al formato de la UI
      const actasCrudas = data.historial || data.actas || [];

      if (!Array.isArray(actasCrudas) || actasCrudas.length === 0) {
        setError('El cliente existe, pero no posee actas de certificación ni reportes registrados.');
        return;
      }

      // Transformación de los datos SQL puros a la vista de usuario
      const historialFormateado = actasCrudas.map((acta: any) => {
        // Formatear la fecha 'created_at' de PostgreSQL a texto legible
        const fechaObj = new Date(acta.created_at);
        const fechaTexto = fechaObj.toLocaleString('es-CL', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Adaptar el 'perfil_origen' de la BD para la interfaz
        let tipoVista = 'Registro Desconocido';
        if (acta.perfil_origen === 'tecnico' || acta.perfil_origen === 'Visita Técnica') tipoVista = 'Visita Técnica';
        if (acta.perfil_origen === 'cliente' || acta.perfil_origen === 'Autoevaluación Cliente') tipoVista = 'Autoevaluación Cliente';

        return {
          id_acta: acta.codigo_orden || acta.id_acta, // Usamos el código de orden si existe
          tipo_registro: tipoVista,
          fecha_formateada: fechaTexto,
          mediciones: acta.mediciones || [] // El array de puntos GPS y dBm
        };
      });

      setHistorialActas(historialFormateado);
      
      // Auto-seleccionar el acta más reciente (la última de la lista) para mostrarla de inmediato
      setActaActiva(historialFormateado[historialFormateado.length - 1]);

    } catch (err: any) {
      console.error("Error conectando a Supabase:", err);
      setError('Error al procesar la solicitud: ' + (err.message || 'Falla de red'));
    } finally {
      setIsLoading(false);
    }
  };

  // Preparamos las coordenadas dinámicas solo del acta seleccionada
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

      {/* Interfaz de Resultados (Maestro-Detalle) */}
      {historialActas.length > 0 && (
        <AnimatePresence>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* COLUMNA 1: Línea de Tiempo (Historial) */}
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
                      <span className="text-xs text-[#64748B] font-medium ml-7 capitalize">{acta.fecha_formateada}</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono ml-7 mt-1 tracking-wider uppercase">Acta: {acta.id_acta.slice(0,8)}...</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* COLUMNA 2: Detalles del Acta Seleccionada */}
            <section className="lg:col-span-1 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                <h3 className="font-bold text-[#00A4E4] text-sm">Zonas Registradas</h3>
                <span className="bg-[#00A4E4] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  {actaActiva?.mediciones.length || 0} Puntos
                </span>
              </div>
              
              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {actaActiva?.mediciones.map((zona: any, index: number) => (
                  <InstallationCard 
                    key={zona.id_medicion || index}
                    zona={zona.zona} 
                    tamano_estimado={zona.tamano_estimado} 
                    dbm={zona.dbm} 
                    precision_gps_metros={zona.precision_gps_metros} 
                  />
                ))}
              </div>
            </section>

            {/* COLUMNA 3 y 4: Mapa de Calor */}
            <section className="lg:col-span-2 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                  <h3 className="font-bold text-[#002855] text-sm">Topología del Registro</h3>
                  <div className="bg-[#F8FAFC] px-3 py-1 rounded-md border border-[#E2E8F0] text-xs font-bold text-[#64748B]">
                    ID: {actaActiva?.id_acta}
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
              <p className="text-sm text-[#64748B]">Determine el procedimiento a seguir según el historial georreferenciado.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button className="px-5 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold text-sm hover:bg-[#F0FDF4] transition flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Contención: Ofrecer Extensor
              </button>
              <button className="px-5 py-2.5 rounded-lg bg-[#00A4E4] text-white font-bold text-sm hover:bg-[#008CBE] shadow-md transition flex items-center gap-2">
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
