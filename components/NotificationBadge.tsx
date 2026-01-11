interface NotificationBadgeProps {
  count?: number;
  show?: boolean;
  max?: number;
}

export function NotificationBadge({ 
  count, 
  show = true, 
  max = 99 
}: NotificationBadgeProps) {
  // Si on a un count, l'utiliser, sinon juste afficher la pastille
  const hasNotification = show && (count !== undefined ? count > 0 : show);
  
  if (!hasNotification) return null;

  // Si count est fourni, afficher le nombre
  if (count !== undefined) {
    const displayCount = count > max ? `${max}+` : count.toString();
    
    return (
      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center border-2 border-black/95 shadow-lg z-10">
        <span className="text-[10px] font-bold text-white px-1 leading-none">
          {displayCount}
        </span>
      </div>
    );
  }

  // Sinon, juste une pastille rouge simple
  return (
    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black/95 shadow-lg z-10 animate-pulse" />
  );
}
