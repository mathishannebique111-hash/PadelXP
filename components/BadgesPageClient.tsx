'use client'

import BadgeUnlockedNotifier from './BadgeUnlockedNotifier'

interface Badge {
  icon: string
  title: string
  description: string
}

interface BadgesPageClientProps {
  obtainedBadges: Badge[]
  children: React.ReactNode
}

export default function BadgesPageClient({ obtainedBadges, children }: BadgesPageClientProps) {
  // Adapter les badges pour le notificateur
  const badgesForNotifier = obtainedBadges.map((badge, index) => ({
    id: `${badge.title}-${index}`, // Utiliser le titre comme ID unique
    name: badge.title,
    description: badge.description,
    icon: badge.icon
  }))

  return (
    <>
      {/* Notificateur invisible */}
      <BadgeUnlockedNotifier unlockedBadges={badgesForNotifier} />
      
      {/* Contenu de la page */}
      {children}
    </>
  )
}

