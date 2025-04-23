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
  .sort(([, a], [, b]) => b.totalMedals - a.totalMedals)
  .slice(0, 5);

  sortedCountries.forEach(([_, countryData], index) => {
    drawRadarChart({
      containerSelector: `#chart-container-${index + 1}`,
      data: countryData,
      index: index,
    });
  });
}

function applyMinMaxScaling(resultsData) {
  const keysToScale = ["gdp", "percentage", "population", "tfr", "AthCount"];
  const minMax = {};

  const countries = Object.values(resultsData);

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
      case "minmax_gdp":
          return "GDP";
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
  const margin = { top: 50, right: 20, bottom: 0, left: 20 };
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

  const container = setupContainer(containerSelector);
  const { width, height, innerWidth, innerHeight } = getDimensions(container, margin);
  const radius = Math.min(innerWidth, innerHeight) / 2;

  const radarKeys = ["minmax_gdp", "minmax_population", "minmax_tfr", "minmax_percentage", "minmax_AthCount"];
  const svg = createSVG(container, width, height);
  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left + innerWidth / 2}, ${margin.top + innerHeight / 2})`);

  const scale = d3.scaleLinear().domain([1, 10]).range([0, radius]);
  const radarAxis = d3.scaleBand().domain(radarKeys).range([0, Math.PI * 2]);

  drawRadarGrid(chartGroup, radius);
  drawRadarAxes(chartGroup, radarKeys, radarAxis, scale, textColor);
  drawRadarLabels(chartGroup, radarKeys, radarAxis, scale, fontFamily, textColor);

  const countryValues = radarKeys.map(key => ({
    axis: key,
    value: scale(data[key])
  }));

  drawRadarShape(chartGroup, countryValues, radarAxis, textColor, data, container);

  drawTitle(svg, width, margin.top, fontFamily, textColor, data.countryName);
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
  for (let level = 0; level < gridLevels; level++) {
    const radiusGrid = radius * ((level + 1) / gridLevels);
    group.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", radiusGrid)
      .style("fill", "none")
      .style("stroke", "#ddd")
      .style("stroke-width", "0.5px");
  }
}

function drawRadarAxes(group, keys, axisScale, valueScale, color) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    group.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", valueScale(10) * Math.cos(angle))
      .attr("y2", valueScale(10) * Math.sin(angle))
      .attr("stroke", color)
      .attr("stroke-width", 2);
  });
}

function drawRadarLabels(group, keys, axisScale, valueScale, fontFamily, color) {
  keys.forEach((key) => {
    const angle = axisScale(key) - Math.PI / 2;
    const xPos = valueScale(10) * Math.cos(angle);
    const yPos = valueScale(10) * Math.sin(angle);
    group.append("text")
      .attr("x", xPos)
      .attr("y", yPos)
      .attr("dy", "-10px")
      .style("text-anchor", "middle")
      .style("font-family", fontFamily)
      .style("fill", color)
      .style("font-size", "12px")
      .text(formatRadarKey(key));
  });
}

function drawRadarShape(group, values, axisScale, strokeColor, data, container) {
  const radarLine = d3.lineRadial()
    .angle(d => axisScale(d.axis))
    .radius(d => d.value);

  const path = group.append("path")
    .datum(values)
    .attr("d", radarLine)
    .attr("fill", "rgba(70,130,180,0.7)")
    .attr("stroke", strokeColor)
    .attr("stroke-width", 2)
    .style("pointer-events", "all");

  const tooltip = createTooltip(container);

  path.on("mouseover", () => {
    tooltip.style("opacity", 1)
      .html(`<strong>${data.countryName}</strong><br>
        GDP: ${data.minmax_gdp.toFixed(2)}<br>
        Population: ${data.minmax_population.toFixed(2)}<br>
        Fertility: ${data.minmax_tfr.toFixed(2)}<br>
        Youth %: ${data.minmax_percentage.toFixed(2)}<br>
        Athletes: ${data.minmax_AthCount.toFixed(2)}`);
  }).on("mousemove", (event) => {
    const bounds = container.node().getBoundingClientRect();
    tooltip.style("left", `${event.clientX - bounds.left + 10}px`)
      .style("top", `${event.clientY - bounds.top - 30}px`);
  }).on("mouseout", () => {
    tooltip.style("opacity", 0);
  });
}

function createTooltip(container) {
  return container.append("div")
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

function drawTitle(svg, width, topMargin, fontFamily, color, countryName) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", topMargin / 2)
    .attr("text-anchor", "middle")
    .style("font-family", fontFamily)
    .style("font-size", "25px")
    .style("fill", color)
    .text(`${countryName}`);
}

function drawSubtitle(svg, width, height, bottomMargin, fontFamily, color, rank, medals) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - bottomMargin / 2)
    .attr("text-anchor", "middle")
    .style("font-family", fontFamily)
    .style("font-size", "25px")
    .style("fill", color)
    .text(`${rank + 1} place with ${medals} medals`);
}