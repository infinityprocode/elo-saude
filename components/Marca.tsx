// Marca do Elo Saúde.
// Símbolo: dois elos entrelaçados de verdade (um passa por cima do outro em cada cruzamento),
// em branco sobre um bloco com gradiente cobalto para verde-água. O elo é o vínculo entre
// paciente e cuidado; o entrelaçamento é o histórico que não se solta.
// Geometria: duas "pílulas" 24x18 (raio 9) em y=15..33; os arcos se cruzam em (24, 15,51) e (24, 32,49).

let seq = 0

export function Simbolo({ tamanho = 40, plano = false }: { tamanho?: number; plano?: boolean }) {
  const id = `elo-${(seq = (seq + 1) % 1000)}`
  const fundo = plano ? 'transparent' : `url(#${id}-g)`
  const traco = plano ? 'var(--cobalt-600)' : '#ffffff'
  const vao = plano ? 'var(--page)' : `url(#${id}-g)`
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b7cf0" />
          <stop offset=".55" stopColor="#1f5bd6" />
          <stop offset="1" stopColor="#0f9e96" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".28" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {!plano && <rect x="0" y="0" width="48" height="48" rx="14" fill={fundo} />}
      {!plano && <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="13.25" fill={`url(#${id}-b)`} stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />}
      <clipPath id={`${id}-cima`}><rect x="17" y="8" width="14" height="16" /></clipPath>
      <clipPath id={`${id}-baixo`}><rect x="17" y="24" width="14" height="16" /></clipPath>
      {/* 1. elo da esquerda inteiro */}
      <rect x="6" y="15" width="24" height="18" rx="9" fill="none" stroke={traco} strokeWidth="4.6" />
      {/* 2. no cruzamento de cima, o elo da direita passa por cima: abre um vão no da esquerda */}
      <rect x="18" y="15" width="24" height="18" rx="9" fill="none" stroke={vao} strokeWidth="8" clipPath={`url(#${id}-cima)`} />
      <rect x="18" y="15" width="24" height="18" rx="9" fill="none" stroke={traco} strokeWidth="4.6" />
      {/* 3. no cruzamento de baixo, o da esquerda volta por cima */}
      <rect x="6" y="15" width="24" height="18" rx="9" fill="none" stroke={vao} strokeWidth="8" clipPath={`url(#${id}-baixo)`} />
      <rect x="6" y="15" width="24" height="18" rx="9" fill="none" stroke={traco} strokeWidth="4.6" clipPath={`url(#${id}-baixo)`} />
    </svg>
  )
}

export function Marca({ tamanho = 40, claro = false }: { tamanho?: number; claro?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Simbolo tamanho={tamanho} />
      <span style={{ fontSize: Math.round(tamanho * 0.5), letterSpacing: '-0.035em', lineHeight: 1, color: claro ? '#f3f7ff' : 'var(--ink)', whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 800 }}>elo</span><span style={{ fontWeight: 300, marginLeft: '0.18em' }}>saúde</span>
      </span>
    </span>
  )
}
