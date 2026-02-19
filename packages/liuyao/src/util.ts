const SHENG = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
} as const;

const KE = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
} as const;

export function getWuxingRelation(me: string, other: string) {
  if (me === other) {
    return '兄弟';
  } else if (SHENG[me] === other) {
    return '子孙';
  } else if (KE[me] === other) {
    return '妻财';
  } else if (SHENG[other] === me) {
    return '父母';
  } else if (KE[other] === me) {
    return '官鬼';
  }
}
