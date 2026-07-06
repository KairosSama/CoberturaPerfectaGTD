import { motion } from 'framer-motion';
import { AnalisisDistancia } from '@/app/page';

interface InstallationCardProps {
  zona: string;
  tamano_estimado: string;
  dbm: number;
  precision_gps_metros: number;
  isTecnico: boolean;
  analisis_distancia?: AnalisisDistancia; // Opcional, solo llega en reportes de cliente
}

const ZoneIcon = () => (
    <svg className="w-4 h-4 text-[#64748B] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const WifiSignalIcon = ({ color }: { color: string }) => (
    <svg className={`w-7 h-7 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.112A1.5 1.5 0 0110.5 14.5m0-1a1.5 1.5 0 011.5 1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 0112.728 0m-9.9-1.414a6 6 0 019.9 0m-7.071-1.414a3 3 0 014.243 0" />
    </svg>
);

export default function InstallationCard({ zona, tamano_estimado, dbm, precision_gps_metros, isTecnico, analisis_distancia }: InstallationCardProps) {
  
  const getSignalDetails = (signal: number) => {
    if (signal > -60) return { color: 'text-[#10B981]', bgColor: 'bg-[#10B981]', status: 'Excelente Señal' };
    if (signal > -70) return { color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B]', status: 'Señal Regular' };
    return { color: 'text-[#EF4444]', bgColor: 'bg-[#EF4444]', status: 'Señal Crítica (Sombra)' };
  };

  const { color, bgColor, status } = getSignalDetails(dbm);
  
  // Lógica para determinar el estilo visual de la tarjeta
  const cardBorderColor = isTecnico ? 'border-[#E2E8F0]' : 'border-[#F1F5F9]';
  const cardShadow = isTecnico ? 'shadow-sm' : 'shadow-none';

  return (
    <div className={`bg-white p-6 rounded-xl ${cardShadow} border ${cardBorderColor} flex flex-col gap-4 relative overflow-hidden group`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${isTecnico ? 'bg-[#002855]' : 'bg-[#00A4E4]'} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isTecnico ? '👷‍♂️' : '📱'}</span>
          <h3 className="text-lg font-bold text-[#002855] leading-tight">{zona}</h3>
        </div>
        <div className="flex items-start gap-1 text-[#64748B] flex-shrink-0">
            <ZoneIcon />
            <span className="text-sm font-medium">{tamano_estimado}</span>
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <div className="flex items-center gap-4">
          <WifiSignalIcon color={color} />
          <div className="flex flex-col">
            <span className={`text-2xl font-black tracking-tight ${color}`}>{dbm} dBm</span>
            <span className="text-sm text-[#64748B] font-medium mt-0.5">{status}</span>
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

      <div className="flex flex-col gap-2">
        <div className="text-sm text-[#64748B] flex justify-between items-center border-t border-[#E2E8F0] pt-3">
          <span>Precisión GPS:</span>
          <span className="font-bold text-[#1E293B]">±{precision_gps_metros} m</span>
        </div>

        {/* ALERTA ESPACIAL: Si es un reporte del cliente, mostramos cómo se compara con el técnico */}
        {!isTecnico && analisis_distancia && (
          <div className={`mt-2 p-3 rounded-lg flex items-start gap-2 border ${
            analisis_distancia.dentro_de_tolerancia 
              ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#065F46]' 
              : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
          }`}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {analisis_distancia.dentro_de_tolerancia 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              }
            </svg>
            <div className="flex flex-col text-xs font-medium">
              <span>Comparado con: {analisis_distancia.zona_referencia} (Línea Base)</span>
              <span>Distancia medida: <strong>{analisis_distancia.distancia_metros} metros</strong></span>
              {!analisis_distancia.dentro_de_tolerancia && (
                <span className="font-bold mt-1 uppercase tracking-wide">⚠️ Fuera de tolerancia permitida</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}