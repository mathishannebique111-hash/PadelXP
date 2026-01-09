"use client";

interface Props {
  niveau: number;
  categorie: string;
}

export default function LevelBadge({ niveau, categorie }: Props) {
  const getColor = () => {
    if (niveau >= 9) return "from-yellow-500 to-orange-500";
    if (niveau >= 7) return "from-purple-500 to-pink-500";
    if (niveau >= 5) return "from-blue-500 to-indigo-500";
    if (niveau >= 3) return "from-green-500 to-teal-500";
    return "from-gray-500 to-slate-500";
  };

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 md:px-6 py-3 rounded-full bg-gradient-to-r ${getColor()} text-white shadow-lg`}
    >
      <span className="text-2xl md:text-3xl font-black">{niveau}</span>
      <div className="text-left">
        <p className="text-xs md:text-sm opacity-90">Niveau</p>
        <p className="text-sm md:text-base font-bold">{categorie}</p>
      </div>
    </div>
  );
}

