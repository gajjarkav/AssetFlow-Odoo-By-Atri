import React, { useState, useEffect } from "react";

interface ExpandProps {
  className?: string;
}

export const Expand: React.FC<ExpandProps> = ({ className }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = (event: React.MouseEvent) => {
    const willBeDark = !isDark;
    
    const toggle = () => {
      document.documentElement.classList.toggle('dark');
      setIsDark(willBeDark);
    };

    if (!document.startViewTransition) {
      toggle();
      return;
    }
    
    const x = event.clientX;
    const y = event.clientY;
    
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );
    
    const transition = document.startViewTransition(toggle);
    
    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: isDark
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-violet-400 bg-white dark:bg-[#393053] rounded-full transition-all border border-slate-200 dark:border-[#443C68] shadow-sm flex items-center justify-center w-9 h-9 cursor-pointer overflow-hidden ${className || ''}`}
      title="Toggle Theme"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform duration-500 transform ${isDark ? 'rotate-180 text-violet-400' : 'rotate-0 text-amber-500'}`}
      >
        {isDark ? (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </>
        )}
      </svg>
    </button>
  );
};
