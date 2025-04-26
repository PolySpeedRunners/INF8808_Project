/**
 * Visualization 4.
 * This file contains the code for the graph of performance over time in the Olympics.
 * It includes the functions to draw the graph and update it based on user input.
 *
 * @file viz4.js
 */

/* Local Constants */
const ANIMATION_TIME = 750; // ms

/**
 * Sets a listener on the season select dropdown to update the chart when the season changes.
 *
 * @param {object} data The dataset containing medal scores.
 * @param {string} containerSelector The selector for the chart container.
 * @param {string} [initialSeason="Both"] The initially selected season.
 */
export function setLineChartListener (data, containerSelector, initialSeason = 'Both') {
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

/**
 * Draws the line chart showing cumulative medal scores over time.
 *
 * @param {object} params The parameters object.
 * @param {object} params.data The dataset containing medal scores.
 * @param {string} params.containerSelector The selector for the chart container.
 * @param {string} [params.season="Both"] The season filter.
 */
export function drawLineChart ({ data, containerSelector, season = 'Both' }) {
  const margin = { top: 20, right: -20, bottom: 80, left: 80 };
  const ticks = { x: 6, y: 10 };

  const container = setupContainer(containerSelector);
  const tooltip = createTooltip(container);
  const width = container.node().clientWidth;
  const height = container.node().clientHeight;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { svg, g } = setupSVG(container, margin, width, height);

  const cumulativeData = processData(data, season);
  const topCountries = getTopCountries(cumulativeData);
  const filtered = cumulativeData.filter((d) => topCountries.has(d.country));
  const dataByCountry = d3.groups(filtered, (d) => d.country);
  const years = Array.from(new Set(filtered.map((d) => d.year))).sort((a, b) => a - b);

  const { xScale, yScale } = createScales(years, dataByCountry, innerWidth, innerHeight);
  drawAxes(g, xScale, yScale, innerHeight, ticks);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain([...topCountries]);
  drawLines(g, dataByCountry, xScale, yScale, color);
  drawDots(g, filtered, xScale, yScale, color, tooltip, container);
  drawLegend(svg, topCountries, color, containerSelector);
  drawYAxisLabel(g, innerHeight, margin);
  drawXAxisLabel(g, innerWidth, innerHeight, margin);
}

/**
 * Clears and returns the chart container for new rendering.
 *
 * @param {string} containerSelector The selector for the chart container.
 * @returns {d3.Selection} The cleaned D3 container selection.
 */
function setupContainer (containerSelector) {
  const container = d3.select(containerSelector + ' .graph');
  container.selectAll('*').remove();
  container.selectAll('div.tooltip').remove();
  return container;
}

/**
 * Creates a styled tooltip element for displaying point data.
 *
 * @param {d3.Selection} container The container to append the tooltip to.
 * @returns {d3.Selection} The tooltip element.
 */
function createTooltip (container) {
  return container.append('div').attr('class', 'tooltip');
}

/**
 * Appends an SVG to the container and creates a chart group element.
 *
 * @param {d3.Selection} container The D3 selection of the container.
 * @param {object} margin The margin object.
 * @param {number} width The full SVG width.
 * @param {number} height The full SVG height.
 * @returns {object} An object with `svg` and `g` (group) elements.
 */
function setupSVG (container, margin, width, height) {
  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('font-family', 'var(--font-family)')
    .style('color', 'var(--text-color)');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  return { svg, g };
}

/**
 * Processes raw data into cumulative scores per country by year, filtered by season.
 *
 * @param {object} data The raw data object.
 * @param {string} season The selected season ("Summer", "Winter", or "Both").
 * @returns {Array<object>} The processed and sorted cumulative data array.
 */
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
        gold: d.totalGold,
        silver: d.totalSilver,
        bronze: d.totalBronze
      }));
    });

  return d3
    .groups(flattened, (d) => d.country)
    .map(([_, values]) => {
      values.sort((a, b) => a.year - b.year);
      let cumulativeScore = 0;
      let cumulativeMedals = 0;
      let cumulativeBronze = 0;
      let cumulativeSilver = 0;
      let cumulativeGold = 0;
      // eslint-disable-next-line no-return-assign
      return values.map((d) => ({
        ...d,
        score: (cumulativeScore += d.score),
        bronze: (cumulativeBronze += d.bronze),
        silver: (cumulativeSilver += d.silver),
        gold: (cumulativeGold += d.gold),
        medals: (cumulativeMedals += d.medals)
      }));
    })
    .flat();
}

/**
 * Extracts the top 10 countries based on their maximum cumulative score.
 *
 * @param {Array<object>} data The processed data array.
 * @returns {Set<string>} A set of top country names.
 */
function getTopCountries (data) {
  const totalByCountry = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.score),
    (d) => d.country
  );

  return new Set(
    totalByCountry
      .sort((a, b) => d3.descending(a[1], b[1]))
      .slice(0, 10)
      .map(([country]) => country)
  );
}

/**
 * Creates D3 x and y linear scales based on years and data values.
 *
 * @param {Array<number>} years The sorted list of years.
 * @param {Array} dataByCountry The grouped data by country.
 * @param {number} innerWidth The width of the drawable chart area.
 * @param {number} innerHeight The height of the drawable chart area.
 * @returns {object} An object containing xScale and yScale.
 */
function createScales (years, dataByCountry, innerWidth, innerHeight) {
  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([0, innerWidth * 0.9]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(dataByCountry, ([, values]) => d3.max(values, (d) => d.score))])
    .nice()
    .range([innerHeight, 0]);

  return { xScale, yScale };
}

/**
 * Draws the x and y axes for the chart using the provided scales.
 *
 * @param {d3.Selection} g The chart group element.
 * @param {d3.ScaleLinear} xScale The x-axis scale.
 * @param {d3.ScaleLinear} yScale The y-axis scale.
 * @param {number} innerHeight The chart height without margins.
 * @param {object} ticks The tick configuration for axes.
 */
function drawAxes (g, xScale, yScale, innerHeight, ticks) {
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.tickStep(...xScale.domain(), 2))
    .tickFormat(d3.format('d'));
  const yAxis = d3.axisLeft(yScale).ticks(ticks.y);

  g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis).selectAll('text').style('fill', 'var(--axis-title-color)');

  g.append('g').call(yAxis).selectAll('text').style('fill', 'var(--axis-title-color)');
}

/**
 * Draws the line paths for each country's data over time.
 *
 * @param {d3.Selection} g The chart group element.
 * @param {Array} dataByCountry The grouped data array by country.
 * @param {d3.ScaleLinear} xScale The x-axis scale.
 * @param {d3.ScaleLinear} yScale The y-axis scale.
 * @param {d3.ScaleOrdinal} color The ordinal color scale.
 */
function drawLines (g, dataByCountry, xScale, yScale, color) {
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

/**
 * Draws data points on the lines.
 *
 * @param {d3.Selection} g The chart group element.
 * @param {Array<object>} data The processed data array.
 * @param {d3.ScaleLinear} xScale The x-axis scale.
 * @param {d3.ScaleLinear} yScale The y-axis scale.
 * @param {d3.ScaleOrdinal} color The ordinal color scale.
 * @param {d3.Selection} tooltip The tooltip element.
 * @param {d3.Selection} container The container element to compute tooltip position.
 */
function drawDots (g, data, xScale, yScale, color, tooltip, container) {
  const dots = g
    .selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', (d) => `dot dot-${d.country.replace(/\s+/g, '_')}`)
    .attr('cx', (d) => xScale(d.year))
    .attr('cy', (d) => yScale(d.score))
    .attr('r', 0)
    .attr('fill', (d) => color(d.country));

  dots
    .on('mouseover', (event, d) => {
      tooltip.style('opacity', 1).html(
        `<strong>${d.country}</strong><br>` +
          `<table>
            <tr><td>Year</td><td>${d.year}</td></tr>
            <tr><td>Medal Score</td><td>${d.score}</td></tr>
            <tr><td>Medals</td><td>${d.medals}</td></tr>
            <tr><td>🥇 Gold</td><td>${d.gold}</td></tr>
            <tr><td>🥈 Silver</td><td>${d.silver}</td></tr>
            <tr><td>🥉 Bronze</td><td>${d.bronze}</td></tr>
          </table>`
      );
    })
    .on('mousemove', (event) => {
      const bounds = container.node().getBoundingClientRect();
      tooltip.style('left', `${event.clientX - bounds.left + 30}px`).style('top', `${event.clientY - bounds.top - 30}px`);
    })
    .on('mouseout', () => tooltip.style('opacity', 0));

  // Add the transition.
  dots.transition().duration(ANIMATION_TIME).attr('r', 4);
}

/**
 * Draws an interactive legend allowing toggling of country visibility.
 *
 * @param {d3.Selection} svg The SVG selection.
 * @param {Set<string>} countries A set of country names.
 * @param {d3.ScaleOrdinal} color The color scale for countries.
 * @param {string} containerSelector The container selector for placing the legend.
 */
function drawLegend (svg, countries, color, containerSelector) {
  d3.selectAll(containerSelector + ' .legend').remove();
  const legendItemHeight = 40;
  const legendHeight = countries.size * legendItemHeight + 30;
  d3.select(containerSelector + ' .legend-container')
    .attr('height', legendHeight)
    .style('height', `${legendHeight}px`);
  const legend = d3
    .select(containerSelector + ' .legend-container')
    .append('g')
    .attr('class', 'legend')
    .attr('width', '100%');

  legend
    .append('text')
    .attr('y', -10)
    .text('Legend')
    .style('fill', 'var(--text-color)')
    .style('font-family', 'var(--font-family)')
    .style('font-size', '12px')
    .style('font-weight', 'bold');

  const visibleCountries = new Set([...countries]);

  const originalFill = getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim();
  const darkerFill = d3.color(originalFill).darker(1.5).toString();

  [...countries].forEach((country, i) => {
    const className = country.replace(/\s+/g, '_');
    const legendItem = legend
      .append('g')
      .attr('transform', `translate(0, ${i * legendItemHeight})`)
      .style('cursor', 'pointer');

    const switchWidth = 50;
    const switchHeight = 30;
    const knobRadius = 12;
    const switchGroup = legendItem.append('g');

    switchGroup
      .append('rect')
      .attr('rx', switchHeight / 2)
      .attr('ry', switchHeight / 2)
      .attr('width', switchWidth)
      .attr('height', switchHeight)
      .attr('fill', 'var(--background-color)')
      .attr('stroke', 'var(--button-active-color)');

    const knob = switchGroup
      .append('circle')
      .attr('cx', switchWidth - knobRadius - 2)
      .attr('cy', switchHeight / 2)
      .attr('r', knobRadius)
      .attr('fill', color(country));

    const text = legendItem
      .append('text')
      .attr('x', switchWidth + 5)
      .attr('y', switchHeight / 2 + 5)
      .text(country)
      .style('fill', 'var(--text-color)')
      .style('font-family', 'var(--font-family)')
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
        knob
          .transition()
          .duration(400)
          .attr('cx', knobRadius + 2);
        rect.transition().duration(400).attr('fill', darkerFill);
        text.style('font-weight', 'normal');
      } else {
        visibleCountries.add(country);
        knob
          .transition()
          .duration(400)
          .attr('cx', switchWidth - knobRadius - 2);
        rect.transition().duration(400).attr('fill', originalFill);
        text.style('font-weight', 'bold');
      }
    });
  });
}

/**
 * Adds the y-axis label to the chart.
 *
 * @param {d3.Selection} g The chart group element.
 * @param {number} innerHeight The chart height without margins.
 * @param {object} margin The margin configuration.
 */
function drawYAxisLabel (g, innerHeight, margin) {
  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 20)
    .attr('class', 'y-axis-label')
    .text('Cumulative medal score');
}

/**
 * Adds the x-axis label to the chart.
 *
 * @param {d3.Selection} g The chart group element.
 * @param {number} innerWidth The chart width without margins.
 * @param {number} innerHeight The chart height without margins.
 * @param {object} margin The margin configuration.
 */
function drawXAxisLabel (g, innerWidth, innerHeight, margin) {
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom / 2 + 10)
    .attr('class', 'x-axis-label')
    .text('Years');
}
