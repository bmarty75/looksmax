import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * Logo LOOKSMAX : arc ouvert dégradé orange → vert, triangle de lecture au centre.
 * Pointe orange en haut (1 h), pointe verte en bas à droite (4 h) ;
 * 270° parcourus dans le sens antihoraire, ouverture à droite.
 */
export function Logo({ size = 26 }: { size?: number }) {
  // Le triangle est blanc sur l'icône (fond sombre imposé) mais suit le thème
  // dans l'app, sinon il disparaît sur fond clair.
  const { colors } = useTheme();
  const r = 38;
  const point = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
  };
  const depart = point(35);
  const arrivee = point(125);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="lmArc" x1="18%" y1="0%" x2="92%" y2="98%">
          <Stop offset="0%" stopColor="#FF9F0A" />
          <Stop offset="45%" stopColor="#F0800F" />
          <Stop offset="78%" stopColor="#8FA843" />
          <Stop offset="100%" stopColor="#3FAF63" />
        </LinearGradient>
      </Defs>
      <Path
        d={`M ${depart.x} ${depart.y} A ${r} ${r} 0 1 0 ${arrivee.x} ${arrivee.y}`}
        stroke="url(#lmArc)"
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M 41 33 L 67 50 L 41 67 Z" fill={colors.text} />
    </Svg>
  );
}
