/**
 * Medal values used for the bar chart.
 * This is used to calculate the total medal score for each country.
 */
export const MEDAL_VALUES = {
  Gold: 3,
  Silver: 2,
  Bronze: 1,
};

/**
 * Constants imported from the stylesheet.
 */
export const CSS_CONSTANTS = {
  AxisTitleColor: getComputedStyle(document.documentElement)
    .getPropertyValue("--axis-title-color")
    .trim(),

  Font: getComputedStyle(document.documentElement)
    .getPropertyValue("--font-family")
    .trim(),

  TextColor: getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim(),

  RadarColor: getComputedStyle(document.documentElement)
    .getPropertyValue("--button-active-color")
    .trim(),
};

/**
 * Colors used for the continents in the legend.
 * Independant from styles.css.
 */
export const CONTINENT_LEGEND_COLOR = {
  Europe: "#0B7AC9",
  Asia: "#EAA935",
  Africa: "#2B2A29",
  Australia: "#00A357",
  America: "#E34556",
};

/**
 * Colors used for medals in the bar chart.
 * Independant from styles.css.
 */
export const MEDAL_COLORS = {
  gold: "#D6AF35",
  silver: "#A7A7AD",
  bronze: "#A77044",
};
