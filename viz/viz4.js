import { CSS_CONSTANTS as CSS } from '../assets/constants.js';

/* Local Constants */
const ANIMATION_TIME = 750; // ms

/**
 * Sets a listener on the season select dropdown to update the chart when the season changes.
 *
 * @param {Object} data The dataset containing medal scores.
 * @param {string} containerSelector The selector for the chart container.
 * @param {string} [initialSeason="Both"] The initially selected season.
 */
export function setLineChartListener (
  data,
  containerSelector,
  initialSeason = 'Both'
) {
  const seasonSelect = document.getElementById('seasonSelect');

  const updateChart = (event) => {
    const season = event.target.value;
    drawLineChart({ data, containerSelector, season });
  };

  if (seasonSelect) {
    seasonSelect.value = initialSeason;

    seasonSelect.removeEventListener('change', updateChart);

    seasonSelect.addEventListener('change', updateChart);
  }
}

export function drawLineChart ({ data, containerSelector, season = 'Both' }) {
  const margin = { top: 20, right: -20, bottom: 80, left: 80 };
  const ticks = { x: 6, y: 10 };

  const container = setupContainer(containerSelector);
  const tooltip = createTooltip(container);
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {svg, g } = setupSVG(container, margin, width, height);

  const cumulativeData = processData(data, season);
  const topCountries = getTopCountries(cumulativeData);
  const filtered = cumulativeData.filter(d => topCountries.has(d.country));
  const dataByCountry = d3.groups(filtered, d => d.country);
  const years = Array.from(new Set(filtered.map(d => d.year))).sort((a, b) => a - b);

  const { xScale, yScale } = createScales(years, dataByCountry, innerWidth, innerHeight);
  drawAxes(g, xScale, yScale, innerHeight, ticks);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain([...topCountries]);
  drawLines(g, dataByCountry, xScale, yScale, color);
  drawDots(g, filtered, xScale, yScale, color, tooltip, container);
  drawLegend(svg, topCountries, color, containerSelector);
  drawYAxisLabel(g, innerHeight, margin);
  drawXAxisLabel(g, innerWidth, innerHeight, margin);
}

function setupContainer (containerSelector) {
  const container = d3.select(containerSelector + ' .graph');
  container.selectAll('*').remove();
  container.selectAll('div.tooltip').remove();
  return container;
}

function createTooltip (container) {
  return container
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('padding', '8px')
    .style('background', 'var(--secondary-color)')
    .style('border', '1px solid var(--text-color)')
    .style('color', 'var(--text-color)')
    .style('border-radius', '4px')
    .style('font-size', '14px')
    .style('pointer-events', 'none')
    .style('opacity', 0);
}

function setupSVG (container, margin, width, height) {

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('font-family', CSS.Font)
    .style('color', CSS.TextColor);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  return {svg, g};
}

function processData (data, season) {
  const flattened = Object.entries(data)
    .filter(([key]) => season === 'Both' || key.includes(season))
    .flatMap(([key, countries]) => {
      const [yearStr] = key.split(',');
      const year = +yearStr;
      return Object.entries(countries).map(([_, d]) => ({
        country: d.countryName,
        year,
        score: d.medalScore,
        medals: d.totalMedals,
      }));
    });

  return d3.groups(flattened, d => d.country)
    .map(([_, values]) => {
      values.sort((a, b) => a.year - b.year);
      let cumulativeSum = 0;
      return values.map(d => ({ ...d, score: cumulativeSum += d.score }));
    })
    .flat();
}

function getTopCountries (data) {
  const totalByCountry = d3.rollups(
    data,
    v => d3.max(v, d => d.score),
    d => d.country
  );

  return new Set(
    totalByCountry
      .sort((a, b) => d3.descending(a[1], b[1]))
      .slice(0, 10)
      .map(([country]) => country)
  );
}

function createScales (years, dataByCountry, innerWidth, innerHeight) {
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([0, innerWidth * 0.9]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(dataByCountry, ([, values]) => d3.max(values, d => d.score))])
    .nice()
    .range([innerHeight, 0]);

  return { xScale, yScale };
}

function drawAxes (g, xScale, yScale, innerHeight, ticks) {
  const xAxis = d3.axisBottom(xScale).ticks(d3.tickStep(...xScale.domain(), 2)).tickFormat(d3.format('d'));
  const yAxis = d3.axisLeft(yScale).ticks(ticks.y);

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', CSS.AxisTitleColor);

  g.append('g')
    .call(yAxis)
    .selectAll('text')
    .style('fill', CSS.AxisTitleColor);
}

function drawLines(g, dataByCountry, xScale, yScale, color) {
  const lineGenerator = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.score));

  g.selectAll('.line')
    .data(dataByCountry)
    .enter()
    .append('path')
    .attr('class', ([name]) => `line line-${name.replace(/\s+/g, '_')}`)
    .attr('fill', 'none')
    .attr('stroke', ([name]) => color(name))
    .attr('stroke-width', 2)
    .attr('d', ([, values]) => lineGenerator(values))
    .attr('stroke-dasharray', function () {
      const totalLength = this.getTotalLength();
      return `${totalLength} ${totalLength}`;
    })
    .attr('stroke-dashoffset', function () {
      return this.getTotalLength();
    })
    .transition()
    .duration(ANIMATION_TIME)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);
}

function drawDots(g, data, xScale, yScale, color, tooltip, container) {
  // Create the dots.
  const dots = g
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', (d) => `dot dot-${d.country.replace(/\s+/g, '_')}`)
    .attr('cx', (d) => xScale(d.year))
    .attr('cy', (d) => yScale(d.score))
    .attr('r', 0) // Start with a radius of 0 (invisible)
    .attr('fill', (d) => color(d.country));

  // Add event listeners.
  dots
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(`<strong>${d.country}</strong><br>Year: ${d.year}<br>Score: ${d.score}`);
    })
    .on('mousemove', (event) => {
      const bounds = container.node().getBoundingClientRect();
      tooltip.style('left', `${event.clientX - bounds.left}px`).style('top', `${event.clientY - bounds.top + 20}px`);
    })
    .on('mouseout', () => tooltip.style('opacity', 0));

  // Add the transition.
  dots
    .transition()
    .duration(ANIMATION_TIME)
    .attr('r', 4); // Final radius of the dots
}

function drawLegend (svg, countries, color, containerSelector) {
  d3.selectAll(containerSelector + ' .legend').remove();
  const legendItemHeight = 40;
  const legendHeight = countries.size * legendItemHeight + 30
  console.log(legendHeight)
  d3.select(containerSelector + ' .legend-container')
    .attr('height', legendHeight)
    .style('height', `${legendHeight}px`);
  const legend = d3.select(containerSelector + ' .legend-container')
    .append('g')
    .attr('class', 'legend')
    .attr('width', '100%')

  legend.append('text')
    .attr('y', -10)
    .text('Legend')
    .style('fill', CSS.TextColor)
    .style('font-family', CSS.Font)
    .style('font-size', '12px')
    .style('font-weight', 'bold');

  const visibleCountries = new Set([...countries]);

  const originalFill = CSS.BackGroundColor;
  const darkerFill = d3.color(originalFill).darker(1.5).toString();

  [...countries].forEach((country, i) => {
    const className = country.replace(/\s+/g, '_');
    const legendItem = legend.append('g')
      .attr('transform', `translate(0, ${i * legendItemHeight})`)
      .style('cursor', 'pointer');

    const switchWidth = 50; const switchHeight = 30; const knobRadius = 12;
    const switchGroup = legendItem.append('g');

    switchGroup.append('rect')
      .attr('rx', switchHeight / 2)
      .attr('ry', switchHeight / 2)
      .attr('width', switchWidth)
      .attr('height', switchHeight)
      .attr('fill', CSS.BackGroundColor)
      .attr('stroke', CSS.ActiveButtonColor)

    const knob = switchGroup.append('circle')
      .attr('cx', switchWidth - knobRadius - 2)
      .attr('cy', switchHeight / 2)
      .attr('r', knobRadius)
      .attr('fill', color(country));

    const text = legendItem.append('text')
      .attr('x', switchWidth + 5)
      .attr('y', switchHeight/2 + 5)
      .text(country)
      .style('fill', CSS.TextColor)
      .style('font-family', CSS.Font)
      .style('font-size', '12px')
      .style('font-weight', 'bold');

    legendItem.on('click', () => {
      const lines = svg.selectAll(`.line-${className}`);
      const dots = svg.selectAll(`.dot-${className}`);
      const isVisible = visibleCountries.has(country);

      lines.style('display', isVisible ? 'none' : 'inline');
      dots.style('display', isVisible ? 'none' : 'inline');

      const rect = switchGroup.select('rect');
      if (isVisible) {
        visibleCountries.delete(country);
        knob.transition().duration(400).attr('cx', knobRadius + 2);
        rect.transition().duration(400).attr('fill', darkerFill);
        text.style('font-weight', 'normal');
      } else {
        visibleCountries.add(country);
        knob.transition().duration(400).attr('cx', switchWidth - knobRadius - 2);
        rect.transition().duration(400).attr('fill', originalFill);
        text.style('font-weight', 'bold');
      }
    });
  });
}

function drawYAxisLabel (g, innerHeight, margin) {
  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 20)
    .attr('class', 'y-axis-label')
    .text('Medal Score');
}

function drawXAxisLabel (g, innerWidth, innerHeight, margin) {
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom/2 + 10)
    .attr('class', 'x-axis-label')
    .text('Years');
}