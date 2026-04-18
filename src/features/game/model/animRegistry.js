export const ANIM_CATEGORIES = {
  idle: 'Покой',
  reaction: 'Реакция',
  transition: 'Переход',
  death: 'Смерть',
}

export const ANIM_REGISTRY = {
  idle: [
    { id: 'idle-briefcase-1', label: 'AFK 1', url: '/models/maf/Standing W_Briefcase Idle.fbx', idleSuitable: true },
    { id: 'idle-briefcase-2', label: 'AFK 2', url: '/models/maf/Standing W_Briefcase Idle 2.fbx', idleSuitable: true },
    { id: 'idle-weight-shift', label: 'AFK 5', url: '/models/maf/Weight Shift.fbx', idleSuitable: true },
    { id: 'idle-catwalk', label: 'AFK 3', url: '/models/maf/Catwalk Idle Twist L.fbx', idleSuitable: true },
    { id: 'idle-test', label: 'AFK 4', url: '/models/maf/test-bones-animation.fbx', idleSuitable: true },
  ],
  reaction: [
    { id: 'reaction-praying', label: 'Молитва', url: '/models/maf/Praying.fbx', idleSuitable: false },
    { id: 'idle-sitting', label: 'Лежит', url: '/models/maf/Sitting Idle.fbx', idleSuitable: false },
    { id: 'idle-breakdance', label: 'Денс', url: '/models/maf/Breakdance Footwork To Idle.fbx', idleSuitable: false },
    { id: 'idle-shoulder', label: 'Размял плечи', url: '/models/maf/Shoulder Rubbing.fbx', idleSuitable: false },
    { id: 'idle-base', label: 'Машет руками', url: '/models/maf/anim.fbx', idleSuitable: false },
  ],
  transition: [
    { id: 'transition-stand-up', label: 'Встает', url: '/models/maf/Standing Up.fbx', idleSuitable: false },
  ],
  death: [
    { id: 'death-fall', label: 'Падение', url: '/models/maf/dying.fbx', idleSuitable: false },
  ],
}

export const IDLE_POOL_IDS = ANIM_REGISTRY.idle
  .filter((e) => e.idleSuitable)
  .map((e) => e.id)

export const ALL_ANIM_ENTRIES = Object.entries(ANIM_REGISTRY).flatMap(([category, entries]) =>
  entries.map((entry) => ({ ...entry, category })),
)

export const ALL_ANIM_URLS = [...new Set(ALL_ANIM_ENTRIES.map((e) => e.url))]

export function getLabelForId(id) {
  for (const entries of Object.values(ANIM_REGISTRY)) {
    const found = entries.find((e) => e.id === id)
    if (found) return found.label
  }
  return id
}