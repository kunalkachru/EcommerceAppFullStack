import { Platform } from "react-native";

export const colors = {
  background: "#f5efe8",
  backgroundAccent: "#ede2d3",
  surface: "#fffaf4",
  surfaceMuted: "#f4ece1",
  surfaceStrong: "#eadbc9",
  surfaceInverse: "#241c18",
  line: "#e5d8ca",
  lineStrong: "#c8b39b",
  text: "#201916",
  textMuted: "#6f645b",
  textSoft: "#9a8f85",
  accent: "#35536d",
  accentSoft: "#dde7ee",
  accentStrong: "#1d3448",
  accentWarm: "#b79267",
  accentWarmSoft: "#f1e5d7",
  success: "#33684d",
  successSoft: "#edf6f0",
  warning: "#8b6442",
  warningSoft: "#fbf2e7",
  error: "#a6504b",
  errorSoft: "#fbeceb",
  info: "#4f6d86",
  infoSoft: "#edf3f7",
  shadow: "#221813",
  white: "#ffffff",
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const typography = {
  displayFamily: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: undefined,
  }),
  eyebrowSpacing: 1.5,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
};

const luxuryTheme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
};

export default luxuryTheme;
