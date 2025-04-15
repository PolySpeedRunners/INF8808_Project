export const yearSelect = document.getElementById("year-select-podium");
const section2Container = "#section2";

export function chooseYearRadarChart(data) {
  // add choice of year to the chart
  const years = Object.keys(data).sort();
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  yearSelect.addEventListener('change', () => {
    const selectedYear = yearSelect.value;
    drawRadarCharts(data[selectedYear], selectedYear);
  });
  drawRadarCharts(data[years[0]], years[0]);
}

function drawRadarCharts(yearData, selectedYear) {
  const sortedCountries = Object.entries(yearData)
  .sort(([, a], [, b]) => b.totalMedals - a.totalMedals)
  .slice(0, 5);

  sortedCountries.forEach(([countryCode, countryData]) => {
    drawRadarChart({
      containerSelector: section2Container,
      data: countryData,
      yearSeason: selectedYear,
      countryCode: countryCode
    });
  });
}

function applyMinMaxScaling(resultsData) {
  for (const yearSeason in resultsData) {
    const countries = Object.values(resultsData[yearSeason]);

    const keysToScale = ["gdp", "percentage", "population", "tfr", "AthCount"];
    const minMax = {};

    for (const key of keysToScale) {
      const values = countries.map(c => c[key]).filter(v => typeof v === "number" && !isNaN(v));
      minMax[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    for (const noc in resultsData[yearSeason]) {
      const countryData = resultsData[yearSeason][noc];
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
}

export function drawRadarChart({ containerSelector, data, yearSeason, countryCode }) {
  const newData = structuredClone(data);
  applyMinMaxScaling(newData);

  const margin = { top: 50, right: 20, bottom: 80, left: 80 };
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

  const container = d3.select(containerSelector + " .graph");
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const radius = Math.min(innerWidth, innerHeight) / 2;

  const radarKeys = ["minmax_gdp", "minmax_population", "minmax_tfr", "minmax_percentage", "minmax_AthCount"];

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet") // Maintain aspect ratio.
    .style("width", "100%")
    .style("height", "100%")

  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left + innerWidth / 2}, ${margin.top + innerHeight / 2})`);

  const scale = d3.scaleLinear().domain([1, 10]).range([0, radius]);

  const radarAxis = d3.scaleBand()
    .domain(radarKeys)
    .range([0, Math.PI * 2]);

  const gridLevels = 10;
  for (let level = 0; level < gridLevels; level++) {
    const radiusGrid = radius * ((level + 1) / gridLevels);
    chartGroup.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", radiusGrid)
      .style("fill", "none")
      .style("stroke", "#ddd")
      .style("stroke-width", "0.5px");
  }

  radarKeys.forEach((key, index) => {
    const angle = radarAxis(key) - Math.PI / 2;
    chartGroup.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", scale(10) * Math.cos(angle))
      .attr("y2", scale(10) * Math.sin(angle))
      .attr("stroke", textColor)
      .attr("stroke-width", 2);
  });

  radarKeys.forEach((key, index) => {
    const angle = radarAxis(key) - Math.PI / 2;
    const xPos = scale(10) * Math.cos(angle);
    const yPos = scale(10) * Math.sin(angle);

    chartGroup.append("text")
      .attr("x", xPos)
      .attr("y", yPos)
      .attr("dy", "-10px")
      .style("text-anchor", "middle")
      .style("font-family", fontFamily)
      .style("fill", textColor)
      .text(key.replace("minmax_", ""));
  });

  const countryData = newData[yearSeason][countryCode];
  const countryValues = radarKeys.map((key) => ({
    axis: key,
    value: scale(countryData[key])
  }));
  console.log(countryValues);

  const radarLine = d3.lineRadial()
    .angle((d) => radarAxis(d.axis))
    .radius((d) => d.value);

  chartGroup.append("path")
    .datum(countryValues)
    .attr("d", radarLine)
    .attr("fill", "rgba(70,130,180,0.7)")
    .attr("stroke", textColor)
    .attr("stroke-width", 2);

  chartGroup.selectAll(".radar-point")
    .data(countryValues)
    .enter().append("circle")
    .attr("cx", (d) => d.value * Math.cos(radarAxis(d.axis) - Math.PI / 2))
    .attr("cy", (d) => d.value * Math.sin(radarAxis(d.axis) - Math.PI / 2))
    .attr("r", 4)
    .attr("fill", "#FF6347")
    .on("mouseover", function (event, d) {
      tooltip.style("opacity", 1)
        .html(`<strong>${countryData.countryName}</strong><br>${d.axis.replace("minmax_", "")}: ${d.value.toFixed(2)}`);
    })
    .on("mousemove", function (event) {
      const bounds = container.node().getBoundingClientRect();
      tooltip.style("left", `${event.clientX - bounds.left + 10}px`)
        .style("top", `${event.clientY - bounds.top - 30}px`);
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });

  const tooltip = d3.select(containerSelector + " .graph")
    .append("div")
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

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-family", fontFamily)
    .style("font-size", "18px")
    .style("fill", textColor)
    .text(`${yearSeason} - ${countryData.countryName} Kiviat Chart`);
}