import { CSS_CONSTANTS as CSS } from "../assets/constants.js";

export function setLineChartListener(
  data,
  containerSelector,
  initialSeason = "Both"
) {
  const seasonSelect = document.getElementById("seasonSelect");

  const updateChart = (event) => {
    const season = event.target.value;
    drawLineChart({ data, containerSelector, season });
  };

  if (seasonSelect) {
    seasonSelect.value = initialSeason;

    seasonSelect.removeEventListener("change", updateChart);

    seasonSelect.addEventListener("change", updateChart);
  }
}

export function drawLineChart({ data, containerSelector, season = "Both" }) {
  const margin = { top: 50, right: 20, bottom: 80, left: 80 };
  const ticks = { x: 6, y: 10 };

  const container = d3.select(containerSelector + " .graph");
  container.selectAll("*").remove();
  container.selectAll("div.tooltip").remove();

  const tooltip = container
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

  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("font-family", CSS.Font)
    .style("color", CSS.TextColor);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const flattened = Object.entries(data)
    .filter(([key]) => season === "Both" || key.includes(season))
    .flatMap(([key, countries]) => {
      const [yearStr] = key.split(",");
      const year = +yearStr;
      return Object.entries(countries).map(([_, d]) => ({
        country: d.countryName,
        year,
        score: d.medalScore,
        medals: d.totalMedals,
      }));
    });

  const cumulativeData = d3
    .groups(flattened, (d) => d.country)
    .map(([country, values]) => {
      values.sort((a, b) => a.year - b.year);
      let cumulativeSum = 0;
      return values.map((d) => {
        cumulativeSum += d.score;
        return { ...d, score: cumulativeSum };
      });
    })
    .flat();

  const totalByCountry = d3.rollups(
    cumulativeData,
    (v) => d3.max(v, (d) => d.score),
    (d) => d.country
  );

  const topCountries = new Set(
    totalByCountry
      .sort((a, b) => d3.descending(a[1], b[1]))
      .slice(0, 10)
      .map(([country]) => country)
  );

  const filtered = cumulativeData.filter((d) => topCountries.has(d.country));
  const dataByCountry = d3.groups(filtered, (d) => d.country);
  const years = Array.from(new Set(filtered.map((d) => d.year))).sort(
    (a, b) => a - b
  );

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([0, innerWidth * 0.9]);
  const yScale = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(dataByCountry, ([, values]) => d3.max(values, (d) => d.score)),
    ])
    .nice()
    .range([innerHeight, 0]);

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.tickStep(d3.min(years), d3.max(years), 2))
    .tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScale).ticks(ticks.y);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .style("fill", CSS.AxisTitleColor);

  g.append("g").call(yAxis).selectAll("text").style("fill", CSS.AxisTitleColor);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain([...topCountries]);

  const lineGenerator = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.score));

  g.selectAll(".line")
    .data(dataByCountry)
    .enter()
    .append("path")
    .attr("class", ([name]) => `line line-${name.replace(/\s+/g, "_")}`)
    .attr("fill", "none")
    .attr("stroke", ([name]) => color(name))
    .attr("stroke-width", 2)
    .attr("d", ([, values]) => lineGenerator(values));

  g.selectAll(".dot")
    .data(filtered)
    .enter()
    .append("circle")
    .attr("class", (d) => `dot dot-${d.country.replace(/\s+/g, "_")}`)
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.score))
    .attr("r", 4)
    .attr("fill", (d) => color(d.country))
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          "<strong>" +
            d.country +
            "</strong><br>" +
            "Year: " +
            d.year +
            "<br>" +
            "Score: " +
            d.score
        );
    })
    .on("mousemove", (event) => {
      const bounds = container.node().getBoundingClientRect();
      tooltip
        .style("left", `${event.clientX - bounds.left + 0}px`)
        .style("top", `${event.clientY - bounds.top + 20}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  const legendItemHeight = 20;
  const visibleCountries = new Set([...topCountries]);

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${innerWidth + 10}, ${innerHeight * 0.2})`);
  legend
    .append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("width", 150)
    .text("Legend")
    .style("fill", CSS.TextColor)
    .style("font-family", CSS.Font)
    .style("font-size", "12px")
    .style("font-weight", "bold");

  

  [...topCountries].forEach((country, i) => {
    const className = country.replace(/\s+/g, "_");

    const legendItem = legend
      .append("g")
      .attr("transform", `translate(0, ${i * legendItemHeight})`)
      .style("cursor", "pointer");

      const switchWidth = 30;
      const switchHeight = 14;
      const knobRadius = 6;
  
      const switchGroup = legendItem.append("g");
  
      switchGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("rx", switchHeight / 2)
        .attr("ry", switchHeight / 2)
        .attr("width", switchWidth)
        .attr("height", switchHeight)
        .attr("fill", "#ccc");
  
      const knob = switchGroup
        .append("circle")
        .attr("cx", switchWidth - knobRadius - 2)
        .attr("cy", switchHeight / 2)
        .attr("r", knobRadius)
        .attr("fill", color(country));

    legendItem.on("click", () => {
      const lines = svg.selectAll(`.line-${className}`);
      const dots = svg.selectAll(`.dot-${className}`);
      const isVisible = visibleCountries.has(country);

      lines.style("display", isVisible ? "none" : "inline");
      dots.style("display", isVisible ? "none" : "inline");

      if (isVisible) {
        visibleCountries.delete(country);
        knob
          .transition()
          .duration(400)
          .attr("cx", knobRadius + 2);
        switchGroup.select("rect").attr("fill", "#ccc");
        text.style("font-weight", "normal");
      } else {
        visibleCountries.add(country);
        knob
          .transition()
          .duration(400)
          .attr("cx", switchWidth - knobRadius - 2);
        switchGroup.select("rect").attr("fill", "#ccc");
        text.style("font-weight", "bold");
      }
    });

    legendItem
      .append("text")
      .attr("x", switchWidth + 8)
      .attr("y", 10)
      .text(country)
      .style("fill", CSS.TextColor)
      .style("font-family", CSS.Font)
      .style("font-size", "10px")
      .style("font-weight", "bold");
  });

  g.append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -margin.left + 20)
    .attr("class", "y-axis-label")
    .text("Medal score");
}
