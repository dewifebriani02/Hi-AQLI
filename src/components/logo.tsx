import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 300 60"
    aria-label="AQLI Al-Qur'an"
    {...props}
  >
    <text 
        x="50%" 
        y="50%" 
        dominantBaseline="middle" 
        textAnchor="middle" 
        fontFamily="Amiri, serif" 
        fontSize="28" 
        fontWeight="bold" 
        fill="currentColor">
      AQLI AL-QUR'AN
    </text>
  </svg>
);
