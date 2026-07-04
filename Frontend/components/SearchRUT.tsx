import { useState } from 'react';
import { motion } from 'framer-motion';

interface SearchRUTProps {
  onSearch: (rut: string) => void;
  isLoading: boolean;
}

// Icono de Lupa simple
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function SearchRUT({ onSearch, isLoading }: SearchRUTProps) {
  const [rut, setRut] = useState('');

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
          placeholder="Ingrese RUT del cliente (ej: 12345678-9)"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-[#002855] transition text-sm shadow-inner"
          required
        />
      </div>
      <motion.button
        type="submit"
        disabled={isLoading}
        className="bg-[#002855] text-white px-8 py-2.5 rounded-lg hover:bg-[#003875] transition font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <>
            {/* Spinner de carga simple */}
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