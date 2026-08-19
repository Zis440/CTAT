import React from 'react';

export const RiskBar: React.FC<{ label: string; level: string }> = ({ label, level }) => {
  const match = String(level).match(/\((\d+)\/100\)/);
  let riskScore = 30;
  let levelText = String(level);

  if (match) {
    levelText = match[1].trim().toUpperCase();
    riskScore = parseInt(match[2], 10);
    levelText = `${levelText} (${riskScore}/100)`;
  } else {
    levelText = String(level).trim().toUpperCase();
    if (levelText.includes('LOW')) riskScore = 20;
    else if (levelText.includes('MODERATE')) riskScore = 50;
    else if (levelText.includes('HIGH')) riskScore = 80;
    else if (levelText.includes('CRITICAL')) riskScore = 100;

    levelText = `${levelText} (${riskScore}/100)`;
  }

  let color = '#238b40';
  if (levelText.includes('MODERATE')) color = '#3b82f6';
  else if (levelText.includes('HIGH') || levelText.includes('ELEVATED')) color = '#f59e0b';
  else if (levelText.includes('CRITICAL') || levelText.includes('SEVERE')) color = '#ef4444';

  return (
    <div className="mb-6">
      <div className="flex justify-between text-[11px] font-bold text-foreground mb-2 uppercase tracking-wide">
        <span>{label}</span>
        <span style={{ color }}>{levelText}</span>
      </div>
      <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${riskScore}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
};

export const ColorBandBar: React.FC<{ label: string; value: number; compareText?: string }> = ({ label, value, compareText }) => {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-[11px] font-bold text-foreground mb-1 uppercase tracking-wider">
        <span>{label}</span>
        <span className="text-[#50d3a7]">{value} / 100</span>
      </div>
      <div className="w-full bg-muted h-4 border border-[#50d3a7]/50 overflow-hidden">
        <div className="h-full bg-[#238b40] transition-all duration-1000" style={{ width: `${value}%` }}></div>
      </div>
      {compareText && <p className="text-[10px] text-muted-foreground mt-1 italic">{compareText}</p>}
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="mt-10 mb-4">
    <h2 className="text-[14px] font-bold text-[#238b40] uppercase">
      ■ {title.replace(/^\d+\.\s*/, '')}
    </h2>
  </div>
);

export const FormattedText: React.FC<{ text: unknown }> = ({ text }) => {
  if (!text) return null;
  const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  return (
    <div className="text-foreground leading-relaxed text-[13px] font-['Helvetica',sans-serif]">
      {content.split('\n').map((paragraph, idx) => (
        <p key={idx} className="mb-2">{paragraph}</p>
      ))}
    </div>
  );
};
