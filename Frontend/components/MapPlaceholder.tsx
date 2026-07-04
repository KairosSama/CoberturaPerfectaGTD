import { motion } from 'framer-motion';

interface MapPlaceholderProps {
  coordenadas: Array<{ latitud: number; longitud: number; dbm: number }>;
  vistaActiva: 'tecnico' | 'cliente' | 'overlay';
}

export default function MapPlaceholder({ coordenadas, vistaActiva }: MapPlaceholderProps) {
  
  // Textos dinámicos según el botón que presione el ejecutivo
  const titulos = {
    tecnico: 'Heatmap: Línea Base del Técnico',
    cliente: 'Heatmap: Reportes del Cliente',
    overlay: 'Heatmap: Comparativa (Overlay)'
  };

  return (
    <motion.div 
      className="w-full h-[400px] bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center p-6 relative overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent h-[10px]"
        animate={{ y: ['-100%', '1000%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      
      <div className="text-center text-[#64748B] max-w-sm">
        <svg className="w-16 h-16 text-[#cbd5e1] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A2 2 0 013 15.532V6.5a2 2 0 011.056-1.765l5.5-2.75a2 2 0 011.888 0l5.5 2.75A2 2 0 0118 6.5v9.032a2 2 0 01-1.056 1.765l-5.5 2.75a2 2 0 01-1.888 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 12V6m0 0l-3 3m3-3l3 3" />
        </svg>
        
        {/* El título cambia según el botón seleccionado */}
        <p className="font-bold text-[#002855] text-lg">{titulos[vistaActiva]}</p>
        
        <p className="text-sm mt-2">Recibiendo {coordenadas.length} puntos para renderizar.</p>
        <div className="mt-4 bg-[#002855] text-white text-xs font-semibold px-4 py-1.5 rounded-full inline-block shadow-sm">
            Módulo Heatmap de compañero aquí
        </div>
      </div>
    </motion.div>
  );
}