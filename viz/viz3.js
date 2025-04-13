export const yearSelect = document.getElementById("year-select");
export const disciplineSelect = document.getElementById("discipline-select");
const section3Container = "#section3";

export function populateYearAndDisciplineOptions(data) {
  const years = Object.keys(data).sort();
  const disciplines = new Set();

  for (const year of years) {
    const countries = data[year];
    for (const country of Object.values(countries)) {
      for (const d of Object.keys(country.disciplines || {})) {
        disciplines.add(d);
      }
    }
  }

  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  Array.from(disciplines)
    .sort()
    .forEach((discipline) => {
      const option = document.createElement("option");
      option.value = discipline;
      option.textContent = discipline;
      disciplineSelect.appendChild(option);
    });
    yearSelect.addEventListener('change', () => updateChart(data));
    disciplineSelect.addEventListener('change', () => updateChart(data));
}

export function updateChart(resultsData) {
  const year = yearSelect.value;
  const discipline = disciplineSelect.value;

  drawBarChart({
    containerSelector: section3Container,
    data: resultsData,
    yearSeason: year,
    discipline: discipline,
  });
}

export function drawBarChart({
  containerSelector,
  data,
  yearSeason,
  discipline,
}) {
  console.log("params", yearSeason, discipline);
  const margin = { top: 50, right: 20, bottom: 80, left: 80 };
  const ticks = { x: 6, y: 10 };
  const fontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-family")
    .trim();
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-color")
    .trim();

  const container = d3.select(containerSelector + " .graph");
  container.selectAll("*").remove();

  const width = container.node().clientWidth;
  const height = container.node().clientHeight;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const yearData = data[yearSeason] || {};
  const formattedData = Object.entries(yearData)
    .map(([noc, values]) => ({
      countryName: values.countryName,
      medals: values.disciplines?.[discipline] || 0,
    }))
    .filter((d) => d.medals > 0)
    .sort((a, b) => b.medals - a.medals)
    .slice(0, 20); // Top 20

  console.log(formattedData);

  const x = d3
    .scaleBand()
    .domain(formattedData.map((d) => d.countryName))
    .range([0, innerWidth])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(formattedData, (d) => d.medals)])
    .nice()
    .range([innerHeight, 0]);

  chart
    .append("g")
    .selectAll("rect")
    .data(formattedData)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.countryName))
    .attr("y", (d) => y(d.medals))
    .attr("width", x.bandwidth())
    .attr("height", (d) => innerHeight - y(d.medals))
    .attr("fill", "#69b3a2");

  chart
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-45)")
    .style("font-family", fontFamily)
    .style("fill", textColor);

  chart
    .append("g")
    .call(d3.axisLeft(y).ticks(ticks.y))
    .selectAll("text")
    .style("font-family", fontFamily)
    .style("fill", textColor);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-family", fontFamily)
    .style("font-size", "18px")
    .style("fill", textColor)
    .text(`${discipline} Medals in ${yearSeason}`);
}
