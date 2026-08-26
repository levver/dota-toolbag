import React from 'react';

export type ToolAccentColor = 'red' | 'blue' | 'green' | 'purple' | 'gold';

interface ToolLayoutProps {
  title: string;
  accentColor: ToolAccentColor;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

const ACCENT_DOT_CLASSES: Record<ToolAccentColor, string> = {
  red: 'bg-palette-red',
  blue: 'bg-palette-blue',
  green: 'bg-palette-green',
  purple: 'bg-palette-purple',
  gold: 'bg-palette-gold',
};

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  accentColor,
  headerRight,
  children,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-5 text-canvas-text w-full">
      {/* Standardized Tool Header */}
      <div className="flex items-center justify-between pb-2 border-b border-canvas-border min-h-[32px]">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-bespoke-sm ${ACCENT_DOT_CLASSES[accentColor]} flex-shrink-0`}></span>
          <h1 className="text-sm font-semibold tracking-tight text-canvas-text uppercase leading-none">
            {title}
          </h1>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>

      {/* Tool Content */}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
};
