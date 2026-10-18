import type { Dimensions, HabitatItem, HabitatProfile } from '@/lib/habitat/planner';

export function HabitatPlan({
  dimensions,
  items,
  profile,
  selected,
  onSelect,
  exportId,
}: {
  dimensions: Dimensions;
  items: HabitatItem[];
  profile: HabitatProfile;
  selected?: string;
  onSelect?: (id: string) => void;
  exportId?: string;
}) {
  const { width, depth } = dimensions;
  const scale = 440 / Math.max(width, depth);
  const w = width * scale,
    d = depth * scale;
  const x = (520 - w) / 2,
    y = 45;
  return (
    <svg
      id={exportId}
      viewBox={`0 0 520 ${d + 110}`}
      role="img"
      aria-label={`Plan de dessus : ${profile.name}, ${width} sur ${depth} centimètres`}
      className="habitat-plan"
    >
      <title>{`${profile.name} — plan de dessus, hauteur ${dimensions.height} cm`}</title>
      <rect
        x={x}
        y={y}
        width={w}
        height={d}
        rx="4"
        fill={profile.substrateColor}
        fillOpacity=".28"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text x="260" y="25" textAnchor="middle" fill="currentColor" fontSize="13">
        {width} cm
      </text>
      <text x={x + w / 2} y={y + d + 25} textAnchor="middle" fill="currentColor" fontSize="12">
        Avant · profondeur {depth} cm · hauteur {dimensions.height} cm
      </text>
      {items.map((item, index) => {
        const px = x + (item.position[0] * 100 + width / 2) * scale;
        const py = y + (item.position[2] * 100 + depth / 2) * scale;
        const iw = item.size[0] * 100 * scale,
          ih = item.size[2] * 100 * scale;
        return (
          <g
            key={item.id}
            onClick={() => onSelect?.(item.id)}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item.id);
                    }
                  }
                : undefined
            }
            aria-label={`${index + 1}. ${item.label}. ${item.placement}`}
            style={{ cursor: onSelect ? 'pointer' : undefined }}
          >
            <title>{`${item.label} — ${item.placement}`}</title>
            <rect
              x={px - iw / 2}
              y={py - ih / 2}
              width={iw}
              height={ih}
              rx="4"
              transform={`rotate(${(item.rotation * 180) / Math.PI} ${px} ${py})`}
              fill={item.color}
              stroke={selected === item.id ? '#047857' : '#243c35'}
              strokeWidth={selected === item.id ? 3 : 1}
              opacity=".9"
            />
            <circle cx={px} cy={py} r="10" fill="#ffffff" stroke="#243c35" />
            <text
              x={px}
              y={py + 4}
              textAnchor="middle"
              fill="#14252b"
              fontSize="11"
              fontWeight="700"
            >
              {index + 1}
            </text>
          </g>
        );
      })}
      <text x="260" y={y + d + 48} textAnchor="middle" fill="currentColor" fontSize="11">
        Repères schématiques · équipements supérieurs projetés au sol
      </text>
    </svg>
  );
}
