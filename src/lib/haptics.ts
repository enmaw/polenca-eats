export const haptics = {
  // Toque leve padrão (botões, navegação)
  tap: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(30); } catch (e) {}
    }
  },
  
  // Toque duplo/sucesso (salvar, completar)
  success: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }
  },

  // Efeito da roleta girando
  spin: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([20, 100, 20, 100, 20, 100, 20]); } catch (e) {}
    }
  },

  // Sucesso de destaque (resultado da roleta)
  tada: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 200]); } catch (e) {}
    }
  }
};
