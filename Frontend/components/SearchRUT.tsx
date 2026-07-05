import { useState } from 'react';
import { motion } from 'framer-motion';

interface SearchRUTProps {
  onSearch: (rut: string) => void;
  isLoading: boolean;
}

const SearchIcon = () => (
  <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function SearchRUT({ onSearch, isLoading }: SearchRUTProps) {
  const [rut, setRut] = useState('');

  // Función para forzar el formato XX.XXX.XXX-X
  const formatRUT = (value: string) => {
    // 1. Eliminar todo lo que no sea número o letra K/k
    const cleanValue = value.replace(/[^0-9kK]/g, '');
    if (cleanValue.length === 0) return '';
    
    // Si solo hay un número, lo retornamos tal cual
    if (cleanValue.length <= 1) return cleanValue.toUpperCase();
    
    // 2. Separar el cuerpo del dígito verificador
    const body = cleanValue.slice(0, -1);
    const dv = cleanValue.slice(-1).toUpperCase();
    
    // 3. Agregar los puntos al cuerpo usando una expresión regular
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // 4. Unir todo con el guion
    return `${formattedBody}-${dv}`;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUT(e.target.value);
    setRut(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rut.trim()) onSearch(rut.trim());
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="flex gap-4 mb-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Ingrese RUT del cliente (ej: 12.345.678-9)"
          value={rut}
          onChange={handleRutChange}
          maxLength={12} // Límite exacto para el formato con puntos y guion
          className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-[#002855] transition text-sm shadow-inner text-[#1E293B] font-medium"
          required
        />
      </div>
      <motion.button
        type="submit"
        disabled={isLoading}
        className="bg-[#00A4E4] text-white px-8 py-2.5 rounded-lg hover:bg-[#008CBE] transition font-bold text-sm disabled:opacity-50 flex items-center gap-2 shadow-md"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <SearchIcon />
            Consultar Cliente
          </>
        )}
      </motion.button>
    </motion.form>
  );
}
