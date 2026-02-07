export interface Gitsawe {
  id: string;
  lineId: string;
  messageStPaul?: string;
  messageApostle?: string;
  messageBookOfActs?: string;
  misbak?: string;
  wengel?: string;
  kidaseType?: string;
  evangelist?: string;
  messageApostleEvangelist?: string;
  gitsaweType?: string;
  priority: number;
  createdAt: string;
}

export function createGitsawe(
  lineId: string,
  priority: number,
  options?: {
    messageStPaul?: string;
    messageApostle?: string;
    messageBookOfActs?: string;
    misbak?: string;
    wengel?: string;
    kidaseType?: string;
    evangelist?: string;
    messageApostleEvangelist?: string;
    gitsaweType?: string;
  },
): Omit<Gitsawe, 'id' | 'createdAt'> {
  return {
    lineId,
    priority,
    messageStPaul: options?.messageStPaul,
    messageApostle: options?.messageApostle,
    messageBookOfActs: options?.messageBookOfActs,
    misbak: options?.misbak,
    wengel: options?.wengel,
    kidaseType: options?.kidaseType,
    evangelist: options?.evangelist,
    messageApostleEvangelist: options?.messageApostleEvangelist,
    gitsaweType: options?.gitsaweType,
  };
}
