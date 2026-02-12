export default function SiteLogoMobile() {
  return (
    <div id="site-logo-mobile" className="md:hidden fixed top-0 left-1/2 z-[200] pt-2" style={{ transform: 'translateX(-50%)' }}>
      <img
        src="/images/Logo sans fond.png"
        alt="PadelXP"
        className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
      />
    </div>
  );
}

