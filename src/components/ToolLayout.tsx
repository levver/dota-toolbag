import React from 'react';
import { ToolAccentColor, TOOL_ACCENT_MAP } from '../config/tools';

interface ToolLayoutProps {
  title: string;
  accentColor: ToolAccentColor;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  accentColor,
  headerRight,
  children,
}) => {
  const accentVars = TOOL_ACCENT_MAP[accentColor];

  const style = {
    '--tool-accent': accentVars.solid,
    '--tool-accent-subtle': accentVars.subtle,
    '--tool-accent-border': accentVars.border,
    '--tool-accent-text': accentVars.text,
    '--tool-accent-hover': accentVars.hover,
  } as React.CSSProperties;

  return (
    <div
      style={style}
      className="max-w-4xl mx-auto space-y-5 text-canvas-text w-full"
    >
      {/* Standardized Tool Header */}
      <div className="flex items-center justify-between pb-2 border-b border-canvas-border min-h-[32px]">
        <div className="flex items-center space-x-2">
          <span
            style={{ backgroundColor: accentVars.solid }}
            className="w-2.5 h-2.5 rounded-bespoke-sm flex-shrink-0"
          ></span>
          <h1 className="text-sm font-semibold tracking-tight text-canvas-text uppercase leading-none">
            {title}
          </h1>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>

      {/* Tool Content */}
      <div className="space-y-5">{children}</div>
    </div>
  );
};
