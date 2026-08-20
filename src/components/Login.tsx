import React from 'react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';
import { IconWrapper } from './IconWrapper';
import { slimeSpring } from '../lib/utils';

export function Login() {
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async () => {
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Erro no login Firebase:", error);
      setIsLoading(false);
      
      if (error?.code === 'auth/network-request-failed') {
        setErrorMsg("Erro de rede. Verifique se o seu navegador está bloqueando cookies de terceiros ou desative seu ad-blocker e tente novamente.");
      } else if (error?.code === 'auth/popup-blocked') {
        setErrorMsg("O pop-up de login foi bloqueado pelo navegador. Por favor, permita pop-ups para este site ou clique no botão abaixo para abrir em uma nova aba.");
      } else if (error?.code === 'auth/unauthorized-domain') {
        setErrorMsg(`Domínio não autorizado. Adicione "${window.location.hostname}" na lista de Domínios Autorizados no Console do Firebase (Authentication > Settings > Authorized domains).`);
      } else if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        // Just ignore if the user closed the popup or cancelled it
        setErrorMsg(null);
      } else {
        setErrorMsg(error?.message || "Ocorreu um erro ao fazer login.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-transparent relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={slimeSpring}
        className="w-full max-w-sm bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-xl shadow-pink-200/40"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-[#ff9a9e] to-[#fecfef] rounded-[1.5rem] rotate-12 flex items-center justify-center shadow-inner border border-white mb-6">
          <IconWrapper name="favorite" className="text-white w-10 h-10 icon-filled -rotate-12" />
        </div>
        
        <h1 className="font-singsong text-3xl font-black text-[#5c4b51] mb-2">Polenca Eats</h1>
        <p className="font-whimsical text-[18px] text-[#ff7597] font-bold mb-8">
          Acesse para guardar e compartilhar os lugares de vocês na nuvem.
        </p>

        {errorMsg && (
          <div className="bg-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold w-full text-left flex flex-col gap-2">
            <p>{errorMsg}</p>
            {window.self !== window.top && (
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 underline mt-1 block text-center"
              >
                Abrir em uma nova aba
              </a>
            )}
          </div>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={slimeSpring}
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-white/70 backdrop-blur-md border border-white/80 shadow-md text-[#5c4b51] font-black py-4 px-6 rounded-[2rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-[#5c4b51] border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          )}
          <span>{isLoading ? 'Entrando...' : 'Entrar com Google'}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
