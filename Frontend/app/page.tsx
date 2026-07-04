'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRUT from '@/components/SearchRUT';
import InstallationCard from '@/components/InstallationCard';
import MapPlaceholder from '@/components/MapPlaceholder';

export default function Dashboard() {
  const [tecnicoData, setTecnicoData] = useState<any[]>([]);
  const [clienteData, setClienteData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controla qué capa del mapa se está viendo
  const [mapView, setMapView] = useState<'tecnico' | 'cliente' | 'overlay'>('overlay');

  // Base de datos simulada (Mock Database) ampliada con 5 RUTs
  const mockDatabase: Record<string, { tecnico: any[], cliente: any[] }> = {
    // 1. Caso original
    '12345678-9': {
      tecnico: [
        { id_registro: 'TEC-1', area_nombre: 'Living Principal', area_tamano: 'Grande', wifi_dbm: 42, margen_error: 2, latitud: 33.4569, longitud: 70.6483 },
        { id_registro: 'TEC-2', area_nombre: 'Dormitorio Principal', area_tamano: 'Mediano', wifi_dbm: 50, margen_error: 3, latitud: 33.4569, longitud: 70.6485 },
        { id_registro: 'TEC-3', area_nombre: 'Terraza Quincho', area_tamano: 'Grande', wifi_dbm: 82, margen_error: 2, latitud: 33.4571, longitud: 70.6482 }, 
        { id_registro: 'TEC-4', area_nombre: 'Cocina Americana', area_tamano: 'Mediano', wifi_dbm: 55, margen_error: 3, latitud: 33.4570, longitud: 70.6480 }
      ],
      cliente: [
        { id_registro: 'CLI-1', area_nombre: 'Dormitorio Principal', area_tamano: 'Mediano', wifi_dbm: 65, margen_error: 4, latitud: 33.4569, longitud: 70.6485 },
        { id_registro: 'CLI-2', area_nombre: 'Terraza Quincho', area_tamano: 'Grande', wifi_dbm: 85, margen_error: 3, latitud: 33.4571, longitud: 70.6482 },
      ]
    },
    // 2. Caso: Casa con subterráneo (Atenuación severa por hormigón)
    '98765432-1': {
      tecnico: [
        { id_registro: 'TEC-5', area_nombre: 'Sala de Estar (Piso 1)', area_tamano: 'Grande', wifi_dbm: 45, margen_error: 2, latitud: 33.4601, longitud: 70.6501 },
        { id_registro: 'TEC-6', area_nombre: 'Subterráneo / Sala de Juegos', area_tamano: 'Grande', wifi_dbm: 88, margen_error: 5, latitud: 33.4601, longitud: 70.6501 }
      ],
      cliente: [
        { id_registro: 'CLI-3', area_nombre: 'Subterráneo / Sala de Juegos', area_tamano: 'Grande', wifi_dbm: 90, margen_error: 4, latitud: 33.4601, longitud: 70.6501 }
      ]
    },
    // 3. Caso: Departamento con muros estructurales
    '19283746-5': {
      tecnico: [
        { id_registro: 'TEC-7', area_nombre: 'Living Comedor', area_tamano: 'Mediano', wifi_dbm: 38, margen_error: 1, latitud: 33.4215, longitud: 70.6012 },
        { id_registro: 'TEC-8', area_nombre: 'Pasillo Habitaciones', area_tamano: 'Pequeño', wifi_dbm: 60, margen_error: 2, latitud: 33.4214, longitud: 70.6013 },
        { id_registro: 'TEC-9', area_nombre: 'Pieza Niños', area_tamano: 'Mediano', wifi_dbm: 68, margen_error: 3, latitud: 33.4213, longitud: 70.6014 }
      ],
      cliente: [
        { id_registro: 'CLI-4', area_nombre: 'Pieza Niños', area_tamano: 'Mediano', wifi_dbm: 75, margen_error: 2, latitud: 33.4213, longitud: 70.6014 }
      ]
    },
    // 4. Caso: Propiedad grande con exteriores
    '11223344-5': {
      tecnico: [
        { id_registro: 'TEC-10', area_nombre: 'Hall de Acceso', area_tamano: 'Pequeño', wifi_dbm: 48, margen_error: 2, latitud: 33.3850, longitud: 70.5500 },
        { id_registro: 'TEC-11', area_nombre: 'Dormitorio Principal', area_tamano: 'Grande', wifi_dbm: 52, margen_error: 2, latitud: 33.3851, longitud: 70.5498 },
        { id_registro: 'TEC-12', area_nombre: 'Piscina y Jardín Trasero', area_tamano: 'Muy Grande', wifi_dbm: 80, margen_error: 6, latitud: 33.3855, longitud: 70.5495 }
      ],
      cliente: [
        { id_registro: 'CLI-5', area_nombre: 'Piscina y Jardín Trasero', area_tamano: 'Muy Grande', wifi_dbm: 86, margen_error: 5, latitud: 33.3855, longitud: 70.5495 },
        { id_registro: 'CLI-6', area_nombre: 'Dormitorio Principal', area_tamano: 'Grande', wifi_dbm: 65, margen_error: 2, latitud: 33.3851, longitud: 70.5498 }
      ]
    },
    // 5. Caso: Instalación sin reportes de fallas por parte del cliente
    '15667788-0': {
      tecnico: [
        { id_registro: 'TEC-13', area_nombre: 'Oficina (Home Office)', area_tamano: 'Mediano', wifi_dbm: 40, margen_error: 1, latitud: 33.5100, longitud: 70.7100 },
        { id_registro: 'TEC-14', area_nombre: 'Dormitorio Visitas', area_tamano: 'Pequeño', wifi_dbm: 62, margen_error: 3, latitud: 33.5102, longitud: 70.7105 }
      ],
      cliente: [] 
    }
  };

  const fetchInstalaciones = (rut: string) => {
    setIsLoading(true);
    setError(null);
    setTecnicoData([]);
    setClienteData([]);

    setTimeout(() => {
      const cleanRut = rut.trim();
      
      if (mockDatabase[cleanRut]) {
        setTecnicoData(mockDatabase[cleanRut].tecnico);
        setClienteData(mockDatabase[cleanRut].cliente);
      } else {
        setError('No se encontraron registros de cobertura o actas firmadas para el RUT ingresado.');
      }
      setIsLoading(false);
    }, 1000); 
  };

  const mapCoordinates = [...tecnicoData, ...clienteData].map(item => ({
    latitud: item.latitud,
    longitud: item.longitud,
    dbm: item.wifi_dbm
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

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
          <motion.div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3 rounded text-red-700 text-sm font-medium">
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
                  <motion.div key={zona.id_registro} variants={itemVariants}>
                    <InstallationCard {...zona} />
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
                  <motion.div key={zona.id_registro} variants={itemVariants}>
                    <InstallationCard {...zona} />
                  </motion.div>
                ))}
                {clienteData.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center mt-4">Sin reportes recientes.</p>
                )}
              </motion.div>
            </section>

            {/* COLUMNA 3 y 4: Mapa */}
            <section className="lg:col-span-2 flex flex-col gap-4 border-l border-[#E2E8F0] pl-2">
              <div className="flex items-center justify-between border-b pb-2 border-[#E2E8F0]">
                  <h3 className="font-bold text-[#002855] text-sm">Topología Georreferenciada</h3>
                  
                  {/* Botones para alternar el mapa de calor */}
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
              {/* Botón de Contención (Upselling eero) */}
              <button 
                className="px-5 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold text-sm hover:bg-[#F0FDF4] transition flex items-center gap-2"
                onClick={() => alert('Iniciando flujo de Upselling: Ofreciendo Extensor eero TrueMesh.')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Contención: Ofrecer Extensor
              </button>

              {/* Botón de Ticket Válido */}
              <button 
                className="px-5 py-2.5 rounded-lg bg-[#00A4E4] text-white font-bold text-sm hover:bg-[#008CBE] shadow-md transition flex items-center gap-2"
                onClick={() => alert('Generando Ticket de Visita Técnica en sistema central...')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                Generar Ticket de Falla
              </button>
            </div>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}