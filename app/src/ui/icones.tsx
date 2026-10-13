// Ícones em SVG (traço), para não depender de fontes externas offline.
import type { JSX } from 'preact';

type Props = JSX.SVGAttributes<SVGSVGElement>;

function Base({ children, ...props }: Props & { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={1.9}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconeHoje = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const IconeCalendario = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
);

export const IconeTarefas = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Base>
);

export const IconeEquipe = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M16 14.6c2.8 0 5 1.9 5 4.9" />
  </Base>
);

export const IconeConfig = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);

export const IconeMais = (p: Props) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconeFechar = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconeRelogio = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const IconeBolo = (p: Props) => (
  <Base {...p}>
    <path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
    <path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z" />
  </Base>
);

export const IconeFerias = (p: Props) => (
  <Base {...p}>
    <path d="M3 21h18M12 21V9" />
    <path d="M12 9C9 5 5 5 3 7c3 0 6 .5 9 2zM12 9c3-4 7-4 9-2-3 0-6 .5-9 2zM12 9c-1-3.5 1-6 3-6.5-.5 2-1.5 4-3 6.5z" />
  </Base>
);

export const IconeRepetir = (p: Props) => (
  <Base {...p}>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 0 1-4 4H4" />
  </Base>
);

export const IconeArrastar = (p: Props) => (
  <Base {...p}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width={3} />
  </Base>
);

export const IconeLapis = (p: Props) => (
  <Base {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </Base>
);

export const IconeLista = (p: Props) => (
  <Base {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width={3} />
  </Base>
);

export const IconeAlerta = (p: Props) => (
  <Base {...p}>
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Base>
);

/* ---------------- Cofre ---------------- */

export const IconeCadeado = (p: Props) => (
  <Base {...p}>
    <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 15v2" />
  </Base>
);

export const IconeCopiar = (p: Props) => (
  <Base {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
  </Base>
);

export const IconeOlho = (p: Props) => (
  <Base {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const IconeOlhoFechado = (p: Props) => (
  <Base {...p}>
    <path d="M9.9 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </Base>
);

export const IconeEstrela = (p: Props) => (
  <Base {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Base>
);

export const IconeAbrir = (p: Props) => (
  <Base {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Base>
);

export const IconeBusca = (p: Props) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.3-4.3" />
  </Base>
);

export const IconeChave = (p: Props) => (
  <Base {...p}>
    <circle cx="7.5" cy="15.5" r="4" />
    <path d="M10.3 12.7L20 3M16 7l3 3M14 9l2 2" />
  </Base>
);

export const IconeCartao = (p: Props) => (
  <Base {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19M6.5 15h4" />
  </Base>
);

export const IconeWifi = (p: Props) => (
  <Base {...p}>
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
    <path d="M12 19.5h.01" stroke-width={3} />
  </Base>
);

export const IconeDocumento = (p: Props) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.5 16c.6-1.4 1.6-2 3-2s2.4.6 3 2M14 10h4M14 14h4" />
  </Base>
);

export const IconeCarro = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 16.5V12l2-5a2 2 0 0 1 1.9-1.3h9.2a2 2 0 0 1 1.9 1.3l2 5v4.5" />
    <path d="M3.5 12h17M3.5 16.5h17M6 16.5V19M18 16.5V19" />
    <path d="M7 14.2h.01M17 14.2h.01" stroke-width={2.6} />
  </Base>
);

export const IconeNota = (p: Props) => (
  <Base {...p}>
    <path d="M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M14.5 3v4.5H19M8 12h8M8 16h5" />
  </Base>
);

export const IconeDado = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" stroke-width={3} />
  </Base>
);

export const IconeSetaCima = (p: Props) => (
  <Base {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Base>
);

export const IconeSetaBaixo = (p: Props) => (
  <Base {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Base>
);

export const IconeLixeira = (p: Props) => (
  <Base {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7" />
  </Base>
);

export const IconeDigital = (p: Props) => (
  <Base {...p}>
    <path d="M6.2 18.5c.8-1.6 1.3-3.4 1.3-5.5a4.5 4.5 0 0 1 9 0c0 1 0 2-.2 3" />
    <path d="M12 13c0 3.2-.9 6-2.6 8M15.8 19.5c-.3.8-.6 1.5-1 2.2M4 15.5c.3-.8.5-1.6.5-2.5a7.5 7.5 0 0 1 12.7-5.4M19.3 10c.4 1 .7 1.9.7 3 0 .8 0 1.6-.1 2.3" />
  </Base>
);
