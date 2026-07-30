export type OrStatus = 'surgery' | 'free' | 'cleaning' | 'sterilization';

export type OrStatusOption = {
  id: OrStatus;
  /** Короткий заголовок на планшете */
  tabletLabel: string;
  /** Крупный заголовок на внешнем мониторе */
  displayLabel: string;
  tabletSubtitle?: string;
  displaySubtitle: string;
  /** Белая иконка для цветного фона (планшет / дверной монитор) */
  icon: string;
  /** Цветная иконка для светлого UI (админка / инфоэкран) */
  iconColor: string;
  color: string;
};

const icon = (name: string) => `${process.env.PUBLIC_URL}/images/or/${name}.png?v=3`;
const colorIcon = (name: string) => `${process.env.PUBLIC_URL}/images/or/${name}-color.png?v=3`;

export const OR_STATUS_OPTIONS: OrStatusOption[] = [
  {
    id: 'surgery',
    tabletLabel: 'Идёт операция',
    displayLabel: 'Идёт операция',
    tabletSubtitle: 'просьба не беспокоить',
    displaySubtitle: 'посторонним вход воспрещён',
    icon: icon('surgery'),
    iconColor: colorIcon('surgery'),
    color: '#e53935',
  },
  {
    id: 'free',
    tabletLabel: 'Свободно',
    displayLabel: 'Свободно',
    displaySubtitle: 'операционная готова к работе',
    icon: icon('free'),
    iconColor: colorIcon('free'),
    color: '#8bc34a',
  },
  {
    id: 'cleaning',
    tabletLabel: 'Уборка',
    displayLabel: 'Уборка',
    displaySubtitle: 'просьба не беспокоить',
    icon: icon('cleaning'),
    iconColor: colorIcon('cleaning'),
    color: '#4fc3f7',
  },
  {
    id: 'sterilization',
    tabletLabel: 'Стерилизация',
    displayLabel: 'Стерилизация',
    displaySubtitle: 'просьба не беспокоить',
    icon: icon('sterilization'),
    iconColor: colorIcon('sterilization'),
    color: '#9c6ade',
  },
];

export const OR_STATUS_BY_ID: Record<OrStatus, OrStatusOption> = OR_STATUS_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option;
    return acc;
  },
  {} as Record<OrStatus, OrStatusOption>,
);

export const DEFAULT_OR_STATUS: OrStatus = 'free';

export function isOrStatus(value: unknown): value is OrStatus {
  return (
    value === 'surgery' ||
    value === 'free' ||
    value === 'cleaning' ||
    value === 'sterilization'
  );
}
