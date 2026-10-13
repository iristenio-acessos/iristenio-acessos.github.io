// Trava automática (RN04): tranca após N minutos sem uso ou 1 minuto em segundo plano.
import { useEffect } from 'preact/hooks';
import { deveTrancar } from '../dominio/trava';
import { trancar } from '../dados/sessao';
import { limparAreaTransferencia } from './area-transferencia';

export function trancarAgora() {
  trancar();
  limparAreaTransferencia();
}

export function useTravaAutomatica(minutos: number) {
  useEffect(() => {
    const estado = { ultimaAtividade: Date.now(), saiuEm: null as number | null };
    const atividade = () => (estado.ultimaAtividade = Date.now());
    const conferir = () => deveTrancar(estado, Date.now(), minutos) && trancarAgora();
    const visibilidade = () => {
      if (document.hidden) estado.saiuEm = Date.now();
      else {
        conferir();
        estado.saiuEm = null;
        atividade();
      }
    };
    const eventos = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
    eventos.forEach((e) => window.addEventListener(e, atividade, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', visibilidade);
    const id = setInterval(conferir, 5_000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, atividade, { capture: true }));
      document.removeEventListener('visibilitychange', visibilidade);
      clearInterval(id);
    };
  }, [minutos]);
}
