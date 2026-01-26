import React from "react";

type Props = {
    className?: string;
};

export function Logo({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 500 500"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            fill="none"
        >
            <defs>
                <style>{`
          .logo-text { font-family: 'Times New Roman', serif; font-size: 180px; fill: currentColor; }
          .name-text { font-family: 'Inter', 'Arial', sans-serif; font-size: 36px; fill: currentColor; letter-spacing: 12px; font-weight: 300; }
          .slash { stroke: currentColor; stroke-width: 4; }
        `}</style>
            </defs>

            {/* S/B Monogram */}
            <g transform="translate(250, 180)">
                <text x="-65" y="-10" className="logo-text" textAnchor="middle">S</text>
                <line x1="-50" y1="80" x2="60" y2="-100" className="slash" />
                <text x="45" y="110" className="logo-text" textAnchor="middle">B</text>
            </g>

            {/* Full Name */}
            <text x="250" y="380" className="name-text" textAnchor="middle">SUNANDO</text>
            <text x="250" y="440" className="name-text" textAnchor="middle">BHATTACHARYA</text>
        </svg>
    );
}
