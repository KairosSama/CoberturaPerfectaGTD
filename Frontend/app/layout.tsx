import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';

import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Suite Puente | Portal de Soporte - GTD Cobertura Perfecta',
  description: 'Panel de diagnóstico de cobertura WiFi para GTD Chile.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Fondo general sutilmente azulado (#F8FAFC) y texto oscuro (#1E293B) */}
      <body className={`${inter.className} bg-[#F8FAFC] min-h-screen text-[#1E293B]`}>
        
        {/* Header con el Azul Marino GTD (#002855) y un borde inferior Celeste (#00A4E4) */}
        <header className="bg-[#002855] text-white py-4 px-8 shadow-md flex items-center justify-between sticky top-0 z-50 border-b-[3px] border-[#00A4E4]">
          <div className="flex items-center gap-4">
            {/* Contenedor del Logo SIN fondo blanco y SIN efecto hover */}
            <div className="flex-shrink-0 flex items-center justify-center">
                <Image
                    src="/layout_set_logo.png"
                    alt="Logo GTD"
                    width={48} 
                    height={50} 
                    priority
                    className="object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                />
            </div>
            
            <div className="h-10 w-px bg-white/20" /> 
            
            <div className="flex flex-col justify-center">
              <h1 className="text-xl font-black tracking-tight text-white leading-none mb-1">
                Suite Puente
              </h1>
              <span className="text-xs text-[#00A4E4] font-bold tracking-wide uppercase">
                Portal de Soporte
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white">Mesa de Ayuda</span>
              <span className="text-xs text-[#00A4E4] font-medium">Operador Activo</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white text-[#002855] flex items-center justify-center font-bold shadow-inner border-2 border-[#00A4E4]">
                OP
            </div>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}