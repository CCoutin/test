import React from 'react';

const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Geometric and abstract 'G' shape for a more professional look */}
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeWidth="1.5" />
    <path d="M18 12a6 6 0 0 0-6-6" />
    <path d="M12 12h4" />
  </svg>
);

export default LogoIcon;