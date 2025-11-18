export default function SiteLogoMobile() {
  return (
    <div className="md:hidden fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] pt-2">
      <img 
        src="/images/Logo sans fond.png" 
        alt="PadelXP" 
        className="h-12 w-12 object-contain"
      />
    </div>
  );
}

