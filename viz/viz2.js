import { CSS_CONSTANTS as CSS } from "../assets/constants.js";

export const yearSelect = document.getElementById("year-select-podium");

export function chooseYearRadarChart(data) {
  const years = Object.keys(data).sort();
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  yearSelect.addEventListener('change', () => {
    const selectedYear = yearSelect.value;
    const yearData = structuredClone(data[selectedYear]);
    applyMinMaxScaling(yearData);
    drawRadarCharts(yearData, selectedYear);
  });

  const initialYear = years[0];
  const initialYearData = structuredClone(data[initialYear]);
  applyMinMaxScaling(initialYearData);
  drawRadarCharts(initialYearData, initialYear);
}

function drawRadarCharts(yearData, selectedYear) {
  const sortedCountries = Object.entries(yearData)
  .sort(([, a], [, b]) => b.medalScore - a.medalScore)
  .slice(0, 5);

  // const top5Data = Object.fromEntries(sortedCountries);
  // applyMinMaxScaling(top5Data); 

  sortedCountries.forEach(([_, countryData], index) => {
    drawRadarChart({
      containerSelector: `#chart-container-${index + 1}`,
      data: countryData,
      index: index,
    });
  });
}

function applyMinMaxScaling(resultsData) {
  const keysToScale = ["gdpPerCapita", "percentage", "population", "tfr", "AthCount"];
  const minMax = {};

  const countries = Object.values(resultsData);
  countries.forEach(c => {
    if (typeof c.gdp === "number" && typeof c.population === "number" && c.population !== 0) {
      c.gdpPerCapita = c.gdp / c.population;
    } else {
      c.gdpPerCapita = 0;
    }
  });

  for (const key of keysToScale) {
    const values = countries
      .map(c => c[key])
      .filter(v => typeof v === "number" && !isNaN(v));
    minMax[key] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  for (const noc in resultsData) {
    const countryData = resultsData[noc];
    for (const key of keysToScale) {
      const value = countryData[key];
      const { min, max } = minMax[key];
      let scaled = null;
      if (typeof value === "number" && !isNaN(value) && max !== min) {
        scaled = 1 + (value - min) * (9 / (max - min));
      } else {
        scaled = 1;
      }
      countryData[`minmax_${key}`] = scaled;
    }
  }
}

function formatRadarKey(key) {
  switch (key) {
      case "minmax_gdpPerCapita":
          return "GDP per Capita";
      case "minmax_population":
          return "Population";
      case "minmax_tfr":
          return "Fertility Rate";
      case "minmax_percentage":
          return "Youth % (15-25)";
      case "minmax_AthCount":
          return "Athlete Count";
      default:
          return key;
  }
}

export function drawRadarChart({ containerSelector, data, index }) {
  const margin = { top: 50, right: 0, bottom: 0, left: 0 };
  const container = setupContainer(containerSelector);
  let { width, height, innerWidth, innerHeight } = getDimensions(container, margin);
  const radius = Math.min(innerWidth, innerHeight) / 2 * 0.7;

  const radarKeys = ["minmax_gdpPerCapita", "minmax_population", "minmax_tfr", "minmax_percentage", "minmax_AthCount"];
  console.log(width);
  const svg = createSVG(container, width, height);
  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left + innerWidth / 2}, ${margin.top + innerHeight / 2})`);

  const scale = d3.scaleLinear().domain([1, 10]).range([radius * 0.1, radius]);
  const radarAxis = d3.scaleBand().domain(radarKeys).range([0, Math.PI * 2]);

  drawRadarGrid(chartGroup, radius);
  drawRadarAxes(chartGroup, radarKeys, radarAxis, scale);
  drawRadarLabels(chartGroup, radarKeys, radarAxis, scale);

  const countryValues = radarKeys.map(key => ({
    axis: key,
    value: scale(data[key])
  }));

  // Add the first value to the end of the array to close the radar shape
  countryValues.push(countryValues[0]);

  drawRadarShape(chartGroup, countryValues, radarAxis, data, container);

  drawTitle(svg, width, margin.top, data.countryName);
}

function setupContainer(selector) {
  const container = d3.select(selector);
  container.selectAll("*").remove();
  container.selectAll("div.tooltip").remove();
  return container;
}

function getDimensions(container, margin) {
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  return {
    width,
    height,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom
  };
}

function createSVG(container, width, height) {
  return container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");
}

function drawRadarGrid(group, radius) {
  const gridLevels = 10;
  const radarKeys = 5;
  const angleStep = (2 * Math.PI) / radarKeys;

  for (let level = 1; level <= gridLevels; level++) {
    const levelRadius = (radius * level) / gridLevels;
    const points = Array.from({ length: radarKeys }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return [levelRadius * Math.cos(angle), levelRadius * Math.sin(angle)];
    });

    group
      .append("polygon")
      .attr("points", points.map(([x, y]) => `${x},${y}`).join(" "))
      .style("fill", "none")
      .style("stroke", "#F76B51")
      .style("stroke-width", "0.5px");
  }
}

function drawRadarAxes(group, keys, axisScale, valueScale) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    group.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", valueScale(10) * Math.cos(angle))
      .attr("y2", valueScale(10) * Math.sin(angle))
      .attr("stroke", CSS.TextColor)
      .attr("stroke-width", 2);
  });
}

function drawRadarLabels(group, keys, axisScale, valueScale) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    let xPos = valueScale(10) * Math.cos(angle) ;
    let yPos = valueScale(10) * Math.sin(angle);
    // Adjust positions for specific keys
    if (key === "minmax_percentage" || key === "minmax_tfr") {
      xPos *= 1.6;
      yPos *= 1.6;
    }
    if (key === "minmax_AthCount") {
      xPos -= 15;
    }
    if (key === "minmax_population") {
      xPos += 15;
    }
    group.append("text")
      .attr("x", xPos)
      .attr("y", yPos)
      .attr("dy", "-10px")
      .style("text-anchor", "middle")
      .style("font-family", CSS.Font)
      .style("fill", CSS.TextColor)
      .style("font-size", "12px")
      .text(formatRadarKey(key));
  });
}

function drawRadarShape(group, values, axisScale, data, container) {
  const radarLine = d3.lineRadial()
    .angle(d => axisScale(d.axis))
    .radius(d => d.value);

   // crate a const for the fill color which is the same as the stroke color but with 0.2 opacity
  const fillColor = d3.color(CSS.RadarColor).copy({ opacity: 0.2 }).toString();

  const path = group.append("path")
    .datum(values)
    .attr("d", radarLine)
    .attr("fill", fillColor)
    .attr("stroke", CSS.RadarColor)
    .attr("stroke-width", 2)
    .style("pointer-events", "all");

  const tooltip = createTooltip(container);

  path.on("mouseover", () => {
    tooltip.style("opacity", 1)
      .html(`<strong>${data.countryName}</strong><br>
        GDP per Capita: ${data.gdpPerCapita.toFixed(2)}<br>
        Population: ${data.population.toFixed(2)}<br>
        Fertility: ${data.tfr.toFixed(2)}<br>
        Youth %: ${data.percentage.toFixed(2)}<br>
        Athletes: ${data.AthCount.toFixed(2)}`);
  }).on("mousemove", (event) => {
    tooltip
      .style("left", `${event.pageX + 15}px`)
      .style("top", `${event.pageY - 120}px`);
  }).on("mouseout", () => {
    tooltip.style("opacity", 0);
  });
}

function createTooltip(container) {
  return d3.select("main").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "var(--secondary-color)")
    .style("border", "1px solid var(--text-color)")
    .style("color", "var(--text-color)")
    .style("border-radius", "4px")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .style("opacity", 0);
}

function drawTitle(svg, width, topMargin, countryName) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", topMargin / 1.2)
    .attr("text-anchor", "middle")
    .style("font-family", CSS.Font)
    .style("font-size", "25px")
    .style("fill", CSS.TextColor)
    .text(`${countryName}`);
}

function drawSubtitle(svg, width, height, bottomMargin, rank, medals) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - bottomMargin / 2)
    .attr("text-anchor", "middle")
    .style("font-family", CSS.Font)
    .style("font-size", "25px")
    .style("fill", CSS.TextColor)
    .text(`${rank + 1} place with ${medals} medals`);
}