import { motion } from 'framer-motion';

interface InstallationCardProps {
  area_nombre: string;
  area_tamano: string;
  wifi_dbm: number;
  margen_error: number;
}

const ZoneIcon = () => (
    <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const WifiSignalIcon = ({ color }: { color: string }) => (
    <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.112A1.5 1.5 0 0110.5 14.5m0-1a1.5 1.5 0 011.5 1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 0112.728 0m-9.9-1.414a6 6 0 019.9 0m-7.071-1.414a3 3 0 014.243 0" />
    </svg>
);

export default function InstallationCard({ area_nombre, area_tamano, wifi_dbm, margen_error }: InstallationCardProps) {
  
  // Colores de señal directos (Verde esmeralda, Amarillo mostaza, Rojo vibrante)
  const getSignalDetails = (dbm: number) => {
    if (dbm > -60) return { color: 'text-[#10B981]', bgColor: 'bg-[#10B981]', status: 'Excelente Señal' };
    if (dbm > -70) return { color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]', status: 'Señal Regular' };
    return { color: 'text-[#EF4444]', bgColor: 'bg-[#EF4444]', status: 'Señal Crítica (Sombra)' };
  };

  const { color, bgColor, status } = getSignalDetails(wifi_dbm);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#E2E8F0] flex flex-col gap-3 relative overflow-hidden group">
      
      {/* Borde sutil Celeste al hacer hover */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[#00A4E4] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-center">
        {/* Título en Azul Marino */}
        <h3 className="text-lg font-bold text-[#002855]">{area_nombre}</h3>
        <div className="flex items-center gap-1 text-[#64748B]">
            <ZoneIcon />
            <span className="text-xs font-medium">{area_tamano}</span>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <WifiSignalIcon color={color} />
          <div className="flex flex-col">
            <span className={`font-bold ${color}`}>{wifi_dbm} dBm</span>
            <span className="text-xs text-[#64748B] font-medium">{status}</span>
          </div>
        </div>
        
        <div className="relative flex h-3 w-3">
          <motion.span 
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bgColor} opacity-75`}
            animate={{ scale: [1, 1.2, 1], opacity: [0.75, 0.4, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          ></motion.span>
          <span className={`relative inline-flex rounded-full h-3 w-3 ${bgColor}`}></span>
        </div>
      </div>

      <div className="text-xs text-[#64748B] flex justify-between items-center border-t border-[#E2E8F0] pt-2.5">
        <span>Margen Error GPS:</span>
        <span className="font-semibold text-[#1E293B]">{margen_error} m</span>
      </div>
    </div>
  );
}